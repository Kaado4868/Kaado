// service-worker.js

// 🔧 Toggle this when testing or deploying
const DEV_MODE = true; // set to false when deploying final version

const CACHE_NAME = "secret-cipher-v1";
const ASSETS = [
  "/", 
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// Install event
self.addEventListener("install", (event) => {
  if (DEV_MODE) {
    console.log("🚧 Dev mode: skipping cache install");
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("✅ Caching app assets");
      return cache.addAll(ASSETS);
    })
  );
});

// Activate event (cache cleanup)
self.addEventListener("activate", (event) => {
  if (DEV_MODE) {
    console.log("🚧 Dev mode: skipping cache cleanup");
    return;
  }
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
});

// Fetch event
self.addEventListener("fetch", (event) => {
  if (DEV_MODE) {
    console.log("🚧 Dev mode: network fetch", event.request.url);
    return; // don’t intercept in dev mode
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          console.warn("⚠️ Network request failed, offline mode.");
        })
      );
    })
  );
});