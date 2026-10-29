# Recuperación aislada de SINFO Secundaria 2027

Esta carpeta es una copia de trabajo de recuperación. No está conectada a Vercel ni debe desplegarse directamente.

## Estado de archivos
- `src/index.html`: interfaz recuperada de la implementación publicada.
- `src/api/login.js`: endpoint de acceso recuperado.
- `src/package.json`: dependencia de Neon recuperada.
- `src/api/status.js`: endpoint de estado reconstruido a partir del archivo recuperado.
- `src/api/students.reconstructed.js`: reconstrucción parcial, solo GET/POST.
- `src/api/students.full-reconstruction.js`: reconstrucción experimental para GET/POST/PUT y desactivación lógica.
- `src/api/teachers.js`: API experimental para listar, registrar, editar y desactivar docentes.
- `src/api/subjects.js`: API experimental para administrar asignaturas por grado.
- `src/api/assignments.js`: API experimental para asignar docente, asignatura y sección en 2027.

## Compatibilidad observada
La interfaz recuperada llama a la API de estudiantes usando GET, POST, PUT y DELETE con `?id=...`. La API original completa no se ha podido recuperar; los archivos nuevos son reconstrucciones basadas en el contrato visible de la interfaz y el esquema de respaldo.

## Base de datos de respaldo
El esquema fue consultado en la rama de respaldo `sinfo-2027-respaldo-antes-de-correcciones`. Se confirmaron las tablas `estudiantes`, `asignaturas`, `evaluaciones`, `calificaciones`, `docentes` y `asignaciones_docente`.
- `estudiantes`: UUID, código único, nombres, apellidos, grado 7–11, sección, activo y año escolar.
- `asignaturas`: nombre, grado 7–11 y activa.
- `evaluaciones`: asignatura, año, semestre 1–2 y corte 1–4.
- `calificaciones`: estudiante, evaluación, nota numérica 0–100 y estado de publicación.
- `docentes`: código único, nombres, apellidos y activo.
- `asignaciones_docente`: docente, asignatura, sección, año y activa.

## Verificación realizada
- La rama de recuperación tiene ocho commits por delante de `main`; no se incorporaron a `main`.
- La sintaxis JavaScript de `students.full-reconstruction.js` pasó una verificación básica.
- No se ha ejecutado una prueba de extremo a extremo contra la base de respaldo ni una prueba de despliegue.
- Las APIs de docentes, asignaturas y asignaciones están guardadas, pero aún requieren verificación sintáctica y pruebas de integración.

## Pendiente
- Completar y verificar el módulo de evaluaciones/calificaciones de cuatro cortes.
- Probar autenticación, consultas y operaciones CRUD contra una instancia aislada conectada únicamente a la rama de respaldo.
- Integrar las APIs a la interfaz recuperada y comprobar el flujo completo.
- Preparar pruebas de publicación individual de notas y reportes antes de cualquier despliegue.

## Seguridad
- No contiene valores de secretos.
- No modificar la base de datos de producción.
- No conectar esta rama de recuperación a producción.
- No desplegar estos archivos candidatos directamente.
- No borrar datos; las APIs candidatas usan desactivación lógica.
