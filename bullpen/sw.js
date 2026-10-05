/* Titans Bullpen Chart - offline cache
   Bump CACHE when you upload a new index.html, or iPads keep the old one. */
var CACHE = "titans-bullpen-v21";
var FILES = [
  "./",
  "./index.html",
  "./guide.html",
  "./manifest.webmanifest",
  "./templates.js",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(FILES); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ if(k !== CACHE) return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

/* Cache first: the app must open with no signal, every time. */
self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  e.respondWith(
    /* SCOPED TO THIS VERSION'S CACHE. caches.match() with no cacheName searches
       EVERY cache in the origin, so a stale cache that survives for any reason
       keeps being served and the update never lands - the exact "stale app that
       looks perfectly fine" failure this file was written to prevent. */
    caches.match(e.request, {cacheName: CACHE}).then(function(hit){
      if(hit) return hit;
      return fetch(e.request).then(function(res){
        if(res && res.status === 200 && res.type === "basic"){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      })["catch"](function(){
        return caches.match("./index.html", {cacheName: CACHE});
      });
    })
  );
});
