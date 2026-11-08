# Plan seguro de modernización institucional MINED
Fecha: 2026-11-08

## Objetivo
Modernizar la presentación de todos los módulos del Sistema Escolar Nueva Alianza con identidad institucional MINED (azul marino, azul y blanco), conservando íntegramente funciones, datos, permisos, autenticación, conexiones y reglas escolares.

## Resguardo y ramas
- Rama de respaldo inalterada: `backup/pre-modernizacion-2026-11-08`.
- Rama exclusiva de trabajo: `modernizacion/institucional-mined`.
- La rama publicada `v11-centralizacion` no se modifica durante el trabajo.
- No se integra ni publica ningún cambio sin revisión y pruebas aprobadas.
- El respaldo Git protege el código fuente versionado; no es una exportación de la base de datos ni de los objetos de Storage.

## Respaldo de Supabase: requisito antes de tocar datos
- Proyecto identificado: `nueva-alianza-escolar`, actualmente en plan Free.
- No se ha ejecutado ninguna escritura, migración ni modificación en Supabase.
- Antes de cualquier futura intervención que pudiera afectar datos, exportar un respaldo lógico de la base de datos con Supabase CLI y guardar una copia segura fuera del proyecto.
- Respaldar por separado los objetos de Storage: los respaldos de base de datos no incluyen los archivos almacenados mediante Storage API.
- El plan Free recomienda exportaciones periódicas mediante `supabase db dump`; no asumir que hay descargas de respaldos diarios disponibles en el Dashboard.
- Para esta modernización visual, la base de datos y Storage quedan fuera del alcance y no deben modificarse.

## Límites inviolables
No modificar:
- Esquema, tablas, columnas, políticas RLS, vistas, funciones ni registros de Supabase.
- Credenciales, inicio de sesión, sesiones, roles Director/Docente ni permisos.
- Consultas, escrituras, filtros, relaciones, validaciones o reglas de negocio.
- Importación de estudiantes, matrícula, carga académica, horarios, asistencia, calificaciones, boletas, padres/tutores, expedientes, convivencia y planificación.
- URLs, claves de configuración, endpoints, dependencias o configuración de despliegue.

## Método de intervención
1. Inventariar archivos, módulos, estilos, componentes compartidos y puntos de entrada.
2. Identificar selectores y estilos actuales; establecer una línea base visual y funcional.
3. Diseñar tokens visuales institucionales (colores, tipografía, espaciado, bordes, sombras y estados).
4. Aplicar primero estilos CSS aislados y reutilizables, evitando selectores globales peligrosos.
5. Modernizar por capas: acceso; encabezado y navegación; panel principal; componentes compartidos; formularios y tablas; cada módulo; impresión de boletas/documentos; móvil.
6. No reescribir HTML, JavaScript ni lógica de módulos salvo que sea estrictamente imprescindible y exista autorización explícita posterior.
7. Mantener cada fase en commits pequeños y reversibles.

## Pruebas obligatorias por fase
- Compilación/carga sin errores de consola ni recursos faltantes.
- Inicio/cierre de sesión y persistencia de sesión.
- Director: acceso y acciones administrativas permitidas.
- Docente: acceso limitado a su centro, nivel, grado y grupos asignados.
- Lectura y escritura de datos de prueba controlados; verificar que los registros existentes no cambien.
- Listas, filtros, selectores, formularios, botones, exportación e impresión.
- Revisión en escritorio, tableta y móvil.
- Verificación de que el diseño no oculta información ni bloquea controles de teclado/toque.

## Criterios de aceptación
- Todos los módulos conservan sus comportamientos anteriores.
- No hay cambios en Supabase ni en permisos.
- Las diferencias del código se limitan a la capa visual aprobada.
- Director y Docente superan sus pruebas.
- El propietario revisa la versión de prueba antes de autorizar publicación.

## Plan de reversión
Si una fase falla, detener el trabajo y revertir únicamente los commits de esa fase en la rama de modernización. La rama de respaldo y la rama publicada permanecen intactas. Nunca corregir un fallo visual alterando datos o reglas funcionales.

## Estado inicial
- Respaldo Git creado y verificado.
- Rama de trabajo creada desde el respaldo.
- Documento de intervención guardado en la rama de trabajo.
- No se han cambiado archivos de aplicación, datos, permisos ni configuración de despliegue.
- Pendiente: inventario técnico y línea base de pruebas antes de cualquier modificación visual.
- El respaldo independiente de la base de datos y los archivos de Storage queda pendiente; no se declarará completo hasta exportarlo y verificarlo.
