// API experimental de docentes para SINFO Secundaria 2027. No desplegar sin pruebas.
const { neon } = require('@neondatabase/serverless');
function auth(req,res){const p=process.env.DIRECTOR_PASSWORD;if(!p||req.headers['x-director-password']!==p){res.status(401).json({ok:false,message:'Debes iniciar sesión como Dirección.'});return false;}return true;}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store'); if(!auth(req,res))return;
 if(!process.env.DATABASE_URL)return res.status(503).json({ok:false,message:'Base de datos no configurada.'});
 const sql=neon(process.env.DATABASE_URL), id=req.query&&req.query.id;
 try{
  if(req.method==='GET'){const teachers=await sql`SELECT id,codigo_docente,nombres,apellidos,activo FROM docentes WHERE activo=true ORDER BY apellidos,nombres`;return res.status(200).json({ok:true,teachers});}
  if(req.method==='POST'||req.method==='PUT'){
   const b=req.body||{},code=String(b.codigo_docente||'').trim(),names=String(b.nombres||'').trim(),surnames=String(b.apellidos||'').trim();
   if(!code||!names||!surnames)return res.status(400).json({ok:false,message:'Completa código, nombres y apellidos.'});
   if(req.method==='POST'){const rows=await sql`INSERT INTO docentes(codigo_docente,nombres,apellidos,activo) VALUES(${code},${names},${surnames},true) RETURNING id,codigo_docente,nombres,apellidos,activo`;return res.status(201).json({ok:true,teacher:rows[0]});}
   if(!id)return res.status(400).json({ok:false,message:'Falta el identificador del docente.'});
   const rows=await sql`UPDATE docentes SET codigo_docente=${code},nombres=${names},apellidos=${surnames} WHERE id=${id} AND activo=true RETURNING id,codigo_docente,nombres,apellidos,activo`;
   if(!rows.length)return res.status(404).json({ok:false,message:'Docente activo no encontrado.'});return res.status(200).json({ok:true,teacher:rows[0]});
  }
  if(req.method==='DELETE'){if(!id)return res.status(400).json({ok:false,message:'Falta el identificador del docente.'});const rows=await sql`UPDATE docentes SET activo=false WHERE id=${id} AND activo=true RETURNING id,codigo_docente,nombres,apellidos,activo`;if(!rows.length)return res.status(404).json({ok:false,message:'Docente activo no encontrado.'});return res.status(200).json({ok:true,teacher:rows[0]});}
  res.setHeader('Allow','GET, POST, PUT, DELETE');return res.status(405).json({ok:false,message:'Método no permitido.'});
 }catch(e){if(e&&e.code==='23505')return res.status(409).json({ok:false,message:'Ese código de docente ya existe.'});console.error('teachers API error',e&&e.message);return res.status(500).json({ok:false,message:'Error interno de docentes.'});}
};