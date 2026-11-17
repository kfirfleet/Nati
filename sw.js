const CACHE = "nati-pgamim-v2";
const CORE = ["./", "index.html", "data.json", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
const IMGS = [];
for (let i = 7; i <= 143; i++) IMGS.push("p-" + String(i).padStart(3, "0") + ".jpg");

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// the page asks for the page images to be saved in the background, a few at a time
async function cacheImages() {
  const c = await caches.open(CACHE);
  for (let i = 0; i < IMGS.length; i += 6) {
    await Promise.allSettled(IMGS.slice(i, i + 6).map(async u => {
      if (await c.match(u)) return;
      const r = await fetch(u);
      if (r.ok) await c.put(u, r);
    }));
  }
}
self.addEventListener("message", e => {
  if (e.data === "cache-images") e.waitUntil(cacheImages());
});

async function imgFirst(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok) c.put(req, r.clone());
  return r;
}
// page and data: newest copy when the network answers in time, saved copy otherwise
async function netFirst(req) {
  const c = await caches.open(CACHE);
  const net = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; });
  const late = new Promise((_, no) => setTimeout(no, 3500));
  try { return await Promise.race([net, late]); }
  catch (err) {
    const hit = await c.match(req, { ignoreSearch: true });
    return hit || net;
  }
}
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (/\/p-\d+\.jpg$/.test(req.url)) e.respondWith(imgFirst(req));
  else e.respondWith(netFirst(req));
});
