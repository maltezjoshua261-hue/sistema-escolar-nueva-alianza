/* SINFO PWA
   Se mantiene la consulta en línea. No se almacenan calificaciones,
   credenciales, respuestas de API ni datos personales en caché. */
self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});