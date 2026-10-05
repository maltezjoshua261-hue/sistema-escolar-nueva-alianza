-- Sistema Escolar Nueva Alianza
-- V11.1 - Arquitectura de base de datos central
-- Ejecutar en el SQL Editor de un proyecto Supabase NUEVO.
-- Esta etapa NO migra los datos de localStorage.

create extension if not exists pgcrypto;

create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  usuario text unique,
  nombre_completo text not null,
  rol text not null check (rol in ('Director','Docente')),
  docente_id text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estudiantes (
  id text primary key,
  codigo text unique,
  nombre text not null,
  nacimiento date,
  sexo text,
  nivel text,
  grado text,
  seccion text,
  responsable text,
  telefono text,
  direccion text,
  estado text default 'Activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.docentes (
  id text primary key,
  codigo text unique,
  nombre text not null,
  especialidad text,
  telefono text,
  correo text,
  nivel text,
  estado text default 'Activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asignaciones (
  id text primary key,
  docente_id text not null references public.docentes(id) on update cascade,
  anio integer not null,
  nivel text,
  grado text,
  seccion text,
  estado text default 'Activo',
  created_at timestamptz not null default now()
);

create table if not exists public.matriculas (
  id text primary key,
  estudiante_id text not null references public.estudiantes(id) on update cascade,
  anio integer not null,
  nivel text,
  grado text,
  seccion text,
  modalidad text,
  estado text default 'Activa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asistencias (
  id text primary key,
  estudiante_id text not null references public.estudiantes(id) on update cascade,
  fecha date not null,
  estado text not null,
  nivel text,
  grado text,
  seccion text,
  docente_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.calificaciones (
  id text primary key,
  estudiante_id text not null references public.estudiantes(id) on update cascade,
  anio integer not null,
  periodo text,
  disciplina text,
  calificacion numeric,
  categoria text,
  nivel text,
  grado text,
  seccion text,
  docente_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cierres_anuales (
  id text primary key,
  anio integer unique not null,
  estado text not null check (estado in ('Abierto','Cerrado')),
  fecha date,
  usuario text,
  reabierto date,
  usuario_reapertura text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_estudiantes_grupo
  on public.estudiantes(nivel, grado, seccion);

create index if not exists idx_matriculas_anio
  on public.matriculas(anio);

create index if not exists idx_asistencias_fecha
  on public.asistencias(fecha);

create index if not exists idx_calificaciones_estudiante_anio
  on public.calificaciones(estudiante_id, anio);

create index if not exists idx_asignaciones_docente_anio
  on public.asignaciones(docente_id, anio);

-- Seguridad: activar RLS antes de exponer tablas desde el navegador.
alter table public.perfiles enable row level security;
alter table public.estudiantes enable row level security;
alter table public.docentes enable row level security;
alter table public.asignaciones enable row level security;
alter table public.matriculas enable row level security;
alter table public.asistencias enable row level security;
alter table public.calificaciones enable row level security;
alter table public.cierres_anuales enable row level security;

-- En V11.1 NO se crean políticas abiertas.
-- Las políticas Director/Docente se crearán en V11.3,
-- después de configurar Supabase Auth y probar los perfiles.
