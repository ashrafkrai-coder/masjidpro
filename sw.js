/* Masjid Attendance Pro — Service Worker v5 (Supabase-ready) */
const CACHE = 'masjid-pro-v5';
const APP_SHELL = ['/','/index.html', '/manifest.webmanifest', '/icon.svg', '/sw.js'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// Buang semua cache versi lama & ambil alih tab terus
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // ❌ JANGAN cache Supabase API & Realtime — data mesti sentiasa segar
  if (url.hostname.includes('supabase.co')) return;

  // 🌐 Aset CDN (jsPDF, esm.sh supabase-js): cache-first → boleh guna offline
  if (url.hostname !== self.location.hostname) {
    e.respondWith(
      caches.match(req).then(hit => {
        if (hit) return hit;
        return fetch(req).then(res => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // 🧭 Navigasi (index.html): network-first → versi terbaru bila online, cache bila offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 🏠 Aset sama-origin lain: stale-while-revalidate
  e.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const networkFetch = fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      // Return cached immediately if available, otherwise wait for network
      return cached || networkFetch;
    })()
  );
});
