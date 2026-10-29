// Portal combinado de estudiantes y docentes para respetar el límite de funciones de Vercel Hobby.
const { neon } = require('@neondatabase/serverless');
const { randomBytes, scrypt, timingSafeEqual } = require('crypto');
const { promisify } = require('util');
const scryptAsync = promisify(scrypt);
async function hashPin(pin,salt){return (await scryptAsync(pin,salt,64)).toString('hex');}
function validAdmin(req,res){const p=process.env.DIRECTOR_PASSWORD;if(!p||req.headers['x-director-password']!==p){res.status(401).json({ok:false,message:'Se requiere acceso de Dirección.'});return false;}return true;}
async function verifyPin(account,pin,sql,table,idColumn){
 if(account.bloqueado_hasta&&new Date(account.bloqueado_hasta).getTime()>Date.now())return 'blocked';
 const expected=Buffer.from(account.pin_hash,'hex'),supplied=Buffer.from(await hashPin(pin,account.pin_salt),'hex');
 if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied)){
  await sql`UPDATE accesos_docentes SET intentos_fallidos=LEAST(intentos_fallidos+1,10),bloqueado_hasta=CASE WHEN intentos_fallidos+1>=5 THEN now()+interval '15 minutes' ELSE bloqueado_hasta END,actualizado_en=now() WHERE docente_id=${account.id}`;
  return false;
 }
 return true;
}
async function teacherAccount(req,sql){
 const code=String(req.headers['x-teacher-code']||'').trim(),pin=String(req.headers['x-teacher-pin']||'');
 if(!code||!pin||pin.length>128)return null;
 const rows=await sql`SELECT d.id,d.codigo_docente,d.nombres,d.apellidos,x.pin_hash,x.pin_salt,x.intentos_fallidos,x.bloqueado_hasta
 FROM docentes d JOIN accesos_docentes x ON x.docente_id=d.id WHERE d.codigo_docente=${code} AND d.activo=true LIMIT 1`;
 const a=rows[0];if(!a)return null;
 if(a.bloqueado_hasta&&new Date(a.bloqueado_hasta).getTime()>Date.now())return {blocked:true};
 const expected=Buffer.from(a.pin_hash,'hex'),supplied=Buffer.from(await hashPin(pin,a.pin_salt),'hex');
 if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied)){
  await sql`UPDATE accesos_docentes SET intentos_fallidos=LEAST(intentos_fallidos+1,10),bloqueado_hasta=CASE WHEN intentos_fallidos+1>=5 THEN now()+interval '15 minutes' ELSE bloqueado_hasta END,actualizado_en=now() WHERE docente_id=${a.id}`;
  return null;
 }
 await sql`UPDATE accesos_docentes SET intentos_fallidos=0,bloqueado_hasta=NULL,actualizado_en=now() WHERE docente_id=${a.id}`;
 return a;
}
async function teacherPortal(req,res,sql,body){
 const t=await teacherAccount(req,sql);
 if(!t)return res.status(401).json({ok:false,message:'Código o PIN de docente incorrecto.'});
 if(t.blocked)return res.status(429).json({ok:false,message:'Acceso bloqueado temporalmente. Intenta más tarde.'});
 if(req.method==='GET'){
  const records=await sql`
   SELECT ad.id AS asignacion_id,ad.seccion AS seccion_asignada,a.id AS asignatura_id,a.nombre AS asignatura,a.grado,
    e.id AS evaluacion_id,e.semestre,e.corte,s.id AS estudiante_id,s.codigo_estudiante,s.nombres,s.apellidos,s.seccion,
    c.id AS calificacion_id,c.nota,c.publicada
   FROM asignaciones_docente ad JOIN asignaturas a ON a.id=ad.asignatura_id AND a.activa=true
   JOIN estudiantes s ON s.grado=a.grado AND s.activo=true AND s.anio_escolar=2027 AND (ad.seccion IS NULL OR ad.seccion=s.seccion)
   LEFT JOIN evaluaciones e ON e.asignatura_id=a.id AND e.anio=2027
   LEFT JOIN calificaciones c ON c.estudiante_id=s.id AND c.evaluacion_id=e.id
   WHERE ad.docente_id=${t.id} AND ad.activa=true AND ad.anio_escolar=2027
   ORDER BY a.grado,a.nombre,s.apellidos,s.nombres,e.corte
  `;
  return res.status(200).json({ok:true,teacher:{codigo_docente:t.codigo_docente,nombres:t.nombres,apellidos:t.apellidos},records});
 }
 const studentId=String(body.estudiante_id||''),evaluationId=String(body.evaluacion_id||''),score=Number(body.nota);
 if(!studentId||!evaluationId||body.nota===''||body.nota===null||body.nota===undefined||!Number.isFinite(score)||score<0||score>100)return res.status(400).json({ok:false,message:'Selecciona estudiante, corte y nota entre 0 y 100.'});
 const allowed=await sql`SELECT s.id FROM estudiantes s JOIN evaluaciones e ON e.id=${evaluationId} AND e.anio=2027
 JOIN asignaciones_docente ad ON ad.asignatura_id=e.asignatura_id AND ad.docente_id=${t.id} AND ad.activa=true AND ad.anio_escolar=2027
 JOIN asignaturas a ON a.id=e.asignatura_id AND a.grado=s.grado AND a.activa=true
 WHERE s.id=${studentId} AND s.activo=true AND s.anio_escolar=2027 AND (ad.seccion IS NULL OR ad.seccion=s.seccion) LIMIT 1`;
 if(!allowed.length)return res.status(403).json({ok:false,message:'No tienes asignada esa asignatura o sección.'});
 const saved=await sql`INSERT INTO calificaciones(estudiante_id,evaluacion_id,nota,publicada) VALUES(${studentId},${evaluationId},${score},false)
 ON CONFLICT(estudiante_id,evaluacion_id) DO UPDATE SET nota=EXCLUDED.nota,actualizada_en=now() WHERE calificaciones.publicada=false RETURNING id,nota,publicada`;
 if(!saved.length)return res.status(409).json({ok:false,message:'La nota está publicada. Solicita a Dirección que retire la publicación antes de editarla.'});
 return res.status(200).json({ok:true,message:'Nota guardada como borrador para revisión de Dirección.',grade:saved[0]});
}
module.exports = async function studentPortal(req,res){
 res.setHeader('Cache-Control','no-store, private');res.setHeader('Pragma','no-cache');
 if(!process.env.DATABASE_URL)return res.status(503).json({ok:false,message:'Base de datos no configurada.'});
 if(req.method!=='POST'&&req.method!=='GET'){res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,message:'Método no permitido.'});}
 const body=req.body||{},sql=neon(process.env.DATABASE_URL);
 try{
  if(body.action==='set-teacher-pin'&&req.method==='POST'){
   if(!validAdmin(req,res))return;
   const id=String(body.docente_id||''),pin=typeof body.pin==='string'?body.pin:'';
   if(!id||pin.length<8||pin.length>128)return res.status(400).json({ok:false,message:'El PIN debe tener entre 8 y 128 caracteres.'});
   const ts=await sql`SELECT id FROM docentes WHERE id=${id} AND activo=true LIMIT 1`;
   if(!ts.length)return res.status(404).json({ok:false,message:'Docente activo no encontrado.'});
   const salt=randomBytes(16).toString('hex'),digest=await hashPin(pin,salt);
   await sql`INSERT INTO accesos_docentes(docente_id,pin_hash,pin_salt,intentos_fallidos,bloqueado_hasta,actualizado_en) VALUES(${id},${digest},${salt},0,NULL,now())
   ON CONFLICT(docente_id) DO UPDATE SET pin_hash=EXCLUDED.pin_hash,pin_salt=EXCLUDED.pin_salt,intentos_fallidos=0,bloqueado_hasta=NULL,actualizado_en=now()`;
   return res.status(200).json({ok:true,message:'Acceso del docente configurado.'});
  }
  if(req.headers['x-teacher-code'])return await teacherPortal(req,res,sql,body);
  if(req.method!=='POST')return res.status(405).json({ok:false,message:'La consulta de estudiantes usa POST.'});
  if(body.action==='set-pin'){
   if(!validAdmin(req,res))return;
   const studentId=String(body.estudiante_id||''),pin=typeof body.pin==='string'?body.pin:'';
   if(!studentId||pin.length<8||pin.length>128)return res.status(400).json({ok:false,message:'El PIN debe tener entre 8 y 128 caracteres.'});
   const students=await sql`SELECT id FROM estudiantes WHERE id=${studentId} AND activo=true AND anio_escolar=2027 LIMIT 1`;
   if(!students.length)return res.status(404).json({ok:false,message:'Estudiante activo de 2027 no encontrado.'});
   const salt=randomBytes(16).toString('hex'),digest=await hashPin(pin,salt);
   await sql`INSERT INTO accesos_estudiantes(estudiante_id,pin_hash,pin_salt,intentos_fallidos,bloqueado_hasta,actualizado_en) VALUES(${studentId},${digest},${salt},0,NULL,now())
   ON CONFLICT(estudiante_id) DO UPDATE SET pin_hash=EXCLUDED.pin_hash,pin_salt=EXCLUDED.pin_salt,intentos_fallidos=0,bloqueado_hasta=NULL,actualizado_en=now()`;
   return res.status(200).json({ok:true,message:'Acceso privado configurado.'});
  }
  if(body.action!=='consult')return res.status(400).json({ok:false,message:'Acción no válida.'});
  const code=typeof body.codigo_estudiante==='string'?body.codigo_estudiante.trim():'',pin=typeof body.pin==='string'?body.pin:'';
  if(!code||!pin||code.length>100||pin.length>128)return res.status(400).json({ok:false,message:'Introduce tu código de estudiante y PIN.'});
  const accounts=await sql`SELECT s.id,s.codigo_estudiante,s.nombres,s.apellidos,s.grado,s.seccion,a.pin_hash,a.pin_salt,a.intentos_fallidos,a.bloqueado_hasta
   FROM estudiantes s JOIN accesos_estudiantes a ON a.estudiante_id=s.id WHERE s.codigo_estudiante=${code} AND s.activo=true AND s.anio_escolar=2027 LIMIT 1`;
  const account=accounts[0];if(!account)return res.status(401).json({ok:false,message:'Código o PIN incorrecto.'});
  if(account.bloqueado_hasta&&new Date(account.bloqueado_hasta).getTime()>Date.now())return res.status(429).json({ok:false,message:'Acceso temporalmente bloqueado. Intenta más tarde.'});
  const expected=Buffer.from(account.pin_hash,'hex'),supplied=Buffer.from(await hashPin(pin,account.pin_salt),'hex');
  if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied)){
   await sql`UPDATE accesos_estudiantes SET intentos_fallidos=LEAST(intentos_fallidos+1,10),bloqueado_hasta=CASE WHEN intentos_fallidos+1>=5 THEN now()+interval '15 minutes' ELSE bloqueado_hasta END,actualizado_en=now() WHERE estudiante_id=${account.id}`;
   return res.status(401).json({ok:false,message:'Código o PIN incorrecto.'});
  }
  await sql`UPDATE accesos_estudiantes SET intentos_fallidos=0,bloqueado_hasta=NULL,actualizado_en=now() WHERE estudiante_id=${account.id}`;
  const grades=await sql`SELECT a.nombre AS asignatura,e.semestre,e.corte,c.nota,c.actualizada_en FROM calificaciones c JOIN evaluaciones e ON e.id=c.evaluacion_id AND e.anio=2027 JOIN asignaturas a ON a.id=e.asignatura_id AND a.activa=true WHERE c.estudiante_id=${account.id} AND c.publicada=true ORDER BY a.nombre,e.corte`;
  const averages=await sql`SELECT a.nombre AS asignatura,ROUND(AVG(c.nota) FILTER(WHERE e.corte IN(1,2)),2) AS promedio_semestre_1,ROUND(AVG(c.nota) FILTER(WHERE e.corte IN(3,4)),2) AS promedio_semestre_2,CASE WHEN COUNT(DISTINCT e.corte)=4 THEN ROUND(AVG(c.nota),2) ELSE NULL END AS promedio_anual FROM calificaciones c JOIN evaluaciones e ON e.id=c.evaluacion_id AND e.anio=2027 JOIN asignaturas a ON a.id=e.asignatura_id AND a.activa=true WHERE c.estudiante_id=${account.id} AND c.publicada=true GROUP BY a.id,a.nombre ORDER BY a.nombre`;
  return res.status(200).json({ok:true,student:{codigo_estudiante:account.codigo_estudiante,nombres:account.nombres,apellidos:account.apellidos,grado:account.grado,seccion:account.seccion},grades,averages});
 }catch(error){console.error('student/teacher portal error',error&&error.message);return res.status(500).json({ok:false,message:'No se pudo procesar el portal en este momento.'});}
};
