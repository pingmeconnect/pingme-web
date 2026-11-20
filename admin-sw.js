/* PingMe admin service worker: network-first, caches only the admin page shell + icons.
   Never caches API calls, Supabase, Worker or any cross-origin request (no stale customer data). */
const CACHE='pingme-admin-v2';
const SHELL=['/admin.html','/manifest.webmanifest','/assets/icon-192.png','/assets/icon-512.png','/assets/pingme-logo.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin)return;
  if(!SHELL.includes(u.pathname))return;
  e.respondWith(fetch(r).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy)).catch(()=>{});return res}).catch(()=>caches.match(r)));
});
