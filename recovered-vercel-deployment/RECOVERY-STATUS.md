# Recuperación aislada de SINFO Secundaria 2027

Esta carpeta es una copia de trabajo de recuperación; no está conectada a Vercel ni debe desplegarse directamente.

## Archivos recuperados de la implementación de Vercel
- `src/index.html`: interfaz recuperada previamente.
- `src/api/login.js`: endpoint de acceso recuperado previamente.
- `src/api/status.js`: endpoint de estado reconstruido a partir del archivo recuperado.
- `src/package.json`: dependencias recuperadas de la implementación.

## Archivo de estudiantes
- `src/api/students.reconstructed.js` es una reconstrucción de prueba basada en el fragmento legible del deployment.
- NO es una recuperación íntegra del archivo original.
- Solo permite GET y POST; no permite editar ni eliminar.
- Antes de probarlo con datos reales, configurar en un entorno aislado `DATABASE_URL` apuntando a la rama de respaldo y `DIRECTOR_PASSWORD` como secreto del entorno.
- No desplegar este archivo con el nombre `students.js` hasta revisar el esquema y probar autenticación, lectura, alta y manejo de duplicados.

## Seguridad y límites
- No contiene valores de secretos.
- No cambiar la base de datos de producción.
- No conectar esta rama de recuperación a producción.
- La base de datos de respaldo de Neon tiene la estructura de pruebas para 2027 y cuatro cortes, pero esta API aún no implementa calificaciones ni docentes.
