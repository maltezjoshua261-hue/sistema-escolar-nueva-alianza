// Experimental 2027 report endpoint. Recovery branch only.
const { neon } = require('@neondatabase/serverless');
module.exports = async function(req,res) {
 res.setHeader('Cache-Control','no-store');
 if(!process.env.DIRECTOR_PASSWORD || req.headers['x-director-password']!==process.env.DIRECTOR_PASSWORD) return res.status(401).json({ok:false,message:'Debes iniciar sesión como Dirección.'});
 if(!process.env.DATABASE_URL) return res.status(503).json({ok:false,message:'Base de datos no configurada.'});
 const sql=neon(process.env.DATABASE_URL);
 try {
  if(req.method!=='GET') return res.status(405).json({ok:false,message:'Método no permitido.'});
  const rows=await sql`SELECT c.id,c.estudiante_id,c.evaluacion_id,c.nota,c.publicada,s.codigo_estudiante,s.nombres,s.apellidos,e.anio,e.semestre,e.corte,a.nombre AS asignatura FROM calificaciones c JOIN estudiantes s ON s.id=c.estudiante_id JOIN evaluaciones e ON e.id=c.evaluacion_id JOIN asignaturas a ON a.id=e.asignatura_id WHERE e.anio=2027 ORDER BY s.apellidos,s.nombres,e.corte`;
  return res.status(200).json({ok:true,grades:rows});
 } catch(e) { console.error('report query error',e&&e.message); return res.status(500).json({ok:false,message:'Error interno al consultar calificaciones.'}); }
};