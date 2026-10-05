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


-- ============================================================
-- V11.3 - AUTENTICACIÓN Y RLS
-- ============================================================

create or replace function public.mi_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(
        (select rol from public.perfiles where id = auth.uid() and activo = true),
        ''
    );
$$;

create or replace function public.es_director()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select public.mi_rol() = 'Director';
$$;

create or replace function public.es_docente()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select public.mi_rol() = 'Docente';
$$;

grant execute on function public.mi_rol() to authenticated;
grant execute on function public.es_director() to authenticated;
grant execute on function public.es_docente() to authenticated;

-- El usuario autenticado puede consultar únicamente su propio perfil.
create policy "perfil_propio_select"
on public.perfiles
for select
to authenticated
using (id = auth.uid() or public.es_director());

-- El Director administra perfiles.
create policy "perfil_director_insert"
on public.perfiles
for insert
to authenticated
with check (public.es_director());

create policy "perfil_director_update"
on public.perfiles
for update
to authenticated
using (public.es_director() or id = auth.uid())
with check (public.es_director() or id = auth.uid());

-- Director: acceso total a los datos institucionales.
-- Docente: acceso a los datos necesarios para la operación escolar.
create policy "estudiantes_select"
on public.estudiantes
for select
to authenticated
using (true);

create policy "estudiantes_director_write"
on public.estudiantes
for all
to authenticated
using (public.es_director())
with check (public.es_director());

create policy "docentes_select"
on public.docentes
for select
to authenticated
using (true);

create policy "docentes_director_write"
on public.docentes
for all
to authenticated
using (public.es_director())
with check (public.es_director());

create policy "asignaciones_select"
on public.asignaciones
for select
to authenticated
using (true);

create policy "asignaciones_director_write"
on public.asignaciones
for all
to authenticated
using (public.es_director())
with check (public.es_director());

create policy "matriculas_select"
on public.matriculas
for select
to authenticated
using (true);

create policy "matriculas_director_write"
on public.matriculas
for all
to authenticated
using (public.es_director())
with check (public.es_director());

create policy "asistencias_select"
on public.asistencias
for select
to authenticated
using (true);

create policy "asistencias_write"
on public.asistencias
for insert, update
to authenticated
with check (public.es_director() or public.es_docente());

create policy "asistencias_delete_director"
on public.asistencias
for delete
to authenticated
using (public.es_director());

create policy "calificaciones_select"
on public.calificaciones
for select
to authenticated
using (true);

create policy "calificaciones_write"
on public.calificaciones
for insert, update
to authenticated
with check (public.es_director() or public.es_docente());

create policy "calificaciones_delete_director"
on public.calificaciones
for delete
to authenticated
using (public.es_director());

create policy "cierres_select"
on public.cierres_anuales
for select
to authenticated
using (true);

create policy "cierres_director_write"
on public.cierres_anuales
for all
to authenticated
using (public.es_director())
with check (public.es_director());

-- Nota V11.3:
-- La creación de cuentas Auth se hará desde Supabase Auth.
-- Nunca se coloca una service_role/secret key en GitHub Pages.
