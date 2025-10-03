const CACHE_NAME="cipher-v1";
const ASSETS=["/","/index.html","/login.html","/app.js","/auth.js","/manifest.json","/icon-192.png","/icon-512.png"];
self.addEventListener("install",(e)=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));});
self.addEventListener("fetch",(e)=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});