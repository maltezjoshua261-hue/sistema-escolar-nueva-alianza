# Prueba segura del portal privado de notas — SINFO Secundaria 2027

## Estado
Esta guía corresponde a la rama aislada `recovery/sinfo-vercel-2026-10-28`. No desplegar a producción ni modificar `main`.

El endpoint `src/api/student-portal.js` necesita la tabla `public.accesos_estudiantes`. La migración `migrations/2027-student-access.sql` ya fue aplicada únicamente en la rama de respaldo `br-bitter-hall-b4g0rdn5`. Se verificó que `public.accesos_estudiantes` existe allí y no existe en `production`. La aplicación integral no se considera probada hasta completar estos pasos.

## 1. Migración aplicada en respaldo
- Rama de respaldo: `sinfo-2027-respaldo-antes-de-correcciones` (ID `br-bitter-hall-b4g0rdn5`).
- Tabla creada: `public.accesos_estudiantes`, con hash/sal del PIN, contador de intentos, bloqueo temporal y fecha de actualización.
- Verificación: tabla presente en respaldo y ausente en `production`.
- No se asignaron PIN ni se insertaron datos de acceso.

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


## 4. Avance del 28 de octubre de 2026
- Se unificó el mensaje de error cuando el código no tiene acceso configurado y cuando las credenciales son incorrectas, reduciendo la exposición de información sobre cuentas.
- La API y la interfaz siguen en la rama de recuperación. No se desplegó a Vercel.
- Pruebas integrales pendientes: la copia no tiene asignaturas, evaluaciones ni calificaciones; no se deben inventar notas ni asignar PIN a estudiantes reales.
