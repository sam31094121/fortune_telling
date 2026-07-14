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
    console.error('[Error Boundary]', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="app-bg flex min-h-screen items-center justify-center">
      <div className="starfield pointer-events-none absolute inset-0 z-0" />
      <div className="relative z-10 px-6 text-center">
        <p className="mb-4 text-xs uppercase tracking-widest text-rose-300">SYSTEM RECOVERING</p>
        <h1 className="mb-4 font-serif text-3xl text-[color:var(--text-main)]">
          畫面正在重新整理
        </h1>
        <p className="mb-8 max-w-md text-sm text-[color:var(--text-sub)]">
          已保留你的資料，請重新載入這個區塊。
        </p>
        <button
          onClick={() => reset()}
          className="vip-gold-btn px-8 py-3 text-sm"
        >
          重新整理
        </button>
      </div>
    </div>
  );
}
