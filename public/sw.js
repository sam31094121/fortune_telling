// 最小 service worker：只為了可安裝（加入主畫面），不快取任何內容。
// 所有請求直接走網路，不改變既有快取行為。
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // 不呼叫 respondWith：瀏覽器照常走網路（network pass-through）。
});
