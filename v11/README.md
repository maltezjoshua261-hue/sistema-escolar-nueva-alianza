# Sistema Escolar Nueva Alianza — V11.1

## Objetivo
Preparar una arquitectura de datos centralizada sin modificar ni eliminar los datos actuales almacenados en el navegador.

## Plataforma seleccionada
Supabase + PostgreSQL + Supabase Auth.

La aplicación seguirá publicada en GitHub Pages, mientras que los datos compartidos vivirán en PostgreSQL.

## Regla de seguridad
Nunca colocar una service_role key en index.html ni en ningún archivo público del repositorio.

## Etapas
- V11.1: arquitectura y esquema central.
- V11.2: conexión segura del cliente.
- V11.3: autenticación y perfiles Director/Docente.
- V11.4: estudiantes y matrícula.
- V11.5: asistencia.
- V11.6: calificaciones.
- V11.7: reportes y boletas.
- V11.8: permisos y cierre anual.
- V11.9: migración controlada desde localStorage.
- V11.10: prueba multiusuario real.

## Estado
V11.1 preparada en una rama independiente: v11-centralizacion.

La versión publicada de producción no se modifica todavía.
