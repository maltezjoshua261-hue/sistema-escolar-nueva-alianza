// Portal de docentes: acceso por código y PIN, limitado a asignaturas asignadas.
const { neon } = require('@neondatabase/serverless');
const { randomBytes, scrypt, timingSafeEqual } = require('crypto');
const { promisify } = require('util');
const scryptAsync = promisify(scrypt);
async function hashPin(pin,salt){return (await scryptAsync(pin,salt,64)).toString('hex');}
function director(req,res){const p=process.env.DIRECTOR_PASSWORD;if(!p||req.headers['x-director-password']!==p){res.status(401).json({ok:false,message:'Se requiere acceso de Dirección.'});return false;}return true;}
async function teacherAuth(req,sql){
 const code=String(req.headers['x-teacher-code']||'').trim(),pin=String(req.headers['x-teacher-pin']||'');
 if(!code||!pin||pin.length>128)return null;
 const rows=await sql`SELECT d.id,d.codigo_docente,d.nombres,d.apellidos,x.pin_hash,x.pin_salt,x.intentos_fallidos,x.bloqueado_hasta
 FROM docentes d JOIN accesos_docentes x ON x.docente_id=d.id
 WHERE d.codigo_docente=${code} AND d.activo=true LIMIT 1`;
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
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store, private');res.setHeader('Pragma','no-cache');
 if(!process.env.DATABASE_URL)return res.status(503).json({ok:false,message:'Base de datos no configurada.'});
 const sql=neon(process.env.DATABASE_URL),body=req.body||{};
 try{
  if(req.method==='POST'&&body.action==='set-pin'){
   if(!director(req,res))return;
   const id=String(body.docente_id||''),pin=typeof body.pin==='string'?body.pin:'';
   if(!id||pin.length<8||pin.length>128)return res.status(400).json({ok:false,message:'El PIN debe tener entre 8 y 128 caracteres.'});
   const ts=await sql`SELECT id FROM docentes WHERE id=${id} AND activo=true LIMIT 1`;
   if(!ts.length)return res.status(404).json({ok:false,message:'Docente activo no encontrado.'});
   const salt=randomBytes(16).toString('hex'),digest=await hashPin(pin,salt);
   await sql`INSERT INTO accesos_docentes(docente_id,pin_hash,pin_salt,intentos_fallidos,bloqueado_hasta,actualizado_en)
   VALUES(${id},${digest},${salt},0,NULL,now()) ON CONFLICT(docente_id) DO UPDATE SET pin_hash=EXCLUDED.pin_hash,pin_salt=EXCLUDED.pin_salt,intentos_fallidos=0,bloqueado_hasta=NULL,actualizado_en=now()`;
   return res.status(200).json({ok:true,message:'Acceso del docente configurado.'});
  }
  if(req.method!=='GET'&&req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,message:'Método no permitido.'});}
  const teacher=await teacherAuth(req,sql);
  if(!teacher)return res.status(401).json({ok:false,message:'Código o PIN de docente incorrecto.'});
  if(teacher.blocked)return res.status(429).json({ok:false,message:'Acceso bloqueado temporalmente. Intenta más tarde.'});
  if(req.method==='GET'){
   const rows=await sql`
    SELECT ad.id AS asignacion_id,ad.seccion AS seccion_asignada,a.id AS asignatura_id,a.nombre AS asignatura,a.grado,
      e.id AS evaluacion_id,e.semestre,e.corte,s.id AS estudiante_id,s.codigo_estudiante,s.nombres,s.apellidos,s.seccion,
      c.id AS calificacion_id,c.nota,c.publicada
    FROM asignaciones_docente ad
    JOIN asignaturas a ON a.id=ad.asignatura_id AND a.activa=true
    JOIN estudiantes s ON s.grado=a.grado AND s.activo=true AND s.anio_escolar=2027
      AND (ad.seccion IS NULL OR ad.seccion=s.seccion)
    LEFT JOIN evaluaciones e ON e.asignatura_id=a.id AND e.anio=2027
    LEFT JOIN calificaciones c ON c.estudiante_id=s.id AND c.evaluacion_id=e.id
    WHERE ad.docente_id=${teacher.id} AND ad.activa=true AND ad.anio_escolar=2027
    ORDER BY a.grado,a.nombre,s.apellidos,s.nombres,e.corte
   `;
   return res.status(200).json({ok:true,teacher:{codigo_docente:teacher.codigo_docente,nombres:teacher.nombres,apellidos:teacher.apellidos},records:rows});
  }
  const studentId=String(body.estudiante_id||''),evaluationId=String(body.evaluacion_id||''),score=Number(body.nota);
  if(!studentId||!evaluationId||body.nota===''||body.nota===null||body.nota===undefined||!Number.isFinite(score)||score<0||score>100)
   return res.status(400).json({ok:false,message:'Selecciona estudiante, corte y nota entre 0 y 100.'});
  const allowed=await sql`
   SELECT s.id FROM estudiantes s JOIN evaluaciones e ON e.id=${evaluationId} AND e.anio=2027
   JOIN asignaciones_docente ad ON ad.asignatura_id=e.asignatura_id AND ad.docente_id=${teacher.id} AND ad.activa=true AND ad.anio_escolar=2027
   JOIN asignaturas a ON a.id=e.asignatura_id AND a.grado=s.grado AND a.activa=true
   WHERE s.id=${studentId} AND s.activo=true AND s.anio_escolar=2027 AND (ad.seccion IS NULL OR ad.seccion=s.seccion) LIMIT 1
  `;
  if(!allowed.length)return res.status(403).json({ok:false,message:'No tienes asignada esa asignatura o sección.'});
  const saved=await sql`INSERT INTO calificaciones(estudiante_id,evaluacion_id,nota,publicada)
   VALUES(${studentId},${evaluationId},${score},false)
   ON CONFLICT(estudiante_id,evaluacion_id) DO UPDATE SET nota=EXCLUDED.nota,actualizada_en=now()
   WHERE calificaciones.publicada=false
   RETURNING id,nota,publicada`;
  if(!saved.length)return res.status(409).json({ok:false,message:'La nota está publicada. Solicita a Dirección que retire la publicación antes de editarla.'});
  return res.status(200).json({ok:true,message:'Nota guardada como borrador para revisión de Dirección.',grade:saved[0]});
 }catch(e){console.error('teacher portal error',e&&e.message);return res.status(500).json({ok:false,message:'No se pudo procesar el portal docente.'});}
};
