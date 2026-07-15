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
    <div className="app-bg flex min-h-screen items-center justify-center px-6">
      <div className="starfield pointer-events-none absolute inset-0 z-0" />
      <div className="fortune-card relative z-10 max-w-md px-6 py-8 text-center sm:px-8">
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-rose-300">SYSTEM RECOVERING</p>
        <h1 className="mb-4 font-serif text-3xl text-[color:var(--text-main)]">
          系統正在恢復
        </h1>
        <p className="mb-8 text-sm leading-8 text-[color:var(--text-sub)]">
          剛才連線或畫面載入不穩，請按下重新整理。你的操作資料會盡量保留。
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => reset()} className="vip-gold-btn flex-1 px-6 py-3 text-sm">
            重新整理
          </button>
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white"
          >
            回首頁
          </button>
        </div>
      </div>
    </div>
  );
}
