/* Service worker mínimo para suporte PWA (instalação / standalone). Sem cache offline de rotas dinâmicas. */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
