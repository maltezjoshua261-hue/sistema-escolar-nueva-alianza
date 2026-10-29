// SINFO Secundaria 2027: calificaciones de Dirección. Rama de recuperación aislada.
const { neon } = require('@neondatabase/serverless');

function authorized(req, res) {
  const expected = process.env.DIRECTOR_PASSWORD;
  if (!expected || req.headers['x-director-password'] !== expected) {
    res.status(401).json({ ok: false, message: 'Debes iniciar sesión como Dirección.' });
    return false;
  }
  return true;
}

module.exports = async function gradebookApi(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!authorized(req, res)) return;
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ ok: false, message: 'Base de datos no configurada.' });
  }

  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === 'GET') {
      const grades = await sql`
        SELECT c.id, c.estudiante_id, c.evaluacion_id, c.nota, c.publicada,
               c.actualizada_en, s.codigo_estudiante, s.nombres, s.apellidos,
               s.grado, s.seccion, e.anio, e.semestre, e.corte,
               a.id AS asignatura_id, a.nombre AS asignatura
        FROM calificaciones c
        JOIN estudiantes s ON s.id = c.estudiante_id
        JOIN evaluaciones e ON e.id = c.evaluacion_id
        JOIN asignaturas a ON a.id = e.asignatura_id
        WHERE e.anio = 2027
        ORDER BY s.grado, s.apellidos, s.nombres, a.nombre, e.corte
      `;
      return res.status(200).json({ ok: true, grades });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const studentId = String(body.estudiante_id || '');
      const evaluationId = String(body.evaluacion_id || '');
      const score = Number(body.nota);
      if (!studentId || !evaluationId || body.nota === '' || body.nota === null ||
          body.nota === undefined || !Number.isFinite(score) || score < 0 || score > 100) {
        return res.status(400).json({ ok: false, message: 'Selecciona estudiante, evaluación y una nota entre 0 y 100.' });
      }
      const rows = await sql`
        INSERT INTO calificaciones (estudiante_id, evaluacion_id, nota, publicada)
        SELECT s.id, e.id, ${score}, false
        FROM estudiantes s
        JOIN evaluaciones e ON e.id = ${evaluationId} AND e.anio = 2027
        WHERE s.id = ${studentId} AND s.activo = true AND s.anio_escolar = 2027
        ON CONFLICT (estudiante_id, evaluacion_id)
        DO UPDATE SET nota = EXCLUDED.nota, actualizada_en = now()
        WHERE calificaciones.publicada = false
        RETURNING id, estudiante_id, evaluacion_id, nota, publicada, actualizada_en
      `;
      if (!rows.length) {
        const existing = await sql`
          SELECT c.publicada
          FROM calificaciones c
          JOIN estudiantes s ON s.id = c.estudiante_id
          JOIN evaluaciones e ON e.id = c.evaluacion_id
          WHERE c.estudiante_id = ${studentId} AND c.evaluacion_id = ${evaluationId}
            AND s.activo = true AND s.anio_escolar = 2027 AND e.anio = 2027
          LIMIT 1
        `;
        if (existing.length && existing[0].publicada) {
          return res.status(409).json({ ok: false, message: 'Esta nota ya está publicada. Retira la publicación antes de editarla.' });
        }
        return res.status(404).json({ ok: false, message: 'No se encontró un estudiante activo de 2027 o una evaluación válida de 2027.' });
      }
      return res.status(200).json({ ok: true, grade: rows[0], message: 'Nota guardada como borrador; todavía no es visible para estudiantes.' });
    }

    if (req.method === 'PATCH') {
      const body = req.body || {};
      const id = String(body.id || '');
      if (!id || typeof body.publicada !== 'boolean') {
        return res.status(400).json({ ok: false, message: 'Indica el identificador de la nota y publicada=true o false.' });
      }
      const rows = await sql`
        UPDATE calificaciones c SET publicada = ${body.publicada}, actualizada_en = now()
        FROM evaluaciones e
        WHERE c.id = ${id} AND e.id = c.evaluacion_id AND e.anio = 2027
        RETURNING c.id, c.estudiante_id, c.evaluacion_id, c.nota, c.publicada, c.actualizada_en
      `;
      if (!rows.length) return res.status(404).json({ ok: false, message: 'No se encontró la nota de 2027.' });
      return res.status(200).json({ ok: true, grade: rows[0], message: body.publicada ? 'Nota publicada.' : 'Publicación retirada; ya puede editarse.' });
    }

    res.setHeader('Allow', 'GET, POST, PATCH');
    return res.status(405).json({ ok: false, message: 'Método no permitido.' });
  } catch (error) {
    console.error('gradebook API error', error && error.message);
    return res.status(500).json({ ok: false, message: 'Error interno al procesar calificaciones.' });
  }
};
