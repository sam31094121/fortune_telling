'use client';

import type { AsuraFusion } from '@/lib/nine-grid-asura-fusion';

/*
  阿修羅九宮融會：只照印後端 /api/nine-grid 回傳的 asuraFusion。
  這裡不運算、不改寫、不補句；順序與內容完全由後端決定（根→盤→合→位→名→斷）。
  規格：docs/技能戰鬥檔案/鬼魅阿修羅/九宮融會.md
*/
export default function AsuraFusionCard({ fusion }: { fusion: AsuraFusion }) {
  // 瀏覽器可能留著舊版格式的結果：格式不符就不顯示，不讓整頁當掉
  if (!fusion || !Array.isArray(fusion.steps) || fusion.steps.length === 0) return null;

  return (
    <section
      aria-label="阿修羅九宮融會"
      className="rounded-2xl border border-violet-300/30 bg-gradient-to-b from-violet-950/60 to-black/60 px-4 py-5 text-left shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
    >
      <h2 className="text-center font-serif text-xl font-black tracking-[0.08em] text-violet-100">阿修羅九宮融會</h2>
      <p className="mt-1 text-center text-sm font-semibold leading-6 text-violet-200/80">{fusion.label}</p>

      <ol className="mt-4 space-y-3">
        {fusion.steps.map((step) => (
          <li
            key={step.key}
            data-fusion-step={step.key}
            className="rounded-xl border border-violet-200/15 bg-black/30 px-3 py-3"
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-300/50 font-serif text-lg font-black text-amber-200"
              >
                {step.mark}
              </span>
              <h3 className="min-w-0 break-words text-base font-black text-amber-100">{step.title}</h3>
            </div>

            {step.asura.map((line, index) => (
              <p key={index} className="mt-2 break-words text-base font-bold leading-7 text-violet-50">{line}</p>
            ))}

            {step.facts.length > 0 && (
              <ul className="mt-2 space-y-1">
                {step.facts.map((fact, index) => (
                  <li key={index} className="break-words text-sm font-semibold leading-6 text-slate-300">{fact}</li>
                ))}
              </ul>
            )}

            {step.sources.map((source, index) => (
              <blockquote key={index} className="mt-2 border-l-2 border-amber-300/40 pl-3">
                <p className="break-words text-sm font-medium leading-6 text-slate-100">{source.text}</p>
                <footer className="mt-1 break-words text-sm leading-5 text-slate-400">{source.provenanceLabel}</footer>
              </blockquote>
            ))}
          </li>
        ))}
      </ol>
    </section>
  );
}
