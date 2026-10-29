const { neon } = require('@neondatabase/serverless');

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({
        ok: false,
        configured: false,
        message: 'Falta configurar DATABASE_URL'
      });
    }
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('estudiantes', 'asignaturas', 'evaluaciones', 'calificaciones')
      ORDER BY table_name
    `;
    return res.status(200).json({
      ok: true,
      configured: true,
      database: 'neondb',
      tables: rows.map((row) => row.table_name),
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('status API error', error && error.message);
    return res.status(500).json({
      ok: false,
      configured: true,
      message: 'Error de conexión'
    });
  }
};
