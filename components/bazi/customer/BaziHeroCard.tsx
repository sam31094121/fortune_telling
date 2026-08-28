'use client';

import type { BaziCustomerView } from './adapter';
import { FourPillarsCard } from './FourPillarsCard';
import { FiveElementOrbit } from './FiveElementOrbit';

/**
 * LEVEL 1｜八字命工卡（手機第一屏）
 * 只顯示：姓名、出生摘要、日主、四柱、五行主調、一句主題、一個 CTA。
 * 3 秒內知道日主與核心主題。
 */
export function BaziHeroCard({ view, elementOf }: {
  view: BaziCustomerView;
  elementOf: (stem: string) => string | undefined;
}) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-[linear-gradient(165deg,rgba(16,16,20,0.96),rgba(24,22,18,0.92))] p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black tracking-[0.2em] text-white/40">易經八字命盤</p>
          <h2 className="mt-1 truncate font-serif text-2xl font-black text-[color:var(--text-main)] sm:text-3xl">{view.name || '我的八字'}</h2>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-bold text-white/40">日主</p>
          <p className="font-serif text-3xl font-black leading-none text-amber-100">{view.dayMaster.stem}{view.dayMaster.element}</p>
        </div>
      </div>
      <p className="mt-2 text-sm font-semibold text-white/50">{view.birthSummary}</p>

      <div className="mt-5">
        <FourPillarsCard pillars={view.pillars} hourUnknown={view.hourUnknown} elementOf={elementOf} />
      </div>

      <div className="mt-5">
        <p className="mb-2.5 text-sm font-black text-white/55">固定五行星體</p>
        <FiveElementOrbit view={view.fiveElementOrbit} evidence={view.elementEvidence} />
      </div>
    </section>
  );
}
