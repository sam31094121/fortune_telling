import Link from 'next/link';

export default function TarotEntryCard() {
  return (
    <Link
      href="/tarot"
      className="home-feature-launch order-8 w-full relative group overflow-hidden rounded-3xl border border-sky-400/30 bg-gradient-to-r from-slate-950 via-sky-950/20 to-slate-950 p-6 text-left shadow-[0_0_30px_rgba(56,189,248,0.15)] transition-all duration-500 hover:border-sky-300 hover:shadow-[0_0_50px_rgba(56,189,248,0.28)] active:scale-[0.99] flex items-center justify-between gap-6 flex-wrap"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(125,211,252,0.2),transparent_34%),radial-gradient(circle_at_82%_28%,rgba(253,230,138,0.13),transparent_30%)] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-300/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />

      <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-4.5">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-300/30 bg-sky-950/40 text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.22)]">
          <span className="absolute h-7 w-5 rotate-[-8deg] rounded border border-amber-200/55 bg-slate-950/80" aria-hidden="true" />
          <span className="relative font-serif text-xl font-black text-amber-100">T</span>
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-sky-400/10 border border-sky-300/25 px-3 py-0.5 text-[10px] font-bold tracking-widest text-sky-100 uppercase animate-pulse">
            SELF · 單張牌指引
          </span>
          <h2 className="mt-1.5 font-serif text-xl sm:text-2xl font-black text-sky-50 tracking-wide flex items-center gap-2">
            <span>塔羅指引</span>
            <span className="text-xs font-sans text-sky-100 font-normal opacity-85 hidden sm:inline">
              // 問題整理 · 牌面象徵 · 下一步方向
            </span>
          </h2>
          <p className="mt-1 text-xs text-[color:var(--text-sub)]">
            透過牌面象徵，整理當下問題與下一步方向。
          </p>
        </div>
      </div>

      <div className="home-feature-cta flex items-center gap-2 rounded-xl border border-sky-300/40 bg-sky-950/30 px-5 py-3 text-xs font-bold text-sky-100 transition group-hover:bg-sky-400/20">
        <span>開始塔羅指引</span>
        <span className="transition-transform group-hover:translate-x-1.5">➜</span>
      </div>
    </Link>
  );
}
