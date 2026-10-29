// Informes académicos 2027. Solo Dirección; no publica ni modifica calificaciones.
const { neon } = require('@neondatabase/serverless');
module.exports = async function reportsApi(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const expected = process.env.DIRECTOR_PASSWORD;
  if (!expected || req.headers['x-director-password'] !== expected) {
    return res.status(401).json({ ok: false, message: 'Debes iniciar sesión como Dirección.' });
  }
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, message: 'Base de datos no configurada.' });
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ ok: false, message: 'Método no permitido.' }); }
  try {
    const sql = neon(process.env.DATABASE_URL);
    const reports = await sql`
      SELECT s.id AS estudiante_id, s.codigo_estudiante, s.nombres, s.apellidos,
             s.grado, s.seccion, a.id AS asignatura_id, a.nombre AS asignatura,
             MAX(c.nota) FILTER (WHERE e.corte = 1) AS corte_1,
             MAX(c.nota) FILTER (WHERE e.corte = 2) AS corte_2,
             MAX(c.nota) FILTER (WHERE e.corte = 3) AS corte_3,
             MAX(c.nota) FILTER (WHERE e.corte = 4) AS corte_4,
             ROUND(AVG(c.nota) FILTER (WHERE e.corte IN (1,2)), 2) AS promedio_semestre_1,
             ROUND(AVG(c.nota) FILTER (WHERE e.corte IN (3,4)), 2) AS promedio_semestre_2,
             CASE WHEN COUNT(DISTINCT e.corte) FILTER (WHERE c.nota IS NOT NULL) = 4
                  THEN ROUND(AVG(c.nota), 2) ELSE NULL END AS promedio_anual,
             COUNT(c.id) FILTER (WHERE c.publicada = true) AS notas_publicadas,
             COUNT(c.id) AS notas_registradas
      FROM estudiantes s
      CROSS JOIN asignaturas a
      LEFT JOIN evaluaciones e ON e.asignatura_id = a.id AND e.anio = 2027
      LEFT JOIN calificaciones c ON c.estudiante_id = s.id AND c.evaluacion_id = e.id
      WHERE s.activo = true AND s.anio_escolar = 2027 AND a.activa = true AND a.grado = s.grado
      GROUP BY s.id, s.codigo_estudiante, s.nombres, s.apellidos, s.grado, s.seccion, a.id, a.nombre
      ORDER BY s.grado, s.apellidos, s.nombres, a.nombre
    `;
    return res.status(200).json({ ok: true, reports });
  } catch (error) {
    console.error('reports API error', error && error.message);
    return res.status(500).json({ ok: false, message: 'Error interno al generar reportes.' });
  }
};
