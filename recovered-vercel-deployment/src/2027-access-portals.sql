-- SINFO Secundaria 2027: accesos privados para estudiantes y docentes.
-- Aplicar SOLO en la base de datos aislada de pruebas, después de revisar el esquema existente.
CREATE TABLE IF NOT EXISTS accesos_estudiantes (
  estudiante_id uuid PRIMARY KEY REFERENCES estudiantes(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  pin_salt text NOT NULL,
  intentos_fallidos integer NOT NULL DEFAULT 0,
  bloqueado_hasta timestamptz,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS accesos_docentes (
  docente_id uuid PRIMARY KEY REFERENCES docentes(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  pin_salt text NOT NULL,
  intentos_fallidos integer NOT NULL DEFAULT 0,
  bloqueado_hasta timestamptz,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_accesos_estudiantes_bloqueo ON accesos_estudiantes(bloqueado_hasta);
CREATE INDEX IF NOT EXISTS idx_accesos_docentes_bloqueo ON accesos_docentes(bloqueado_hasta);
