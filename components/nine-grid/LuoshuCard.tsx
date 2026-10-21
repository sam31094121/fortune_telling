'use client';

/**
 * 洛書九宮（古籍版，正本）：結果卡
 * 後端運算、前端只顯示：所有文字都來自 /api/nine-grid 的 study.luoshu（lib/nine-grid-numbers.ts，內容來自技能檔案），
 * 這裡只負責排版與選取狀態，不組任何結論句子。
 */
import { useState } from 'react';
import type { LuoshuStudy } from '@/lib/nine-grid-numbers';
import gem from './NineGridGem.module.css';

export default function LuoshuCard({ luoshu }: { luoshu: LuoshuStudy }) {
  const [digit, setDigit] = useState(5);
  if (!luoshu || !Array.isArray(luoshu.layout?.rows) || luoshu.layout.rows.length !== 3) return null;
  const palaceOf = (d: number) => luoshu.palaces.find((p) => p.digit === d);
  const selected = palaceOf(digit);
  const { axes } = luoshu.layout;

  return (
    <section className="fortune-card overflow-hidden border-amber-300/30 bg-gradient-to-b from-[#241a12]/85 to-[#0d1020]/85 p-4 sm:p-6" aria-label="洛書九宮古籍版">
      <header className="text-center">
        <p className="text-[11px] font-black tracking-[0.3em] text-amber-200/90">{luoshu.role}</p>
        <h2 className="mt-1 font-serif text-2xl font-black tracking-[0.12em] text-amber-50">{luoshu.name}</h2>
        <div className="mx-auto mt-2 h-px w-24 bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
      </header>

      <div className="mt-3 space-y-1.5">
        {luoshu.intro.map((item) => (
          <div key={item.text}>
            <p className="break-words text-xs font-semibold leading-6 text-amber-50/95">{item.text}</p>
            <p className="text-[10px] font-bold text-amber-100/70">{item.provenanceLabel}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-5 w-full max-w-[380px]">
        <p className="text-center text-[11px] font-black text-amber-200/90">{axes.top}</p>
        <div className="flex items-stretch gap-2">
          <span className="flex items-center text-[11px] font-black text-amber-200/90">{axes.left}</span>
          <div className="grid flex-1 grid-cols-3 gap-2" role="group" aria-label="洛書九宮">
            {luoshu.layout.rows.flat().map((d) => {
              const palace = palaceOf(d);
              const active = d === digit;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDigit(d)}
                  className={`${gem.tile} flex min-h-[84px] flex-col items-center justify-center px-1 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${active ? `${gem.gold} ${gem.selected} ring-2 ring-amber-200/90` : gem.indigo}`}
                >
                  <span className="font-serif text-4xl font-black leading-none text-amber-50">{d}</span>
                  <span className="mt-1 text-[11px] font-bold tracking-[0.08em] text-amber-100/90">{palace?.palace}</span>
                  {palace?.trigram && <span className="text-[11px] font-bold text-violet-100/80">{palace.trigram}</span>}
                </button>
              );
            })}
          </div>
          <span className="flex items-center text-[11px] font-black text-amber-200/90">{axes.right}</span>
        </div>
        <p className="text-center text-[11px] font-black text-amber-200/90">{axes.bottom}</p>
      </div>

      {selected && (
        <article className="mt-4 rounded-2xl border border-amber-200/25 bg-black/30 p-4" aria-live="polite">
          <p className="text-[11px] font-black tracking-[0.2em] text-amber-200/90">{selected.digit}　{selected.palace}{selected.trigram ? `　${selected.trigram}` : ''}</p>
          {[selected.nature, selected.natureNote, selected.direction, selected.directionNote].map((item) => item && (
            <div key={item.text} className="mt-2">
              <p className="break-words text-sm font-semibold leading-7 text-amber-50/95">{item.text}</p>
              <p className="text-[10px] font-bold text-amber-100/70">{item.provenanceLabel}</p>
            </div>
          ))}
        </article>
      )}

      <div className="mt-4 space-y-2">
        {[luoshu.layout.note, luoshu.layout.mirrorNote, luoshu.layout.sumRule, luoshu.orderNote, ...luoshu.crossCheck].map((item) => (
          <div key={item.text}>
            <p className="break-words text-[11px] font-semibold leading-5 text-amber-50/85">{item.text}</p>
            <p className="text-[10px] font-bold text-amber-100/70">{item.provenanceLabel}</p>
          </div>
        ))}
      </div>

      <details className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-3">
        <summary className="min-h-[44px] cursor-pointer list-none text-xs font-black leading-6 text-amber-50">
          <span className="mr-2 inline-block rounded-full border border-amber-200/40 bg-amber-200/10 px-2 py-0.5 text-[10px] font-black text-amber-100">古籍</span>
          {luoshu.credibility.headline}
        </summary>
        <ul className="mt-2 space-y-2">
          {luoshu.classics.map((c) => (
            <li key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="text-[11px] font-black text-amber-50">{c.title}</p>
              <p className="mt-0.5 break-words font-serif text-[12px] font-semibold leading-6 text-amber-100">{c.quote}</p>
              {c.annotation && <p className="break-words text-[11px] font-semibold leading-5 text-violet-100/80">{c.annotation}</p>}
              <p className="mt-0.5 break-words text-[10.5px] font-bold text-amber-100/80">{c.pageRef}</p>
              <p className="mt-1 break-words text-[11px] font-semibold leading-5 text-violet-100/85">{c.gloss.text}</p>
              <p className="text-[10px] font-bold text-amber-100/70">{c.gloss.provenanceLabel}</p>
            </li>
          ))}
        </ul>
        <ul className="mt-3 space-y-1.5">
          {luoshu.credibility.lines.map((line) => (
            <li key={line} className="break-words text-[11px] font-semibold leading-5 text-violet-100/80">{line}</li>
          ))}
        </ul>
        <ul className="mt-3 space-y-2">
          {luoshu.evidence.map((item) => (
            <li key={item.topic} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="text-[11px] font-black text-amber-50">{item.topic}</p>
              <p className="mt-0.5 break-words text-[11px] font-semibold leading-5 text-violet-100/85">{item.basis}</p>
              <p className="mt-1 text-[10.5px] font-bold text-amber-100/80">{item.provenanceLabel}</p>
            </li>
          ))}
        </ul>
        <ul className="mt-3 space-y-2">
          {luoshu.credibility.sources.map((source) => (
            <li key={source.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="break-words text-[11px] font-black leading-5 text-amber-50">{source.label}<span className="ml-2 rounded border border-white/15 px-1 text-[10px] text-amber-100">{source.trust} 級</span></p>
              <p className="mt-0.5 break-words text-[10.5px] font-semibold leading-5 text-violet-200/70">{source.citation}</p>
            </li>
          ))}
        </ul>
        <ul className="mt-3 space-y-1.5">
          {luoshu.notAdopted.map((item) => (
            <li key={item.item} className="break-words text-[11px] font-semibold leading-5 text-violet-100/70">{item.item}　{item.reason}</li>
          ))}
        </ul>
        <p className="mt-2 break-words text-[10.5px] font-semibold text-violet-200/70">{luoshu.verifiedAt}　{luoshu.verifiedHow}</p>
      </details>
    </section>
  );
}
