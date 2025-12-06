const CACHE_NAME = 'fatima-store-v4.4'; // Updated to match your HTML version

// 1. CORE ASSETS: These MUST be cached or the app won't open.
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png'
];

// 2. EXTERNAL ASSETS: We TRY to cache these, but if they fail, we don't break the app.
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest', 
  'https://unpkg.com/html5-qrcode',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Step A: Cache Core Files (Vital)
      try {
        await cache.addAll(CORE_ASSETS);
        console.log('Core assets cached successfully.');
      } catch (err) {
        console.error('Core assets failed:', err);
      }

      // Step B: Cache External Files (Best Effort)
      for (const url of EXTERNAL_ASSETS) {
        try {
          const request = new Request(url, { mode: 'cors' });
          const response = await fetch(request);
          if (response.ok) {
            await cache.put(request, response);
          }
        } catch (err) {
          console.warn('Failed to cache external asset:', url, err);
        }
      }
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // 1. IGNORE FIREBASE/GOOGLE APIs
  // Added 'google.com' to prevent SW from messing with Auth redirects
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('firestore') || 
      url.hostname.includes('googleapis') ||
      url.hostname.includes('google.com')) {
    return;
  }

  // 2. Navigation Fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => {
        // If offline, try finding index.html in cache
        return caches.match('./index.html', {ignoreSearch: true})
          .then(response => {
            // If direct match fails, try the root
            return response || caches.match('./', {ignoreSearch: true});
          });
      })
    );
    return;
  }

  // 3. Cache Strategy for other files
  e.respondWith(
    caches.match(e.request, {ignoreSearch: true}).then((cachedResponse) => {
      return cachedResponse || fetch(e.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, response.clone());
          return response;
        });
      }).catch(() => {
        return null; 
      });
    })
  );
});
