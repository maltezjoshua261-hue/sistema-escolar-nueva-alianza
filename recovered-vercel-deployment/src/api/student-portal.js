// Portal privado de notas para SINFO Secundaria 2027. Rama de recuperación; requiere migración 2027-student-access.sql.
const { neon } = require('@neondatabase/serverless');
const { randomBytes, scrypt, timingSafeEqual } = require('crypto');
const { promisify } = require('util');
const scryptAsync = promisify(scrypt);

async function hashPin(pin, salt) {
  return (await scryptAsync(pin, salt, 64)).toString('hex');
}
function validAdmin(req, res) {
  const expected = process.env.DIRECTOR_PASSWORD;
  if (!expected || req.headers['x-director-password'] !== expected) {
    res.status(401).json({ ok: false, message: 'Debes iniciar sesión como Dirección.' });
    return false;
  }
  return true;
}
module.exports = async function studentPortal(req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Pragma', 'no-cache');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Método no permitido.' });
  }
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, message: 'Base de datos no configurada.' });
  const body = req.body || {};
  const sql = neon(process.env.DATABASE_URL);

  try {
    if (body.action === 'set-pin') {
      if (!validAdmin(req, res)) return;
      const studentId = String(body.estudiante_id || '');
      const pin = typeof body.pin === 'string' ? body.pin : '';
      if (!studentId || pin.length < 8 || pin.length > 128) {
        return res.status(400).json({ ok: false, message: 'El PIN debe tener entre 8 y 128 caracteres.' });
      }
      const students = await sql`
        SELECT id FROM estudiantes
        WHERE id = ${studentId} AND activo = true AND anio_escolar = 2027
        LIMIT 1
      `;
      if (!students.length) return res.status(404).json({ ok: false, message: 'Estudiante activo de 2027 no encontrado.' });
      const salt = randomBytes(16).toString('hex');
      const digest = await hashPin(pin, salt);
      await sql`
        INSERT INTO accesos_estudiantes (estudiante_id, pin_hash, pin_salt, intentos_fallidos, bloqueado_hasta, actualizado_en)
        VALUES (${studentId}, ${digest}, ${salt}, 0, NULL, now())
        ON CONFLICT (estudiante_id)
        DO UPDATE SET pin_hash = EXCLUDED.pin_hash, pin_salt = EXCLUDED.pin_salt,
          intentos_fallidos = 0, bloqueado_hasta = NULL, actualizado_en = now()
      `;
      return res.status(200).json({ ok: true, message: 'Acceso privado configurado. Entrega el PIN al estudiante por un medio seguro.' });
    }

    if (body.action !== 'consult') return res.status(400).json({ ok: false, message: 'Acción no válida.' });
    const code = typeof body.codigo_estudiante === 'string' ? body.codigo_estudiante.trim() : '';
    const pin = typeof body.pin === 'string' ? body.pin : '';
    if (!code || !pin || code.length > 100 || pin.length > 128) {
      return res.status(400).json({ ok: false, message: 'Introduce tu código de estudiante y PIN.' });
    }

    const accounts = await sql`
      SELECT s.id, s.codigo_estudiante, s.nombres, s.apellidos, s.grado, s.seccion,
             a.pin_hash, a.pin_salt, a.intentos_fallidos, a.bloqueado_hasta
      FROM estudiantes s
      JOIN accesos_estudiantes a ON a.estudiante_id = s.id
      WHERE s.codigo_estudiante = ${code} AND s.activo = true AND s.anio_escolar = 2027
      LIMIT 1
    `;
    const account = accounts[0];
    if (!account) return res.status(401).json({ ok: false, message: 'Código o PIN incorrecto, o acceso no configurado.' });
    if (account.bloqueado_hasta && new Date(account.bloqueado_hasta).getTime() > Date.now()) {
      return res.status(429).json({ ok: false, message: 'Acceso temporalmente bloqueado por intentos fallidos. Intenta más tarde.' });
    }

    const expected = Buffer.from(account.pin_hash, 'hex');
    const supplied = Buffer.from(await hashPin(pin, account.pin_salt), 'hex');
    const matches = expected.length === supplied.length && timingSafeEqual(expected, supplied);
    if (!matches) {
      await sql`
        UPDATE accesos_estudiantes
        SET intentos_fallidos = LEAST(intentos_fallidos + 1, 10),
            bloqueado_hasta = CASE WHEN intentos_fallidos + 1 >= 5 THEN now() + interval '15 minutes' ELSE bloqueado_hasta END,
            actualizado_en = now()
        WHERE estudiante_id = ${account.id}
      `;
      return res.status(401).json({ ok: false, message: 'Código o PIN incorrecto.' });
    }

    await sql`UPDATE accesos_estudiantes SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE estudiante_id = ${account.id}`;
    const grades = await sql`
      SELECT a.nombre AS asignatura, e.semestre, e.corte, c.nota, c.actualizada_en
      FROM calificaciones c
      JOIN evaluaciones e ON e.id = c.evaluacion_id AND e.anio = 2027
      JOIN asignaturas a ON a.id = e.asignatura_id AND a.activa = true
      WHERE c.estudiante_id = ${account.id} AND c.publicada = true
      ORDER BY a.nombre, e.corte
    `;
    const averages = await sql`
      SELECT a.nombre AS asignatura,
             ROUND(AVG(c.nota) FILTER (WHERE e.corte IN (1,2)), 2) AS promedio_semestre_1,
             ROUND(AVG(c.nota) FILTER (WHERE e.corte IN (3,4)), 2) AS promedio_semestre_2,
             CASE WHEN COUNT(DISTINCT e.corte) = 4 THEN ROUND(AVG(c.nota), 2) ELSE NULL END AS promedio_anual
      FROM calificaciones c
      JOIN evaluaciones e ON e.id = c.evaluacion_id AND e.anio = 2027
      JOIN asignaturas a ON a.id = e.asignatura_id AND a.activa = true
      WHERE c.estudiante_id = ${account.id} AND c.publicada = true
      GROUP BY a.id, a.nombre
      ORDER BY a.nombre
    `;
    return res.status(200).json({
      ok: true,
      student: { codigo_estudiante: account.codigo_estudiante, nombres: account.nombres, apellidos: account.apellidos, grado: account.grado, seccion: account.seccion },
      grades,
      averages
    });
  } catch (error) {
    console.error('student portal error', error && error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo consultar el portal en este momento.' });
  }
};
