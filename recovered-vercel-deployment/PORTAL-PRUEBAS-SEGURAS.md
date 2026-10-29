# Prueba segura del portal privado de notas — SINFO Secundaria 2027

## Estado
Esta guía corresponde a la rama aislada `recovery/sinfo-vercel-2026-10-28`. No desplegar a producción ni modificar `main`.

El endpoint `src/api/student-portal.js` necesita la tabla `public.accesos_estudiantes`. La migración está en `migrations/2027-student-access.sql`, pero aún no está aplicada. La aplicación integral no se considera probada hasta completar estos pasos.

## 1. Aplicar únicamente al respaldo
1. Abrir Neon Console y el proyecto `red-credit-74206233`.
2. Seleccionar expresamente la rama `sinfo-2027-respaldo-antes-de-correcciones` (ID `br-bitter-hall-b4g0rdn5`), no `production`.
3. Abrir SQL Editor y confirmar que el selector de rama sigue en el respaldo.
4. Ejecutar el contenido de `migrations/2027-student-access.sql`.
5. Verificar en el árbol de tablas que exista `public.accesos_estudiantes` y que su clave primaria `estudiante_id` referencie `public.estudiantes(id)`.
6. Si la consola muestra la rama `production`, detenerse sin ejecutar nada.

## 2. Pruebas de aceptación en entorno aislado
- Configurar un PIN de al menos 8 caracteres para un estudiante de prueba existente en el respaldo.
- Confirmar que la respuesta no devuelve ni guarda el PIN en texto claro.
- Consultar con código y PIN correctos: solo deben aparecer notas con `publicada = true` del estudiante autenticado.
- Probar un PIN incorrecto cinco veces y confirmar el bloqueo temporal; no reutilizar credenciales reales.
- Confirmar que sin PIN configurado no se muestran calificaciones.
- Confirmar que la consulta no se almacena en caché (`Cache-Control: no-store, private`).
- Confirmar que Dirección puede guardar una nota como borrador y que no aparece en el portal hasta publicarla.
- Retirar publicación y confirmar que la nota deja de aparecer en el portal.
- Probar el diseño en pantalla de teléfono y escritorio.

## 3. Criterio para detenerse
No desplegar mientras falte cualquiera de las pruebas, haya errores de esquema o la base de respaldo no tenga datos de asignaturas/evaluaciones/calificaciones para hacer pruebas funcionales. No crear calificaciones ficticias que puedan confundirse con notas reales.
