'use client';

/**
 * 九宮格靈動數字：九宮格卡片（結果）
 * 後端運算、前端只顯示：所有解說、算出來的事實與來源說明都來自 /api/nine-grid 的 study
 * （lib/nine-grid-numbers.ts，解說全部來自技能檔案），這裡只負責排版、配色、連線畫面與選取狀態，不組任何結論句子。
 */
import { useId, useState } from 'react';
import type { NineGridStudy } from '@/lib/nine-grid-numbers';
import LuoshuCard from './LuoshuCard';
import FiveStarLink, { ELEMENT_GEM } from './FiveStarLink';
import gem from './NineGridGem.module.css';

const CELL = 100;

type Selection = { kind: 'digit'; digit: number } | { kind: 'line'; id: string };

function cellCenter(study: NineGridStudy, digit: number) {
  const cell = study.cells.find((item) => item.digit === digit);
  return cell ? { x: cell.col * CELL + CELL / 2, y: cell.row * CELL + CELL / 2 } : { x: 150, y: 150 };
}

function levelClass(count: number) {
  if (count === 0) return gem.porcelain;
  if (count === 1) return gem.indigo;
  if (count === 2) return gem.gold;
  return gem.ruby;
}

export default function NineGridCard({ study }: { study: NineGridStudy }) {
  const uid = useId().replace(/:/g, '');
  const firstDigit = study?.summary?.dominant?.[0] ?? 1;
  const [edition, setEdition] = useState<'luoshu' | 'shengming'>('luoshu');
  const [selection, setSelection] = useState<Selection>({ kind: 'digit', digit: firstDigit });
  // 瀏覽器可能留著舊版格式的結果：格式不符就不顯示，不讓整頁當掉
  const compatible = study?.ruleVersion === 'nine-grid-v2' && Array.isArray(study.cells) && study.cells.length === 9 && Array.isArray(study.digits) && Array.isArray(study.lines) && Boolean(study.credibility);
  if (!compatible) return null;

  const selectedDigit = selection.kind === 'digit' ? study.digits.find((item) => item.digit === selection.digit) : undefined;
  const selectedLine = selection.kind === 'line' ? study.lines.find((item) => item.id === selection.id) : undefined;
  const litLines = study.lines.filter((line) => line.lit);

  const tabs = [{ id: 'luoshu' as const, label: '洛書九宮・古籍版' }, { id: 'shengming' as const, label: '生命靈數' }];
  const tabBar = (
    <div className="mb-3 flex flex-wrap justify-center gap-2" role="tablist" aria-label="版本">
      {tabs.map((tab) => (
        <button key={tab.id} type="button" role="tab" aria-selected={edition === tab.id} onClick={() => setEdition(tab.id)} className={`min-h-[44px] rounded-full border px-4 text-[13px] font-black tracking-[0.06em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${edition === tab.id ? 'border-amber-200/80 bg-amber-300/20 text-amber-50' : 'border-white/20 bg-white/[0.03] text-white/60'}`}>{tab.label}</button>
      ))}
    </div>
  );
  if (edition === 'luoshu' && study.luoshu) return <div>{tabBar}<LuoshuCard luoshu={study.luoshu} /></div>;

  return (
    <div>
    {tabBar}
    <section className="fortune-card overflow-hidden border-violet-300/25 bg-gradient-to-b from-[#1a1530]/85 to-[#0d1020]/85 p-4 sm:p-6" aria-label="九宮格靈動數字結果">
      <style>{`
        @keyframes ${uid}-flow { to { stroke-dashoffset: -24; } }
        @keyframes ${uid}-breath { 0%,100% { opacity: .75; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: no-preference) {
          .${uid}-flow { animation: ${uid}-flow 1.8s linear infinite; }
          .${uid}-breath { animation: ${uid}-breath 3s ease-in-out infinite; }
        }
      `}</style>

      <header className="text-center">
        <p className="text-[11px] font-black tracking-[0.3em] text-amber-200/90">{study.input.label}</p>
        <h2 className="mt-1 font-serif text-2xl font-black tracking-[0.12em] text-violet-50">{study.input.birthDate}</h2>
        <div className="mx-auto mt-2 h-px w-24 bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
      </header>

      <div className="relative mx-auto mt-5 w-full max-w-[380px]">
        <div className="relative z-10 grid aspect-square grid-cols-3 gap-2 sm:gap-3" role="group" aria-label="九宮格">
          {study.cells.map((cell) => {
            const active = selection.kind === 'digit' && selection.digit === cell.digit;
            const reading = study.digits.find((item) => item.digit === cell.digit);
            return (
              <button
                key={cell.digit}
                type="button"
                aria-pressed={active}
                aria-label={reading ? `${cell.title} ${cell.digit} ${reading.countNote}` : String(cell.digit)}
                onClick={() => setSelection({ kind: 'digit', digit: cell.digit })}
                className={`${gem.tile} relative flex min-h-[84px] flex-col items-center justify-center px-1 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${levelClass(cell.count)} ${active ? `${gem.selected} ring-2 ring-amber-200/90` : ''} ${cell.count > 0 ? `${uid}-breath` : ''}`}
              >
                <span className="font-serif text-4xl font-black leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)] sm:text-5xl">{cell.digit}</span>
                <span className="mt-1 text-[11px] font-bold tracking-[0.1em] opacity-90">{cell.title}</span>
                {cell.count > 0 && (
                  <span className="mt-1 flex flex-wrap items-center justify-center gap-0.5" aria-hidden="true">
                    {Array.from({ length: Math.min(cell.count, 6) }).map((_, index) => (
                      <span key={index} className="inline-block h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_6px_rgba(253,230,138,0.9)]" />
                    ))}
                  </span>
                )}
                {study.fiveStar && (
                  <span aria-hidden="true" className="absolute bottom-1.5 left-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: ELEMENT_GEM[study.fiveStar.elementOfDigit[cell.digit]].light, boxShadow: `0 0 8px ${ELEMENT_GEM[study.fiveStar.elementOfDigit[cell.digit]].glow}` }} />
                )}
                {cell.count > 0 && (
                  <span aria-hidden="true" className="absolute right-1.5 top-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full border border-amber-200/70 bg-[#14102a] px-1 text-[10px] font-black text-amber-100">{cell.count}</span>
                )}
              </button>
            );
          })}
        </div>

        <svg viewBox="0 0 300 300" className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {litLines.map((line) => {
            const a = cellCenter(study, line.digits[0]);
            const b = cellCenter(study, line.digits[2]);
            const chosen = selection.kind === 'line' && selection.id === line.id;
            return (
              <g key={line.id}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(253,230,138,.22)" strokeWidth={chosen ? 14 : 9} strokeLinecap="round" />
                <line
                  className={`${uid}-flow`}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={chosen ? '#ffffff' : `url(#${uid}-gold)`}
                  strokeWidth={chosen ? 5 : 3.2}
                  strokeLinecap="round"
                  strokeDasharray="10 8"
                  filter={`url(#${uid}-glow)`}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <p className="mx-auto mt-4 max-w-[420px] break-words text-center text-xs font-bold leading-6 text-violet-100">{study.summary.text}</p>

      <div className="mt-4 flex flex-wrap justify-center gap-2" role="group" aria-label="靈動連線">
        {study.lines.map((line) => {
          const chosen = selection.kind === 'line' && selection.id === line.id;
          return (
            <button
              key={line.id}
              type="button"
              aria-pressed={chosen}
              onClick={() => setSelection({ kind: 'line', id: line.id })}
              className={`min-h-[44px] rounded-full border px-3.5 py-1.5 text-[12px] font-black tracking-[0.06em] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${line.lit ? 'border-amber-300/70 bg-amber-300/15 text-amber-50 shadow-[0_0_14px_rgba(251,191,36,0.3)]' : 'border-dashed border-white/20 bg-white/[0.03] text-white/45'} ${chosen ? 'ring-2 ring-amber-200/90' : ''}`}
            >
              {line.digits.join('-')}　{line.name}
            </button>
          );
        })}
      </div>

      <article className="mt-4 rounded-2xl border border-violet-200/25 bg-gradient-to-br from-violet-400/10 to-black/40 p-4" aria-live="polite">
        {selectedDigit && (
          <>
            <p className="text-[11px] font-black tracking-[0.2em] text-amber-200/90">{selectedDigit.title}　{selectedDigit.keywords}</p>
            <p className="mt-1 break-words text-sm font-black leading-7 text-violet-50">{selectedDigit.countNote}</p>
            <p className="mt-2 break-words text-sm font-semibold leading-7 text-violet-50/95">{selectedDigit.trait}</p>
            <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
              <p className="text-[11px] font-black text-amber-200/90">小提醒</p>
              <p className="mt-1 break-words text-xs font-semibold leading-6 text-violet-100/90">{selectedDigit.caution}</p>
            </div>
            <p className="mt-2 text-[10px] font-bold text-amber-100/70">{selectedDigit.provenanceLabel}</p>
          </>
        )}
        {selectedLine && (
          <>
            <p className="text-[11px] font-black tracking-[0.2em] text-amber-200/90">{selectedLine.digits.join('-')}　{selectedLine.name}</p>
            <p className="mt-1 break-words text-sm font-black leading-7 text-violet-50">{selectedLine.fact}</p>
            <p className="mt-2 break-words text-sm font-semibold leading-7 text-violet-50/95">{selectedLine.text}</p>
            <p className="mt-2 text-[10px] font-bold text-amber-100/70">{selectedLine.provenanceLabel}</p>
          </>
        )}
      </article>

      <div className="mt-4 space-y-2">
        <div>
          <p className="break-words text-[11px] font-semibold leading-5 text-violet-100/85">{study.reading.countRule.text}</p>
          <p className="text-[10px] font-bold text-amber-100/70">{study.reading.countRule.provenanceLabel}</p>
        </div>
        <div>
          <p className="break-words text-[11px] font-semibold leading-5 text-violet-100/85">{study.reading.lineRule.text}</p>
          <p className="text-[10px] font-bold text-amber-100/70">{study.reading.lineRule.provenanceLabel}</p>
        </div>
        <div>
          <p className="break-words text-[11px] font-semibold leading-5 text-violet-100/85">{study.layout.note.text}</p>
          <p className="text-[10px] font-bold text-amber-100/70">{study.layout.note.provenanceLabel}</p>
        </div>
      </div>

      {study.fiveStar && <FiveStarLink fiveStar={study.fiveStar} />}

      <details className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-3">
        <summary className="min-h-[44px] cursor-pointer list-none text-xs font-black leading-6 text-violet-100">
          <span className="mr-2 inline-block rounded-full border border-amber-200/40 bg-amber-200/10 px-2 py-0.5 text-[10px] font-black text-amber-100">來源</span>
          {study.credibility.headline}
        </summary>
        <ul className="mt-2 space-y-1.5">
          {study.credibility.lines.map((line) => (
            <li key={line} className="break-words text-[11px] font-semibold leading-5 text-violet-100/80">{line}</li>
          ))}
        </ul>
        <ul className="mt-3 space-y-2">
          {study.evidence.map((item) => (
            <li key={item.topic} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="text-[11px] font-black text-violet-50">{item.topic}</p>
              <p className="mt-0.5 break-words text-[11px] font-semibold leading-5 text-violet-100/85">{item.basis}</p>
              <p className="mt-1 text-[10.5px] font-bold text-amber-100/80">{item.provenanceLabel}</p>
            </li>
          ))}
        </ul>
        <ul className="mt-3 space-y-2">
          {study.credibility.sources.map((source) => (
            <li key={source.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="break-words text-[11px] font-black leading-5 text-violet-50">{source.label}<span className="ml-2 rounded border border-white/15 px-1 text-[10px] text-amber-100">{source.trust} 級</span></p>
              <p className="mt-0.5 break-words text-[10.5px] font-semibold leading-5 text-violet-200/70">{source.citation}</p>
            </li>
          ))}
        </ul>
      </details>
    </section>
    </div>
  );
}
