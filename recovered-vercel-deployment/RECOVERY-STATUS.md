# Recuperación aislada de SINFO Secundaria 2027

Esta carpeta es una copia de trabajo de recuperación. No está conectada a Vercel ni debe desplegarse directamente.

## Estado de archivos
- `src/index.html`: interfaz recuperada de la implementación publicada.
- `src/api/login.js`: endpoint de acceso recuperado.
- `src/package.json`: dependencia de Neon recuperada.
- `src/api/status.js`: endpoint de estado reconstruido a partir del archivo recuperado.
- `src/api/students.reconstructed.js`: reconstrucción parcial, solo GET/POST.
- `src/api/students.full-reconstruction.js`: archivo de referencia experimental para GET/POST/PUT y desactivación lógica.
- `src/api/students.js`: ruta `/api/students` conectada a esa reconstrucción para que coincida con la interfaz.
- `src/api/teachers.js`: API experimental para listar, registrar, editar y desactivar docentes.
- `src/api/subjects.js`: API experimental para administrar asignaturas por grado.
- `src/api/assignments.js`: API experimental para asignar docente, asignatura y sección en 2027.
- `src/api/evaluations.js`: consulta y creación de evaluaciones 2027, validando la correspondencia de semestre y corte.
- `src/api/gradebook.js`: consulta de notas, guardado de borradores y publicación/retirada explícita de publicación.

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
- Completar la consulta pública segura de notas individuales para estudiantes, sin exponer el listado general.
- Probar autenticación, consultas y operaciones CRUD contra una instancia aislada conectada únicamente a la rama de respaldo.
- Probar el flujo completo en entorno aislado antes de considerar cualquier despliegue.
- Preparar pruebas de publicación individual de notas y reportes antes de cualquier despliegue.

## Seguridad
- No contiene valores de secretos.
- No modificar la base de datos de producción.
- No conectar esta rama de recuperación a producción.
- No desplegar estos archivos candidatos directamente.
- No borrar datos; las APIs candidatas usan desactivación lógica.


## Avance del 28 de octubre de 2026
- Se añadieron APIs candidatas para docentes, asignaturas, asignaciones y evaluaciones de los cuatro cortes.
- Se añadió un endpoint de consulta de calificaciones 2027.
- Las seis APIs candidatas se verificaron con comprobación básica de sintaxis JavaScript.
- Consulta de solo lectura en el respaldo: 264 estudiantes; asignaturas, evaluaciones, calificaciones, docentes y asignaciones aún en 0.
- Falta la prueba integral y falta completar el guardado/edición/publicación de notas. No desplegar.


## Avance adicional del 28 de octubre de 2026
- La interfaz aislada ya integra formularios y listados para estudiantes, asignaturas, docentes, asignaciones, evaluaciones y calificaciones.
- Se conectó la ruta `src/api/students.js` que espera la interfaz.
- `gradebook.js` ahora permite guardar notas como borradores y publicar o retirar la publicación explícitamente. No permite sobrescribir una nota publicada mientras siga publicada.
- Se comprobó la sintaxis JavaScript del script de la interfaz y de las APIs de estudiantes, asignaturas, docentes, asignaciones, evaluaciones y calificaciones: todas pasaron la comprobación básica.
- La verificación anterior es de sintaxis, no una prueba de funcionamiento integral. No se ejecutaron cambios de datos con estas APIs, no se desplegó y producción permanece intacta.

## Avance de integración — 28 de octubre de 2026 (continuación)
- La interfaz aislada integra paneles de estudiantes, asignaturas, docentes, asignaciones docentes, evaluaciones, calificaciones y reportes.
- La ruta `src/api/students.js` está creada con el nombre que requiere `/api/students`.
- `src/api/gradebook.js` soporta consulta administrativa, guardado de nota como borrador y publicación o retirada de publicación mediante una acción explícita.
- Se añadió `src/api/reports.js` para reportes de cuatro cortes, promedios por semestre y promedio anual solo cuando las cuatro notas existen.
- Se pasó comprobación de sintaxis a la interfaz y a las siete rutas de API: estudiantes, asignaturas, docentes, asignaciones, evaluaciones, calificaciones y reportes. También se verificó que las referencias directas a IDs de la interfaz existen.
- **Límite de verificación:** no se ejecutaron pruebas de extremo a extremo ni operaciones de escritura desde la interfaz. La rama de respaldo sigue sin asignaturas, evaluaciones, calificaciones, docentes ni asignaciones cargadas; no se inventaron datos de prueba.
- Falta diseñar un acceso seguro para consulta individual de estudiantes; no se expone el listado de calificaciones a visitantes sin autenticar.
- No desplegar ni conectar a producción hasta completar las pruebas aisladas.


## Continuación de cierre — 28/29 de octubre de 2026
- Se creó la rama Neon aislada `sinfo-2027-pruebas-aisladas-20261028` (`br-long-sunset-b4t6960i`) como hija de la rama de respaldo. No se insertaron ni modificaron datos en ella.
- Se volvió a comprobar el respaldo: 264 estudiantes; 0 asignaturas, 0 evaluaciones 2027, 0 calificaciones, 0 docentes, 0 asignaciones y 0 accesos PIN.
- Se verificaron los nombres y tipos de columnas usados por las APIs del portal y del libro de notas contra el esquema real.
- Se intentó preparar un proyecto Vercel separado para la recuperación, con raíz `recovered-vercel-deployment/src`, pero Vercel rechazó la conexión automática al repositorio porque falta una conexión de inicio de sesión de GitHub en la cuenta. No se cambió el proyecto Vercel existente ni se desplegó nada.
- **Bloqueo para completar el cierre:** falta habilitar la conexión GitHub↔Vercel y realizar pruebas de extremo a extremo usando exclusivamente la rama Neon aislada. El proyecto actual no se debe reconfigurar porque podría afectar el despliegue existente.
- La base de producción sigue sin la tabla `accesos_estudiantes`; no aplicar la migración a producción ni publicar el portal hasta aprobar y superar las pruebas aisladas.


## Preparación del entorno Vercel aislado — 29 de octubre de 2026
- Se creó el proyecto separado `sinfo-secundaria-2027-pruebas` (ID `prj_nvBx7v7IAkRu2SiVIrytlrMVpcB8`) con protección SSO activada; no se vinculó dominio personalizado.
- Se configuraron variables cifradas de prueba para la rama Neon aislada como entorno Preview.
- Se intentó enviar una compilación inline con los archivos de recuperación, pero Vercel la interpretó como destino `production` del proyecto de pruebas. Se canceló inmediatamente: deployment `dpl_BcDufQSFSdfgF6uhGZm2dsAFGyj3`, estado `CANCELED`. No se publicó un despliegue utilizable.
- La conexión GitHub↔Vercel sigue sin habilitarse y es necesaria para poder crear un deployment Preview normal. El proyecto Vercel original `sinfo-secundaria-2027` no se modificó.
- Antes de probar, verificar que las variables de entorno de Preview se apliquen a un deployment de rama y que la protección SSO permanezca activa. No publicar en el proyecto original ni modificar producción.
