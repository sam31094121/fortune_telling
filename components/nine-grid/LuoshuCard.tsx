'use client';

/**
 * 洛書九宮（古籍版，正本）：結果卡
 * 後端運算、前端只顯示：所有文字都來自 /api/nine-grid 的 study.luoshu（lib/nine-grid-numbers.ts，內容來自技能檔案），
 * 這裡只負責排版、動畫與點選狀態，不組任何結論句子。平常只看得到九宮與數字，點宮位才展開話術與原文。
 * 視覺層（星盤環、羅盤刻字、封印、墨光、光線、引導一句話）在 LuoshuMystic.module.css；引導話術在 lib/i18n-copy/nine-grid-guide.ts。
 */
import { useEffect, useRef, useState } from 'react';
import type { LuoshuStudy } from '@/lib/nine-grid-numbers';
import { NINE_GRID_GUIDE, type NineGridGuideMoment } from '@/lib/i18n-copy/nine-grid-guide';
import gem from './NineGridGem.module.css';
import m from './LuoshuMystic.module.css';
import { luoshuSoundMuted, playLuoshuRustle, setLuoshuSoundMuted, startLuoshuBed, stopLuoshuBed } from './LuoshuAudio';

const STEP_MS = 650;
const WAKE_MS = 220;
const DROP_MS = 250;
const MOTES = [[12, 18, 0], [86, 26, 2.4], [22, 78, 4.1], [74, 84, 1.3], [50, 6, 5.6], [6, 52, 3.2], [94, 60, 6.8]] as const;

export default function LuoshuCard({ luoshu }: { luoshu: LuoshuStudy }) {
  const [digit, setDigit] = useState<number | null>(null);
  const [opened, setOpened] = useState<number[]>([]);
  const [walking, setWalking] = useState(false);
  const [guide, setGuide] = useState<NineGridGuideMoment | null>(luoshu?.birthOverlay ? 'awaken' : null);
  const [dismissed, setDismissed] = useState<NineGridGuideMoment[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 生日數字落宮動畫：順序只取自畫面上的日期字串（純呈現），落完的格數必須等於後端 palace.count，不符就不播 */
  const dropSeq = (luoshu?.birthOverlay?.birthDate ?? '').replace(/\D/g, '').split('').map(Number);
  const dropOk = Boolean(luoshu?.birthOverlay) && Array.isArray(luoshu?.palaces) && luoshu.palaces.every((p) => dropSeq.filter((n) => n === p.digit).length === p.count);
  const [dropped, setDropped] = useState(dropOk ? 0 : dropSeq.length);
  const dropTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropping = dropped < dropSeq.length;
  useEffect(() => {
    if (!dropping) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setDropped(dropSeq.length); return; }
    dropTimer.current = setTimeout(() => setDropped((n) => n + 1), dropped === 0 ? 700 : DROP_MS);
    return () => { if (dropTimer.current) clearTimeout(dropTimer.current); };
  }, [dropped, dropping, dropSeq.length]);
  const skipDrop = () => setDropped(dropSeq.length);
  const [muted, setMuted] = useState(true);
  useEffect(() => { setMuted(luoshuSoundMuted()); startLuoshuBed(); return () => stopLuoshuBed(); }, []);
  useEffect(() => { if (dropping && dropped > 0) playLuoshuRustle(); }, [dropped, dropping]);
  const toggleSound = () => { const next = !muted; setLuoshuSoundMuted(next); setMuted(next); if (!next) startLuoshuBed(); };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { if (opened.length === 9) setGuide('allOpen'); }, [opened.length]);
  if (!luoshu || !Array.isArray(luoshu.layout?.rows) || luoshu.layout.rows.length !== 3 || !luoshu.palaces.every((p) => p.speech && p.story)) return null;

  const palaceOf = (d: number) => luoshu.palaces.find((p) => p.digit === d);
  const selected = digit === null ? undefined : palaceOf(digit);
  const { axes } = luoshu.layout;
  const route = [...luoshu.palaces].sort((a, b) => a.order - b.order).map((p) => p.digit);
  const showGuide = (k: NineGridGuideMoment) => { if (!dismissed.includes(k)) setGuide(k); };
  const guideLine = guide && !dismissed.includes(guide) ? NINE_GRID_GUIDE['zh-TW'][guide] : null;

  const pick = (d: number) => {
    setDigit(d);
    setOpened((list) => (list.includes(d) ? list : [...list, d]));
  };
  const tap = (d: number) => {
    if (dropping) { skipDrop(); return; }
    if (opened.length === 0) showGuide('firstFlip');
    pick(d);
  };

  /** 依宮位順序（檔案裡的 order）一格一格走過去，動畫不影響任何內容 */
  const walk = () => {
    if (walking) return;
    setWalking(true);
    showGuide('pathLit');
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
  const flat = luoshu.layout.rows.flat();
  const lit = route.filter((d) => (palaceOf(d)?.count ?? 0) > 0);
  const RING = 2 * Math.PI * 20;
  const full = opened.length === 9;

  return (
    <section className={`fortune-card ${m.card} overflow-hidden border-amber-300/30 bg-gradient-to-b from-[#241a12]/85 to-[#0d1020]/85 p-4 sm:p-6`} aria-label="洛書九宮古籍版">
      {MOTES.map(([x, y, delay]) => <span key={`${x}-${y}`} aria-hidden="true" className={m.mote} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s` }} />)}
      <button type="button" onClick={toggleSound} aria-pressed={!muted} aria-label={muted ? '開啟聲音' : '關閉聲音'} className="absolute right-2 top-2 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-200/30 bg-black/40 text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke="none" />{muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />}</svg>
      </button>
      <header className="text-center">
        <p className="text-[11px] font-black tracking-[0.3em] text-amber-200/90">{luoshu.role}</p>
        <h2 className="mt-1 font-serif text-2xl font-black tracking-[0.12em] text-amber-50">{luoshu.name}</h2>
        <div className="mx-auto mt-2 h-px w-24 bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
      </header>

      {luoshu.birthOverlay && <p className={`${m.inscribe} mt-3 text-center font-serif text-lg font-black text-amber-50`}>{luoshu.birthOverlay.birthDate}</p>}

      <div className={`${m.stage} ${full ? m.complete : ''} mx-auto mt-5 w-full max-w-[380px]`}>
        <svg viewBox="0 0 200 200" className={m.ring} aria-hidden="true">
          <g className={m.ringSpin} fill="none" stroke="rgba(253,230,138,.35)">
            <circle cx="100" cy="100" r="96" strokeWidth=".6" />
            <circle cx="100" cy="100" r="90" strokeWidth=".4" strokeDasharray="1 3" />
            <circle cx="100" cy="100" r="72" strokeWidth=".3" />
            {Array.from({ length: 8 }, (_, i) => (
              <g key={i} transform={`rotate(${i * 45} 100 100)`}>
                <rect x="94" y="7" width="12" height="1.6" fill="rgba(253,230,138,.4)" stroke="none" />
                <rect x="94" y="10.5" width={i % 2 ? 5 : 12} height="1.6" fill="rgba(253,230,138,.4)" stroke="none" />
                {i % 2 === 1 && <rect x="101" y="10.5" width="5" height="1.6" fill="rgba(253,230,138,.4)" stroke="none" />}
                <line x1="100" y1="18" x2="100" y2="28" strokeWidth=".3" />
              </g>
            ))}
          </g>
        </svg>
        <p className="relative z-[1] text-center"><span className={m.rim}>{axes.top}</span></p>
        <div className="flex items-stretch gap-2">
          <span className="flex items-center"><span className={m.rim}>{axes.left}</span></span>
          <div className={`${m.grid} relative flex-1`}>
            <svg viewBox="0 0 300 300" className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden="true">
              {routeLine.length > 1 && <polyline className={`${m.thread} ${m.threadFlow}`} points={pts} fill="none" stroke="rgba(253,230,138,.9)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="10 4" />}
              {routeLine.length > 1 && routeLine.map((d) => { const { r, c } = posOf(d); return <circle key={d} className={m.node} cx={c * 100 + 50} cy={r * 100 + 50} r="4" fill="#fde68a" />; })}
            </svg>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="洛書九宮">
              {flat.map((d) => {
                const palace = palaceOf(d);
                const active = d === digit;
                const seen = opened.includes(d);
                const wakeAt = dropping || dropOk ? -1 : lit.indexOf(d);
                const shown = dropping ? dropSeq.slice(0, dropped).filter((n) => n === d).length : palace?.count ?? 0;
                const justFilled = dropping && dropped > 0 && dropSeq[dropped - 1] === d;
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={active}
                    onClick={() => tap(d)}
                    style={wakeAt >= 0 && !seen ? { animationDelay: `${400 + wakeAt * WAKE_MS}ms` } : undefined}
                    className={`${gem.tile} ${m.tile} flex min-h-[84px] flex-col items-center justify-center px-1 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${active ? `${gem.gold} ${gem.selected} ring-2 ring-amber-200/90` : seen ? gem.indigo : `${gem.porcelain} ${m.sealed}`} ${seen ? m.reveal : ''} ${wakeAt >= 0 && !seen ? m.wake : ''}`}
                  >
                    <span className="relative z-[1] font-serif text-4xl font-black leading-none">{d}</span>
                    <span className="relative z-[1] mt-1 text-[11px] font-bold tracking-[0.08em] opacity-90">{seen ? palace?.palace : '？'}</span>
                    {seen && palace?.trigram && <span className="relative z-[1] text-[11px] font-bold opacity-80">{palace.trigram}</span>}
                    {palace && shown > 0 && <span key={shown} aria-hidden="true" className={`${justFilled ? m.tick : ''} absolute right-1.5 top-1.5 z-[2] inline-flex h-5 min-w-[20px] items-center justify-center rounded-full border border-amber-200/70 bg-[#14102a] px-1 text-[10px] font-black text-amber-100`}>{shown}</span>}
                    {palace && luoshu.birthOverlay && shown > 0 && <span aria-hidden="true" className="absolute bottom-1.5 z-[2] h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_6px_rgba(253,230,138,0.9)]" />}
                  </button>
                );
              })}
            </div>
            {dropping && dropped > 0 && (() => {
              const n = dropSeq[dropped - 1];
              const at = n === 0 ? null : posOf(n);
              return <span key={dropped} aria-hidden="true" className={`${m.drop} ${n === 0 ? m.dropZero : ''}`} style={at ? { ['--tx' as string]: `${at.c * 33.33 + 16.66}%`, ['--ty' as string]: `${at.r * 33.33 + 16.66}%` } : undefined}>{n}</span>;
            })()}
          </div>
          <span className="flex items-center"><span className={m.rim}>{axes.right}</span></span>
        </div>
        <p className="relative z-[1] text-center"><span className={m.rim}>{axes.bottom}</span></p>
      </div>

      {dropping && (
        <div className="mt-2 flex justify-center">
          <button type="button" onClick={skipDrop} className="min-h-[44px] rounded-full border border-white/20 px-4 text-[12px] font-black text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">略過</button>
        </div>
      )}
      <div className="mt-3 flex items-center justify-center gap-3">
        <span className="relative inline-flex h-12 w-12 items-center justify-center" aria-label="已翻開宮位">
          <svg viewBox="0 0 48 48" className={`${m.progress} absolute inset-0 h-full w-full`} aria-hidden="true">
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(253,230,138,.18)" strokeWidth="3" />
            <circle className={m.progressArc} cx="24" cy="24" r="20" fill="none" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={RING * (1 - opened.length / 9)} />
          </svg>
          <span className="relative text-[11px] font-black text-amber-100">{opened.length} / 9</span>
        </span>
        <button type="button" onClick={walk} disabled={walking} className="min-h-[44px] rounded-full border border-amber-300/60 bg-amber-300/15 px-4 text-[13px] font-black tracking-[0.08em] text-amber-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200">走一遍</button>
      </div>

      {guideLine && guide && (
        <div key={guide} className={`${m.guide} mx-auto mt-3 flex max-w-[420px] items-center gap-2 rounded-xl border border-amber-200/25 bg-black/40 py-1 pl-3 pr-1`} role="status">
          <span aria-hidden="true" className="text-amber-200">✦</span>
          <p className="flex-1 break-words text-[12px] font-semibold leading-5 text-amber-50">{guideLine.text}</p>
          <button type="button" onClick={() => setDismissed((list) => [...list, guide])} aria-label="關閉提示" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">×</button>
        </div>
      )}

      {selected && (
        <article className={`${m.panel} mt-4 rounded-2xl border border-amber-200/25 bg-black/30 p-4`} aria-live="polite">
          <span aria-hidden="true" className={m.notch} style={{ left: `${[22, 50, 78][posOf(selected.digit).c]}%` }} />
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
          <details className="mt-3 rounded-xl border border-amber-200/20 bg-amber-200/[0.04] p-3">
            <summary className="min-h-[44px] cursor-pointer list-none text-xs font-black leading-[44px] text-amber-100">延伸</summary>
            <p className="break-words text-sm font-semibold leading-7 text-amber-50/95">{selected.story.text}</p>
            <p className="text-[10px] font-bold text-amber-100/70">{selected.story.provenanceLabel}</p>
            {selected.scene && (
              <div className="mt-2 rounded-lg border border-white/10 bg-black/25 p-2">
                <p className="break-words font-serif text-[13px] font-semibold leading-6 text-amber-100">{selected.scene.text}</p>
                <p className="text-[10px] font-bold text-amber-100/70">{selected.scene.pageRef}</p>
              </div>
            )}
          </details>
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
          {[...(luoshu.birthOverlay ? [{ text: luoshu.birthOverlay.summary, provenanceLabel: '' }] : []), { text: luoshu.yaoNote, provenanceLabel: '' }, ...luoshu.intro, luoshu.layout.note, luoshu.layout.mirrorNote, luoshu.layout.sumRule, luoshu.orderNote, ...luoshu.crossCheck].map((item) => (
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
