const CACHE_NAME = "cipher-cache-v3";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/service-worker.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(names.map(name => { if(name !== CACHE_NAME) return caches.delete(name); })))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(caches.match(event.request).then(resp => resp || fetch(event.request)));
});
