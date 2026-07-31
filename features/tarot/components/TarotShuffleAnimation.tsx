'use client';

export default function TarotShuffleAnimation() {
  return (
    <section className="fortune-card border-sky-300/25 bg-sky-300/[0.055] p-6 text-center" role="status" aria-live="polite" aria-busy="true">
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-200">SHUFFLING</p>
      <h2 className="mt-3 font-serif text-3xl font-black text-sky-50">正在洗牌</h2>
      <div className="tarot-shuffle-stage mx-auto mt-8 h-48 w-full max-w-xs" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => (
          <span key={index} className={`tarot-shuffle-card tarot-shuffle-card--${index}`} />
        ))}
      </div>
      <p className="mt-5 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
        系統正在整理 78 張牌的牌序與正逆位。下一步會顯示牌背，由你親手選牌，AI 不會代替你抽牌。
      </p>
    </section>
  );
}
