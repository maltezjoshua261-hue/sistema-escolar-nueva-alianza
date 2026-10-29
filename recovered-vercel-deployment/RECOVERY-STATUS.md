# Recuperación aislada de SINFO Secundaria 2027

Esta carpeta es una copia de trabajo de recuperación; no está conectada a Vercel ni debe desplegarse directamente.

## Archivos recuperados de la implementación de Vercel
- `src/index.html`: interfaz recuperada de la implementación publicada.
- `src/api/login.js`: endpoint de acceso recuperado.
- `src/package.json`: dependencia de Neon recuperada.
- `src/api/status.js`: endpoint de estado reconstruido a partir del archivo recuperado.

## Hallazgo importante de compatibilidad
La interfaz recuperada llama a la API de estudiantes con cuatro métodos: GET, POST, PUT y DELETE. Para editar y desactivar también envía `?id=...`. La primera reconstrucción (`students.reconstructed.js`) solo cubre GET/POST y no es compatible con todos los controles de la interfaz.

## Archivos candidatos para pruebas
- `src/api/students.reconstructed.js`: reconstrucción parcial, solo GET/POST.
- `src/api/students.full-reconstruction.js`: reconstrucción experimental que agrega PUT y desactivación lógica por DELETE, siguiendo el contrato que usa la interfaz. NO es el archivo original recuperado.
- La desactivación usa `UPDATE ... SET activo = false`; no elimina físicamente estudiantes ni sus notas.

## Pendiente de verificación
- No se ha ejecutado una prueba de extremo a extremo contra la base de respaldo.
- Antes de probar, verificar el esquema real de `estudiantes` y configurar un entorno aislado con `DATABASE_URL` de la rama de respaldo y `DIRECTOR_PASSWORD` como secreto.
- Validar autenticación, lectura, alta, edición, desactivación y duplicados.
- Los módulos de docentes, asignaciones, calificaciones de cuatro cortes y reportes aún no están implementados en esta API.

## Seguridad y límites
- No contiene valores de secretos.
- No modificar la base de datos de producción.
- No conectar esta rama de recuperación a producción.
- No desplegar estos archivos candidatos directamente.
- La rama de recuperación está aislada de `main`.
