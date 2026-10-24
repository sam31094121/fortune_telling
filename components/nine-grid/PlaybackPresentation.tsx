'use client';
import { useEffect, useRef } from 'react';
import type { PlaybackGuide } from '@/lib/nine-grid-playback';
import type { useDropPlayback } from './useDropPlayback';
import m from './LuoshuMystic.module.css';
type Player = ReturnType<typeof useDropPlayback>;
const button = 'min-h-[44px] rounded-xl border border-white/30 px-3 text-xs font-bold text-white disabled:opacity-40';
export function PlaybackControls({ player, done, onPosition }: { player: Player; done: boolean; onPosition: () => void }) {
  return <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="播放方式">
    <button type="button" className={`${button} aria-pressed:border-amber-200 aria-pressed:bg-amber-200/20`} aria-pressed={player.mode === 'auto'} onClick={() => { player.setMode('auto'); onPosition(); }}>自動播放</button>
    <button type="button" className={`${button} aria-pressed:border-amber-200 aria-pressed:bg-amber-200/20`} aria-pressed={player.mode === 'manual'} onClick={() => { player.setMode('manual'); onPosition(); }}>逐步看</button>
    {player.mode === 'manual' && <button type="button" className={button} disabled={done || player.manualRunning} onClick={() => { player.next(); onPosition(); }}>下一步</button>}
    {(player.mode === 'auto' || player.manualRunning) && !done && <button type="button" className={button} onClick={() => { player.setPaused(!player.paused); onPosition(); }}>{player.paused ? '繼續' : '暫停'}</button>}
    <p className="w-full text-[11px] text-violet-100/80">點選宮位可回看來源</p>
  </div>;
}
export function PlaybackResult({ guide }: { guide: PlaybackGuide }) {
  return <section className={m.summaryPanel} aria-label="完整結果卡">
    <h3 className="mb-2 text-sm font-black text-amber-100">本次數字結果</h3>
    <dl className="grid gap-2">{guide.result?.rows.map((row) => <div key={row.label}><dt className="font-bold text-violet-100">{row.label}</dt><dd className="text-white">{row.value}</dd></div>)}</dl>
    <p className="mt-2 text-violet-100/80">{guide.result?.note ?? '暫時無法取得'}</p>
  </section>;
}
export function PlaybackSource({ guide, digit, onClose }: { guide?: PlaybackGuide; digit: number; onClose: () => void }) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => panel.current?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    return () => cancelAnimationFrame(frame);
  }, [digit]);
  const detail = guide?.details?.find((item) => item.digit === digit);
  return <section ref={panel} className={`${m.summaryPanel} scroll-mt-3`} aria-label="宮位來源回看" aria-live="polite">
    <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-black text-amber-100">{detail?.title ?? '暫時無法取得'}</h3><button type="button" className={button} onClick={onClose}>關閉來源</button></div>
    {detail && <><p className="my-2 font-bold text-white">{detail.calculation}</p><p>{detail.status}</p>{detail.sources.map((group) => <div key={group.title} className="mt-3"><h4 className="font-bold text-violet-100">{group.title}</h4>{group.steps.length ? <ul className="mt-1 space-y-2">{group.steps.map((step, i) => <li key={i} className="break-words text-white">{step}</li>)}</ul> : <p>{group.empty}</p>}</div>)}</>}
  </section>;
}
