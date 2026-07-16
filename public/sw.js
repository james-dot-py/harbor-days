// Ope! service worker — a deliberate no-op.
//
// Its ONLY job is to satisfy Chrome/Android's installability requirement (a SW
// with a fetch handler). It caches NOTHING on purpose: the game ships as one
// self-contained index.html, and the whole point of that artifact is that what
// you load IS what shipped. Any cache here would serve a stale build after every
// deploy. The fetch listener never calls respondWith, so every request falls
// straight through to the network.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});   // pass-through: no respondWith == plain network
