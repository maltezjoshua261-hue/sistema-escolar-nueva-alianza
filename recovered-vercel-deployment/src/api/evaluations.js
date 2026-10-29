// Experimental API for 2027 evaluation periods. Recovery branch only.
const { neon } = require('@neondatabase/serverless');
function auth(req,res){const p=process.env.DIRECTOR_PASSWORD;if(!p||req.headers['x-director-password']!==p){res.status(401).json({ok:false,message:'Debes iniciar sesión como Dirección.'});return false;}return true;}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');if(!auth(req,res))return;if(!process.env.DATABASE_URL)return res.status(503).json({ok:false,message:'Base de datos no configurada.'});
 const sql=neon(process.env.DATABASE_URL),id=req.query&&req.query.id;
 try{
  if(req.method==='GET'){const evaluations=await sql`SELECT e.id,e.asignatura_id,e.anio,e.semestre,e.corte,a.nombre AS asignatura,a.grado FROM evaluaciones e JOIN asignaturas a ON a.id=e.asignatura_id WHERE e.anio=2027 ORDER BY a.grado,a.nombre,e.semestre,e.corte`;return res.status(200).json({ok:true,evaluations});}
  if(req.method==='POST'){
   const b=req.body||{},subject=String(b.asignatura_id||''),semester=Number(b.semestre),cut=Number(b.corte);
   if(!subject||![1,2].includes(semester)||![1,2,3,4].includes(cut))return res.status(400).json({ok:false,message:'Indica asignatura, semestre 1 o 2 y corte 1 a 4.'});
   if((cut<=2?1:2)!==semester)return res.status(400).json({ok:false,message:'Cortes 1 y 2 corresponden al semestre 1; cortes 3 y 4 al semestre 2.'});
   const rows=await sql`INSERT INTO evaluaciones(asignatura_id,anio,semestre,corte) SELECT id,2027,${semester},${cut} FROM asignaturas WHERE id=${subject} AND activa=true RETURNING id,asignatura_id,anio,semestre,corte`;
   if(!rows.length)return res.status(404).json({ok:false,message:'Asignatura activa no encontrada.'});return res.status(201).json({ok:true,evaluation:rows[0]});
  }
  res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,message:'Método no permitido.'});
 }catch(e){if(e&&e.code==='23505')return res.status(409).json({ok:false,message:'Ese corte ya existe para esta asignatura en 2027.'});console.error('evaluations API error',e&&e.message);return res.status(500).json({ok:false,message:'Error interno de evaluaciones.'});}
};