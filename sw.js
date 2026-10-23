/* 任務看板 service worker
 * - App 畫面：先連網取得最新版，沒網路時用快取（所以更新 GitHub 上的檔案後會自動生效）
 * - 資料（script.google.com）：完全不經過快取，永遠直接連線
 */
const CACHE = 'kanban-v5';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];
const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.2/Sortable.min.js';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL).then(() => c.add(CDN).catch(() => {})))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // 資料存取（POST）不處理
  const url = new URL(req.url);
  if (url.hostname.endsWith('google.com') || url.hostname.endsWith('googleusercontent.com')) return;

  // 拖曳函式庫：有快取就先用快取
  if (url.href === CDN) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    })));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // 自己網站的檔案：先連網，失敗才用快取
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
