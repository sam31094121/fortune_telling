'use client';

import { useEffect } from 'react';

// 只在正式版註冊最小 service worker（加入主畫面所需），開發模式不註冊。
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  }, []);
  return null;
}
