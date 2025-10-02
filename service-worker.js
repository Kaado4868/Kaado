const CACHE_NAME="secret-cipher-v1";
const ASSETS=["/","/index.html","/manifest.json","/icon-192.png","/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))) });
self.addEventListener("fetch",e=>{e.respondWith(caches.match(e.request).then(res=>res||fetch(e.request))) });