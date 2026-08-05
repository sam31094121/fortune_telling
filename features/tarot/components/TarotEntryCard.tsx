import Link from 'next/link';

export default function TarotEntryCard() {
  return (
    <Link
      href="/tarot"
      className="tarot-entry-card home-feature-launch order-8 w-full relative group overflow-hidden rounded-3xl border border-cyan-300/30 bg-gradient-to-r from-slate-950 via-indigo-950/25 to-slate-950 p-6 text-left shadow-[0_0_30px_rgba(34,211,238,0.16)] transition-all duration-500 hover:border-cyan-200/70 hover:shadow-[0_0_52px_rgba(34,211,238,0.28)] active:scale-[0.99] flex items-center justify-between gap-6 flex-wrap"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_22%,rgba(34,211,238,0.22),transparent_32%),radial-gradient(circle_at_84%_24%,rgba(251,191,36,0.16),transparent_28%),linear-gradient(115deg,transparent,rgba(255,255,255,0.08),transparent)] pointer-events-none" />
      <div className="absolute inset-y-0 right-10 hidden w-40 rotate-6 grid-cols-3 gap-1 opacity-30 sm:grid" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, index) => (
          <span key={index} className="h-16 rounded-[10px] border border-cyan-100/25 bg-slate-950/65 shadow-[inset_0_0_18px_rgba(34,211,238,0.18)]" />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-200/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />

      <div className="relative flex min-w-0 flex-1 items-center gap-4 sm:gap-4.5">
        <div className="tarot-entry-emblem" aria-hidden="true">
          <span className="tarot-entry-emblem__halo" />
          <span className="tarot-entry-emblem__orbit tarot-entry-emblem__orbit--outer" />
          <span className="tarot-entry-emblem__orbit tarot-entry-emblem__orbit--inner" />
          <span className="tarot-entry-emblem__spark tarot-entry-emblem__spark--one">✦</span>
          <span className="tarot-entry-emblem__spark tarot-entry-emblem__spark--two">◆</span>
          <span className="tarot-entry-emblem__card tarot-entry-emblem__card--back">
            <span className="tarot-entry-emblem__line" />
            <span className="tarot-entry-emblem__moon">☾</span>
          </span>
          <span className="tarot-entry-emblem__card tarot-entry-emblem__card--front">
            <span className="tarot-entry-emblem__line" />
            <span className="tarot-entry-emblem__sun">☉</span>
          </span>
          <span className="tarot-entry-emblem__core">T</span>
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-cyan-300/10 border border-cyan-200/25 px-3 py-0.5 text-[10px] font-bold tracking-widest text-cyan-100 uppercase">
            CARD 09 · AI 塔羅牌
          </span>
          <h2 className="mt-1.5 font-serif text-xl sm:text-2xl font-black text-cyan-50 tracking-wide flex items-center gap-2">
            <span>AI 塔羅牌</span>
            <span className="text-xs font-sans text-cyan-100 font-normal opacity-85 hidden sm:inline">
              // 78 張牌庫 · 真洗牌 · 親手抽牌
            </span>
          </h2>
          <p className="mt-1 text-xs text-[color:var(--text-sub)]">
            親手抽牌，AI 依牌陣、正逆位與五元素給出一句判定。
          </p>
        </div>
      </div>

      <div className="home-feature-cta relative flex items-center gap-2 rounded-xl border border-cyan-200/45 bg-cyan-950/30 px-5 py-3 text-xs font-bold text-cyan-50 transition group-hover:bg-cyan-300/20">
        <span>立即開始</span>
        <span className="transition-transform group-hover:translate-x-1.5">➜</span>
      </div>
    </Link>
  );
}