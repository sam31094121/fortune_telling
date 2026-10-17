// 最小 service worker：只為了可安裝（加入主畫面），不快取任何網站內容。
// 所有請求照常走網路，不改變既有快取行為。
// 2026-10-17 穩定性：唯一例外是「整頁導覽在斷線時失敗」——這時改顯示一張離線說明頁
// （/offline.html，五種語言），而不是瀏覽器的白畫面／恐龍頁。連上網路就照常載入真正的頁面。
const OFFLINE_CACHE = 'tdh-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 導覽預載：讓「經過 service worker」不會拖慢正常開頁。
    try { if (self.registration.navigationPreload) await self.registration.navigationPreload.enable(); } catch (e) {}
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('tdh-offline-') && k !== OFFLINE_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  // 只處理整頁導覽；圖片、腳本、API 等其他請求完全不碰（瀏覽器照常走網路）。
  if (request.mode !== 'navigate' || request.method !== 'GET') return;
  event.respondWith((async () => {
    try {
      const preloaded = await event.preloadResponse;
      if (preloaded) return preloaded;
      return await fetch(request);
    } catch (error) {
      const cached = await caches.match(OFFLINE_URL);
      if (cached) return cached;
      throw error;
    }
  })());
});
