'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Error Boundary]', error);
  }, [error]);

  return (
    <div className="app-bg flex min-h-screen items-center justify-center">
      <div className="starfield pointer-events-none absolute inset-0 z-0" />
      <div className="relative z-10 text-center px-6">
        <p className="text-xs uppercase tracking-widest text-rose-300 mb-4">發生錯誤</p>
        <h1 className="font-serif text-3xl text-[color:var(--text-main)] mb-4">
          哎呀！發生了問題
        </h1>
        <p className="text-sm text-[color:var(--text-sub)] mb-8 max-w-md">
          系統遇到了一個小問題。請嘗試重新加載頁面，或稍後再試。
        </p>
        <button
          onClick={() => reset()}
          className="vip-gold-btn px-8 py-3 text-sm"
        >
          重新嘗試
        </button>
      </div>
    </div>
  );
}
