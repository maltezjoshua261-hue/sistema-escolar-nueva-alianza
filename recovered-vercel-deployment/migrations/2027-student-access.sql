-- SINFO Secundaria 2027: acceso privado a calificaciones.
-- Aplicar únicamente en la rama de respaldo tras revisión; nunca en producción sin autorización.
CREATE TABLE IF NOT EXISTS public.accesos_estudiantes (
  estudiante_id uuid PRIMARY KEY REFERENCES public.estudiantes(id),
  pin_hash text NOT NULL,
  pin_salt text NOT NULL,
  intentos_fallidos smallint NOT NULL DEFAULT 0 CHECK (intentos_fallidos BETWEEN 0 AND 10),
  bloqueado_hasta timestamptz,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
