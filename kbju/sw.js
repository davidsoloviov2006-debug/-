// Офлайн-режим: оболочка приложения в кэше, обновление в фоне.
const V = 'kbju-v3';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'i18n.js', 'foods.js', 'il-foods.js', 'manifest.webmanifest', 'vendor/zxing.min.js', 'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V && k !== 'kbju-rt').map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin === location.origin) {
    // stale-while-revalidate для файлов приложения
    e.respondWith(caches.open(V).then(async (c) => {
      const hit = await c.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // библиотека OCR и языковые модели — кэшируем навсегда после первой загрузки
  if (/cdn\.jsdelivr\.net|tessdata\.projectnaptha\.com|images\.openfoodfacts\.org/.test(u.host)) {
    e.respondWith(caches.open('kbju-rt').then(async (c) => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok || r.type === 'opaque') c.put(e.request, r.clone());
      return r;
    }));
  }
});
