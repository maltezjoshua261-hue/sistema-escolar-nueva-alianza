-- Centralización segura del módulo Padres y Tutores.
-- Tabla nueva y vacía: no copia, actualiza ni elimina registros existentes.

create table public.padres_tutores (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes(id) on delete restrict,
  estudiante_nombre text not null,
  codigo_centro text not null,
  anio integer not null,
  parentesco text not null default 'Madre',
  nombre text not null,
  cedula text,
  telefono text,
  correo text,
  ocupacion text,
  direccion text,
  emergencia text,
  telefono_emergencia text,
  principal text not null default 'No',
  estado text not null default 'Activo',
  observacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint padres_tutores_anio_check check (anio between 2000 and 2100),
  constraint padres_tutores_nombre_check check (char_length(trim(nombre)) > 0)
);

create index padres_tutores_centro_anio_idx
  on public.padres_tutores (codigo_centro, anio);
create index padres_tutores_estudiante_anio_idx
  on public.padres_tutores (estudiante_id, anio);

alter table public.padres_tutores enable row level security;

grant select, insert, update, delete on public.padres_tutores to authenticated;

create policy padres_tutores_select
  on public.padres_tutores
  for select
  to authenticated
  using (
    public.es_director()
    or (public.es_docente() and codigo_centro = public.mi_codigo_centro())
  );

create policy padres_tutores_insert
  on public.padres_tutores
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.estudiantes e
      where e.id = estudiante_id
        and e.codigo_centro = padres_tutores.codigo_centro
    )
    and (
      public.es_director()
      or (public.es_docente() and codigo_centro = public.mi_codigo_centro())
    )
  );

create policy padres_tutores_update
  on public.padres_tutores
  for update
  to authenticated
  using (
    public.es_director()
    or (public.es_docente() and codigo_centro = public.mi_codigo_centro())
  )
  with check (
    exists (
      select 1
      from public.estudiantes e
      where e.id = estudiante_id
        and e.codigo_centro = padres_tutores.codigo_centro
    )
    and (
      public.es_director()
      or (public.es_docente() and codigo_centro = public.mi_codigo_centro())
    )
  );

create policy padres_tutores_delete_director
  on public.padres_tutores
  for delete
  to authenticated
  using (public.es_director());
