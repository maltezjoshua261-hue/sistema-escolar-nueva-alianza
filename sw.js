/* PWA Sistema Escolar Nueva Alianza
   No se almacenan en caché credenciales, calificaciones ni datos personales.
   La aplicación requiere conexión para consultar los datos escolares. */
self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});