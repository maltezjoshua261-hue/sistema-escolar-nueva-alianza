/* Service worker mínimo para habilitar la experiencia de app instalada.
   No guarda en caché páginas ni datos escolares; el sistema sigue cargando desde la red. */
self.addEventListener("install", function (event) {
  self.skipWaiting();
});
self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});
