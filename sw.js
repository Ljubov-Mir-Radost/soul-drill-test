importScripts('./content-validator-worker.js');
const {validateCatalog}=self.SoulDrillContent;
const VERSION='soul-drill-test-static-v1.3.0';
self.CACHE_VERSION=VERSION;
const FILES=['./','./index.html','./styles.css','./app.js','./device-controls.js','./excerpt.js','./schedule.js','./planning-ui.js','./core.js','./db.js','./content-validator.js','./content-validator-worker.js','./data/content.v1.json','./data/content.v2.json','./manifest.webmanifest','./icons/favicon.png','./icons/logo.png','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./editor/index.html','./editor/editor.js','./editor/editor.css','./review-kit/1.0.0/manifest.json','./review-kit/1.0.0/README.md','./review-kit/1.0.0/COMMON.md','./review-kit/1.0.0/MK-PROMPT.md','./review-kit/1.0.0/BHS-PROMPT.md','./review-kit/1.0.0/TECHNICAL-PROMPT.md','./review-kit/1.0.0/REPORT-TEMPLATE.md','./review-kit/1.0.0/EXAMPLE.json'];
const urls=FILES.map(p=>new URL(p,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(VERSION);
 try{await cache.addAll(urls);const response=await cache.match(new URL('./data/content.v2.json',self.registration.scope).href);if(!response||validateCatalog(await response.json()).length)throw Error('Invalid public catalog');}
 catch(e){await caches.delete(VERSION);throw e;}
})()));
// Never force a reload or touch IndexedDB. Old clients keep their complete old release.
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('soul-drill-test-static-')&&key!==VERSION)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 const u=new URL(event.request.url),base=new URL(self.registration.scope);
 // Fresh editorial duplicate checks must not be silently satisfied by an old cache.
 if(u.searchParams.has('editor-check'))return;
 let target=u.href;
 if(event.request.mode==='navigate'){
  if(u.pathname===base.pathname||u.pathname===base.pathname+'index.html')target=new URL('./index.html',base).href;
  else if(u.pathname===base.pathname+'editor/'||u.pathname===base.pathname+'editor/index.html')target=new URL('./editor/index.html',base).href;
  else return;
 }else if(!urls.includes(target))return;
 event.respondWith((async()=>{const cache=await caches.open(VERSION);return (await cache.match(target))||fetch(event.request);})());
});
