// API experimental de asignaturas por grado. No desplegar sin pruebas.
const { neon } = require('@neondatabase/serverless');
function auth(req,res){const p=process.env.DIRECTOR_PASSWORD;if(!p||req.headers['x-director-password']!==p){res.status(401).json({ok:false,message:'Debes iniciar sesión como Dirección.'});return false;}return true;}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');if(!auth(req,res))return;if(!process.env.DATABASE_URL)return res.status(503).json({ok:false,message:'Base de datos no configurada.'});
 const sql=neon(process.env.DATABASE_URL),id=req.query&&req.query.id;
 try{
  if(req.method==='GET'){const subjects=await sql`SELECT id,nombre,grado,activa FROM asignaturas WHERE activa=true ORDER BY grado,nombre`;return res.status(200).json({ok:true,subjects});}
  if(req.method==='POST'||req.method==='PUT'){
   const b=req.body||{},name=String(b.nombre||'').trim(),grade=Number(b.grado);
   if(!name||![7,8,9,10,11].includes(grade))return res.status(400).json({ok:false,message:'Indica nombre y grado válido (7 a 11).'});
   if(req.method==='POST'){const rows=await sql`INSERT INTO asignaturas(nombre,grado,activa) VALUES(${name},${grade},true) RETURNING id,nombre,grado,activa`;return res.status(201).json({ok:true,subject:rows[0]});}
   if(!id)return res.status(400).json({ok:false,message:'Falta el identificador de la asignatura.'});
   const rows=await sql`UPDATE asignaturas SET nombre=${name},grado=${grade} WHERE id=${id} AND activa=true RETURNING id,nombre,grado,activa`;if(!rows.length)return res.status(404).json({ok:false,message:'Asignatura activa no encontrada.'});return res.status(200).json({ok:true,subject:rows[0]});
  }
  if(req.method==='DELETE'){if(!id)return res.status(400).json({ok:false,message:'Falta el identificador de la asignatura.'});const rows=await sql`UPDATE asignaturas SET activa=false WHERE id=${id} AND activa=true RETURNING id,nombre,grado,activa`;if(!rows.length)return res.status(404).json({ok:false,message:'Asignatura activa no encontrada.'});return res.status(200).json({ok:true,subject:rows[0]});}
  res.setHeader('Allow','GET, POST, PUT, DELETE');return res.status(405).json({ok:false,message:'Método no permitido.'});
 }catch(e){if(e&&e.code==='23505')return res.status(409).json({ok:false,message:'Ya existe esa asignatura para el grado indicado.'});console.error('subjects API error',e&&e.message);return res.status(500).json({ok:false,message:'Error interno de asignaturas.'});}
};