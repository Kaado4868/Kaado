// service-worker.js

const CACHE_NAME = "secret-cipher-v2"; // bump version when updating
const ASSETS = [
  "/", 
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// Install event - cache files
self.addEventListener("install", (event) => {
  self.skipWaiting(); // ⬅️ activate new SW immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activate event - clear old caches
self.addEventListener("activate", (event) => {
  clients.claim(); // ⬅️ take control of pages right away
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache a copy of the response
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request)) // fallback to cache if offline
  );
});