// RECONSTRUCCIÓN AISLADA — NO ES EL ARCHIVO ORIGINAL RECUPERADO.
// No desplegar sin revisar el esquema real y probar en la rama de respaldo.
const { neon } = require('@neondatabase/serverless');

function authorized(req, res) {
  const expected = process.env.DIRECTOR_PASSWORD;
  const supplied = req.headers['x-director-password'];
  if (!expected || supplied !== expected) {
    res.status(401).json({ ok: false, message: 'Debes iniciar sesión como Dirección.' });
    return false;
  }
  return true;
}

module.exports = async function studentsApi(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!authorized(req, res)) return;
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ ok: false, message: 'Base de datos no configurada.' });
  }

  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === 'GET') {
      const students = await sql`SELECT id, codigo_estudiante, nombres, apellidos, grado, seccion, activo
        FROM estudiantes WHERE activo = true ORDER BY grado, apellidos, nombres`;
      return res.status(200).json({ ok: true, students });
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      const code = String(b.codigo_estudiante || '').trim();
      const names = String(b.nombres || '').trim();
      const surnames = String(b.apellidos || '').trim();
      const grade = Number(b.grado);
      const section = b.seccion ? String(b.seccion).trim() : null;

      if (!code || !names || !surnames || ![7, 8, 9, 10, 11].includes(grade)) {
        return res.status(400).json({
          ok: false,
          message: 'Completa código, nombres, apellidos y grado válido (7 a 11).'
        });
      }

      const rows = await sql`INSERT INTO estudiantes
        (codigo_estudiante, nombres, apellidos, grado, seccion, activo)
        VALUES (${code}, ${names}, ${surnames}, ${grade}, ${section}, true)
        RETURNING id, codigo_estudiante, nombres, apellidos, grado, seccion, activo`;
      return res.status(201).json({ ok: true, student: rows[0] });
    }

    // No se habilitan PUT/DELETE hasta recuperar y validar el contrato original.
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, message: 'Método no permitido en esta reconstrucción de prueba.' });
  } catch (error) {
    if (error && error.code === '23505') {
      return res.status(409).json({ ok: false, message: 'Ya existe un estudiante con ese código.' });
    }
    console.error('students API error', error && error.message);
    return res.status(500).json({ ok: false, message: 'Error interno al consultar estudiantes.' });
  }
};
