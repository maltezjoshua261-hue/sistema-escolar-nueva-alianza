// RECONSTRUCCIÓN EXPERIMENTAL para pruebas aisladas. NO es el original recuperado.
// Contrato inferido de la interfaz recuperada: GET, POST, PUT?id=..., DELETE?id=...
// Nunca desplegar sin pruebas contra la rama de respaldo y revisión del esquema.
const { neon } = require('@neondatabase/serverless');

function authorized(req, res) {
  const expected = process.env.DIRECTOR_PASSWORD;
  if (!expected || req.headers['x-director-password'] !== expected) {
    res.status(401).json({ ok: false, message: 'Debes iniciar sesión como Dirección.' });
    return false;
  }
  return true;
}

function fail(res, error) {
  if (error && error.code === '23505') {
    return res.status(409).json({ ok: false, message: 'Ya existe un estudiante con ese código.' });
  }
  console.error('students API error', error && error.message);
  return res.status(500).json({ ok: false, message: 'Error interno al procesar estudiantes.' });
}

module.exports = async function studentsApi(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!authorized(req, res)) return;
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ ok: false, message: 'Base de datos no configurada.' });
  }

  const sql = neon(process.env.DATABASE_URL);
  const id = req.query && req.query.id;

  try {
    if (req.method === 'GET') {
      const students = await sql`SELECT id, codigo_estudiante, nombres, apellidos, grado, seccion, activo
        FROM estudiantes WHERE activo = true ORDER BY grado, apellidos, nombres`;
      return res.status(200).json({ ok: true, students });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const b = req.body || {};
      const code = String(b.codigo_estudiante || '').trim();
      const names = String(b.nombres || '').trim();
      const surnames = String(b.apellidos || '').trim();
      const grade = Number(b.grado);
      const section = b.seccion ? String(b.seccion).trim() : null;
      if (!code || !names || !surnames || ![7, 8, 9, 10, 11].includes(grade)) {
        return res.status(400).json({ ok: false, message: 'Completa código, nombres, apellidos y grado válido (7 a 11).' });
      }

      if (req.method === 'POST') {
        const rows = await sql`INSERT INTO estudiantes
          (codigo_estudiante, nombres, apellidos, grado, seccion, activo)
          VALUES (${code}, ${names}, ${surnames}, ${grade}, ${section}, true)
          RETURNING id, codigo_estudiante, nombres, apellidos, grado, seccion, activo`;
        return res.status(201).json({ ok: true, student: rows[0] });
      }

      if (!id) return res.status(400).json({ ok: false, message: 'Falta el identificador del estudiante.' });
      const rows = await sql`UPDATE estudiantes SET
          codigo_estudiante = ${code}, nombres = ${names}, apellidos = ${surnames},
          grado = ${grade}, seccion = ${section}
        WHERE id = ${id} AND activo = true
        RETURNING id, codigo_estudiante, nombres, apellidos, grado, seccion, activo`;
      if (!rows.length) return res.status(404).json({ ok: false, message: 'No se encontró un estudiante activo con ese identificador.' });
      return res.status(200).json({ ok: true, student: rows[0] });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ ok: false, message: 'Falta el identificador del estudiante.' });
      // Desactivación lógica: no elimina físicamente el registro ni sus notas.
      const rows = await sql`UPDATE estudiantes SET activo = false
        WHERE id = ${id} AND activo = true
        RETURNING id, codigo_estudiante, nombres, apellidos, grado, seccion, activo`;
      if (!rows.length) return res.status(404).json({ ok: false, message: 'No se encontró un estudiante activo con ese identificador.' });
      return res.status(200).json({ ok: true, student: rows[0] });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ ok: false, message: 'Método no permitido.' });
  } catch (error) {
    return fail(res, error);
  }
};
