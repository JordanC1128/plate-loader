const CACHE='plate-loader-v6';
const ASSETS=['./index.html','./style.css?v=6','./app.js?v=6','./manifest.webmanifest','./icon-192.png','./icon-512.png'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
  ]));
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req).then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put('./index.html',copy)).catch(()=>{});
        return response;
      }).catch(()=>caches.match('./index.html'))
    );
    return;
  }
  event.respondWith(
    fetch(req).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});
      return response;
    }).catch(()=>caches.match(req))
  );
});
