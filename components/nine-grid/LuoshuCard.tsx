'use client';

/**
 * 洛書九宮（古籍版，正本）：結果卡
 * 後端運算、前端只顯示：所有文字都來自 /api/nine-grid 的 study.luoshu（lib/nine-grid-numbers.ts，內容來自技能檔案），
 * 這裡只負責排版、動畫與點選狀態，不組任何結論句子。平常只看得到九宮與數字，點宮位才展開話術與原文。
 */
import { useEffect, useRef, useState } from 'react';
import type { LuoshuStudy } from '@/lib/nine-grid-numbers';
import gem from './NineGridGem.module.css';

const STEP_MS = 650;

export default function LuoshuCard({ luoshu }: { luoshu: LuoshuStudy }) {
  const [digit, setDigit] = useState<number | null>(null);
  const [opened, setOpened] = useState<number[]>([]);
  const [walking, setWalking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  if (!luoshu || !Array.isArray(luoshu.layout?.rows) || luoshu.layout.rows.length !== 3) return null;

  const palaceOf = (d: number) => luoshu.palaces.find((p) => p.digit === d);
  const selected = digit === null ? undefined : palaceOf(digit);
  const { axes } = luoshu.layout;
  const route = [...luoshu.palaces].sort((a, b) => a.order - b.order).map((p) => p.digit);

  const pick = (d: number) => {
    setDigit(d);
    setOpened((list) => (list.includes(d) ? list : [...list, d]));
  };

  /** 依宮位順序（檔案裡的 order）一格一格走過去，動畫不影響任何內容 */
  const walk = () => {
    if (walking) return;
    setWalking(true);
    let i = 0;
    const step = () => {
      pick(route[i]);
      i += 1;
      if (i < route.length) timer.current = setTimeout(step, STEP_MS);
      else timer.current = setTimeout(() => setWalking(false), STEP_MS);
    };
    step();
  };

  const posOf = (d: number) => {
    const r = luoshu.layout.rows.findIndex((row) => row.includes(d));
    return { r, c: luoshu.layout.rows[r].indexOf(d) };
  };
  const routeLine = route.slice(0, Math.max(0, route.indexOf(digit ?? -1) + 1));
  const pts = routeLine.map((d) => { const { r, c } = posOf(d); return `${c * 100 + 50},${r * 100 + 50}`; }).join(' ');

  return (
    <section className="fortune-card overflow-hidden border-amber-300/30 bg-gradient-to-b from-[#241a12]/85 to-[#0d1020]/85 p-4 sm:p-6" aria-label="洛書九宮古籍版">
      <header className="text-center">
        <p className="text-[11px] font-black tracking-[0.3em] text-amber-200/90">{luoshu.role}</p>
        <h2 className="mt-1 font-serif text-2xl font-black tracking-[0.12em] text-amber-50">{luoshu.name}</h2>
        <div className="mx-auto mt-2 h-px w-24 bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
      </header>

      <div className="mx-auto mt-5 w-full max-w-[380px]">
        <p className="text-center text-[11px] font-black text-amber-200/90">{axes.top}</p>
        <div className="flex items-stretch gap-2">
          <span className="flex items-center text-[11px] font-black text-amber-200/90">{axes.left}</span>
          <div className="relative flex-1">
            <svg viewBox="0 0 300 300" className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden="true">
              {routeLine.length > 1 && <polyline points={pts} fill="none" stroke="rgba(253,230,138,.85)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 6" />}
            </svg>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="洛書九宮">
              {luoshu.layout.rows.flat().map((d) => {
                const palace = palaceOf(d);
                const active = d === digit;
                const seen = opened.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={active}
                    onClick={() => pick(d)}
                    className={`${gem.tile} flex min-h-[84px] flex-col items-center justify-center px-1 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${active ? `${gem.gold} ${gem.selected} ring-2 ring-amber-200/90` : seen ? gem.indigo : gem.porcelain}`}
                  >
                    <span className="font-serif text-4xl font-black leading-none">{d}</span>
                    <span className="mt-1 text-[11px] font-bold tracking-[0.08em] opacity-90">{seen ? palace?.palace : '？'}</span>
                    {seen && palace?.trigram && <span className="text-[11px] font-bold opacity-80">{palace.trigram}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <span className="flex items-center text-[11px] font-black text-amber-200/90">{axes.right}</span>
        </div>
        <p className="text-center text-[11px] font-black text-amber-200/90">{axes.bottom}</p>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <span className="text-[12px] font-black tracking-[0.1em] text-amber-100" aria-label="已翻開宮位">{opened.length} / 9</span>
        <button type="button" onClick={walk} disabled={walking} className="min-h-[44px] rounded-full border border-amber-300/60 bg-amber-300/15 px-4 text-[13px] font-black tracking-[0.08em] text-amber-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200">走一遍</button>
      </div>

      {selected && (
        <article className="mt-4 rounded-2xl border border-amber-200/25 bg-black/30 p-4" aria-live="polite">
          <p className="text-[11px] font-black tracking-[0.2em] text-amber-200/90">{selected.digit}　{selected.palace}{selected.trigram ? `　${selected.trigram}` : ''}</p>
          {selected.yao && (
            <svg viewBox="0 0 60 48" className="mx-auto mt-3 h-14 w-[70px]" role="img" aria-label={selected.trigram ?? ''}>
              {[...selected.yao].reverse().map((line, i) => (
                line === 1
                  ? <rect key={i} x="4" y={6 + i * 16} width="52" height="7" rx="3.5" fill="#f2cf7a" />
                  : <g key={i}><rect x="4" y={6 + i * 16} width="22" height="7" rx="3.5" fill="#8fb4ff" /><rect x="34" y={6 + i * 16} width="22" height="7" rx="3.5" fill="#8fb4ff" /></g>
              ))}
            </svg>
          )}
          <p className="mt-2 break-words text-sm font-semibold leading-7 text-amber-50/95">{selected.speech.text}</p>
          <p className="text-[10px] font-bold text-amber-100/70">{selected.speech.provenanceLabel}</p>
          <details className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
            <summary className="min-h-[44px] cursor-pointer list-none text-xs font-black leading-[44px] text-amber-100">原文</summary>
            {selected.image && (
              <div className="mt-2">
                <p className="break-words font-serif text-[13px] font-semibold leading-6 text-amber-100">{selected.image.text}</p>
                <p className="text-[10px] font-bold text-amber-100/70">{selected.image.pageRef}</p>
              </div>
            )}
            {[selected.nature, selected.natureNote, selected.direction, selected.directionNote].map((item) => item && (
              <div key={item.text} className="mt-2">
                <p className="break-words text-[12px] font-semibold leading-6 text-amber-50/90">{item.text}</p>
                <p className="text-[10px] font-bold text-amber-100/70">{item.provenanceLabel}</p>
              </div>
            ))}
          </details>
        </article>
      )}

      <details className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3">
        <summary className="min-h-[44px] cursor-pointer list-none text-xs font-black leading-[44px] text-amber-100">排法說明</summary>
        <div className="space-y-2">
          {[{ text: luoshu.yaoNote, provenanceLabel: '' }, ...luoshu.intro, luoshu.layout.note, luoshu.layout.mirrorNote, luoshu.layout.sumRule, luoshu.orderNote, ...luoshu.crossCheck].map((item) => (
            <div key={item.text}>
              <p className="break-words text-[11px] font-semibold leading-5 text-amber-50/85">{item.text}</p>
              <p className="text-[10px] font-bold text-amber-100/70">{item.provenanceLabel}</p>
            </div>
          ))}
        </div>
      </details>

      <details className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3">
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
