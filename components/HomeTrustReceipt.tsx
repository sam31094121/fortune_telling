'use client';

import Link from 'next/link';

/**
 * 首屏信任收據（第三段）：放在「今日一關」之後、主線之前。
 * 只做可核對入口與誠信說明導引，不在這裡硬推 VIP／LINE。
 */
export default function HomeTrustReceipt() {
  return (
    <section
      className="home-trust-receipt mx-auto mb-4 w-full max-w-[440px] rounded-2xl border border-amber-200/30 bg-slate-950/70 px-3.5 py-3 shadow-[0_10px_28px_rgba(2,6,23,0.32)] backdrop-blur-md"
      aria-label="信任收據"
      data-stickiness="trust-receipt"
      data-home-slot="trust-receipt"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.72rem] font-black tracking-[0.14em] text-amber-100/95">信任收據</p>
          <h2 className="mt-1 text-[0.95rem] font-black leading-snug text-slate-50">
            先看清楚我們承諾什麼
          </h2>
          <p className="mt-1 text-[0.72rem] font-semibold leading-5 text-slate-300/95">
            今日關卡免費、免填資料；進度記在這台裝置。社群認同／瀏覽可點開核對，說明頁寫清「算什麼／不算什麼」。
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2 py-1 text-[0.65rem] font-black tracking-wide text-cyan-100">
          可核對
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/trust"
          className="inline-flex items-center justify-center rounded-full border border-amber-200/40 bg-amber-300/10 px-3 py-1.5 text-[0.72rem] font-black text-amber-50 transition hover:bg-amber-300/20"
          data-trust-receipt="honesty-page"
        >
          誠信說明
        </Link>
        <a
          href="#home-trust-strip"
          className="inline-flex items-center justify-center rounded-full border border-slate-400/35 bg-slate-100/5 px-3 py-1.5 text-[0.72rem] font-black text-slate-100 transition hover:bg-slate-100/10"
          data-trust-receipt="community-strip"
        >
          查看社群數字
        </a>
      </div>
    </section>
  );
}
