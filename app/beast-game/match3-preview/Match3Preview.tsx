'use client';
/** 五元素寶珠戰「預覽版・非正式玩法」：純前端示範，不接 runOwnedDuel、不動任何數值與正式開關。
 * 10/30 規則：拖曳連珠、普通威力上限 10、4 顆以上魔法珠、剛好 5 顆五珠技、五元素各一張卡充能、每 3 步反擊倒數。 */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BeastCardFace } from '@/components/battlefield/BeastCardTile';
import { DragPathSvg, dragHint, useDragChain } from '@/components/battlefield/useDragChain';
import { PREVIEW_CARDS } from './cards';
import {
  ENEMY_COUNTER_EVERY, ENERGY_MAX, MAGIC_ORB_MIN_LENGTH, NORMAL_POWER_CAP, SKILL5_LENGTH,
  applyEnergy, emptyMagic, energyGains, generateDragBoard, resolveDrag, type Board, type Cell, type MagicGrid,
} from '@/lib/beast-game/match3';

const COLS = 7;
const ROWS = 5;
const ELEMS = ['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH'] as const;
type Elem = (typeof ELEMS)[number];
const LABEL: Record<Elem, string> = { AIR: '風', SPACE: '空', WATER: '水', FIRE: '火', EARTH: '地' };
const COLOR: Record<Elem, string> = { AIR: '#54d9ad', SPACE: '#bd97ff', WATER: '#68b9ff', FIRE: '#ff747a', EARTH: '#efca77' };
/** 每次消除一組就發出的事件（公開格式不變；power／magic／magicPower／skill5 為新增選填欄位）。 */
export interface Match3ClearEvent { element: Elem; count: number; cascadeStep: number; eligible: boolean; power?: number; magic?: boolean; magicPower?: number; skill5?: boolean }
const rng = () => Math.random();
const k = (r: number, c: number) => r * 1000 + c;

export default function Match3Preview() {
  const [board, setBoard] = useState<Board>(() => Array.from({ length: ROWS }, () => Array(COLS).fill('AIR')));
  const [magic, setMagic] = useState<MagicGrid>(() => Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
  const [ready, setReady] = useState(false);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [lastElems, setLastElems] = useState<Elem[]>([]);
  const [flash, setFlash] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState<Set<number>>(new Set());
  const [events, setEvents] = useState<Match3ClearEvent[]>([]);
  const [energy, setEnergy] = useState<Record<Elem, number>>({ AIR: 0, SPACE: 0, WATER: 0, FIRE: 0, EARTH: 0 });
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => { const b = generateDragBoard(rng, ROWS, COLS); setBoard(b); setMagic(emptyMagic(b)); setReady(true); }, []);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of PREVIEW_CARDS) m[c.element] = (m[c.element] ?? 0) + 1;
    return m;
  }, []);
  /** 五元素各一張（從 60 張 .v2 新卡中取每屬性第一張成獸）。 */
  const team = useMemo(() => ELEMS.map((e) => PREVIEW_CARDS.find((c) => c.element === e)).filter(Boolean) as typeof PREVIEW_CARDS, []);
  const untilCounter = ENEMY_COUNTER_EVERY - (moves % ENEMY_COUNTER_EVERY);
  const pushLog = (lines: string[]) => setLog((g) => [...lines, ...g].slice(0, 30));
  const [shortMsg, setShortMsg] = useState('');
  const flashBanner = (t: string) => { setBanner(t); setTimeout(() => setBanner(null), 1400); };

  const release = async (path: Cell[]) => {
    if (busy || !ready) return;
    const res = resolveDrag(board, path, rng, magic);
    if (!res.valid) {
      setShake(new Set(path.map((p) => k(p.r, p.c)))); setTimeout(() => setShake(new Set()), 320);
      const why = `只連了 ${path.length} 顆，至少 3 顆同色相連才會發動`;
      pushLog([why]); setShortMsg(why); setTimeout(() => setShortMsg(''), 1800);
      return;
    }
    setBusy(true);
    const el = res.element as Elem;
    let gained = 0; const entries: string[] = []; const elems = new Set<Elem>();
    let before = board, mag = magic;
    for (const step of res.steps) {
      const cells = new Set<number>(); step.groups.forEach((g) => g.cells.forEach((p) => cells.add(k(p.r, p.c))));
      setBoard(before); setMagic(mag); setFlash(cells);
      await new Promise((r) => setTimeout(r, 280));
      for (const g of step.groups) {
        const ge = g.element as Elem; const pts = g.power * 10 * step.chain; gained += pts; elems.add(ge);
        const ev: Match3ClearEvent = { element: ge, count: g.size, cascadeStep: step.chain, eligible: (counts[ge] ?? 0) > 0, power: g.power,
          ...(g.magic ? { magic: true, magicPower: g.magicPower } : {}), ...(g.skill5 ? { skill5: true } : {}) };
        ((window as unknown as { __match3Events?: unknown[] }).__match3Events ??= []).push(ev);
        console.log('[match3]', ev);
        setEvents((x) => [ev, ...x].slice(0, 20));
        entries.push(`第${step.chain}段：${LABEL[ge]}珠 ${g.size} 顆・威力 ${g.power}${g.magic ? `（含魔法珠 ${g.magicPower}）` : ''} +${pts}`);
      }
      before = step.boardAfter; mag = (step as { magicAfter: MagicGrid }).magicAfter;
      setFlash(new Set());
    }
    setBoard(res.board); setMagic(res.magic);
    const gains = energyGains(res);
    setEnergy((cur) => { const n = { ...cur }; for (const e of ELEMS) n[e] = applyEnergy(cur[e], gains.find((g) => g.element === e)); return n; });
    const m = moves + 1; setMoves(m);
    setScore((s) => s + gained); setLastElems([...elems]);
    const extra: string[] = [];
    if (res.skill5) { extra.push(`五珠技！${LABEL[el]}屬性卡能量集滿`); flashBanner(`五珠技！${LABEL[el]}卡能量集滿`); }
    else if (res.magicSpawn) flashBanner(`生成${LABEL[el]}魔法珠・威力 ${res.magicSpawn.power}`);
    if (res.magicSpawn) extra.push(`生成${LABEL[el]}魔法珠（威力 ${res.magicSpawn.power}）`);
    if (res.magicTriggered.length) extra.push(`引爆魔法珠：${res.magicTriggered.map((t) => LABEL[t.element as Elem] + t.power).join('、')}，對應卡能量集滿`);
    if (res.chainLength > NORMAL_POWER_CAP) extra.push(`連 ${res.chainLength} 顆，普通威力只算 ${NORMAL_POWER_CAP} 顆`);
    if (res.reshuffled) extra.push('沒有可走的步，已重新洗盤');
    if (m % ENEMY_COUNTER_EVERY === 0) { extra.push('敵方反擊！（預覽版不扣血）'); setTimeout(() => flashBanner('敵方反擊！'), res.magicSpawn ? 900 : 0); }
    pushLog([...extra, ...entries]);
    setBusy(false);
  };

  const drag = useDragChain(board, ready && !busy, release);
  const dragEl = drag.path.length ? (board[drag.path[0].r][drag.path[0].c] as Elem) : null;
  const hint = dragEl ? dragHint(drag.path.length, LABEL[dragEl], NORMAL_POWER_CAP, MAGIC_ORB_MIN_LENGTH, SKILL5_LENGTH) : '';
  const onPath = new Set(drag.path.map((p) => k(p.r, p.c)));

  const reset = () => { const b = generateDragBoard(rng, ROWS, COLS); setBoard(b); setMagic(emptyMagic(b)); setScore(0); setMoves(0); setLog([]); setLastElems([]); setEvents([]);
    setEnergy({ AIR: 0, SPACE: 0, WATER: 0, FIRE: 0, EARTH: 0 }); };

  return (
    <main className="mx-auto max-w-6xl px-3 pb-28 pt-4" data-testid="match3-preview">
      <style>{"@keyframes m3pshake{25%{translate:-4px 0}75%{translate:4px 0}}@keyframes m3pglow{50%{box-shadow:0 0 4px 1px #ffd67866}}@keyframes m3phot{50%{background:#e0532c66}}@media(prefers-reduced-motion:reduce){[data-testid=board] *{animation:none!important}}"}</style>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link href="/beast-game" className="inline-flex min-h-[44px] items-center rounded-full border border-slate-600 px-4 text-sm">← 回神獸對戰</Link>
        <h1 className="text-xl font-bold">五元素寶珠戰</h1>
        <span className="rounded-full bg-amber-500/20 px-3 py-1 text-sm font-bold text-amber-300 ring-1 ring-amber-400">預覽版・非正式玩法</span>
      </div>
      <p className="mb-2 min-h-[20px] text-sm font-bold text-amber-200" aria-live="polite" data-testid="last-log">{log[0] ?? ''}</p>
      <p className="mb-3 text-sm text-slate-300">按住一顆珠子，拖過上下左右相鄰的同色珠，放開才發動（至少 3 顆）。連 4 顆以上會在放開的位置生成魔法珠（威力＝顆數），剛好 5 顆觸發五珠技、該屬性卡能量直接集滿。普通威力最多算 10 顆。消哪色就充哪張卡；敵方每 3 步反擊一次。這是示範盤面，不影響正式對戰、不扣也不給任何獎勵。</p>
      <div className="grid gap-4 md:grid-cols-[minmax(0,420px)_1fr]">
        <section>
          <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"><span>分數 <b data-testid="score">{score}</b></span><span>步數 <b>{moves}</b></span>
            <span data-testid="match3-counter" className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ring-1"
              style={{ animation: untilCounter === 1 ? 'm3phot 1s infinite' : undefined, color: untilCounter === 1 ? '#ffd2cf' : undefined, borderColor: '#e0532c' }}>
              {Array.from({ length: ENEMY_COUNTER_EVERY }, (_, i) => <i key={i} className="inline-block h-2.5 w-2.5 rounded-full border border-slate-300" style={{ background: i < moves % ENEMY_COUNTER_EVERY ? '#e0532c' : undefined }} />)}
              {untilCounter === 1 ? '下一步敵方反擊！' : `反擊倒數 ${untilCounter} 步`}
            </span>
            <button onClick={reset} className="ml-auto min-h-[44px] rounded border border-slate-600 px-3">重新洗盤</button></div>
          <p className="mb-1 min-h-[20px] text-center text-sm font-semibold text-amber-100" data-testid="match3-hint" aria-live="polite">{hint || shortMsg || '拖滿 4 顆生成魔法珠，剛好 5 顆觸發五珠技'}</p>
          <div ref={drag.ref} {...drag.handlers} className="relative grid select-none gap-1 rounded-xl bg-slate-900 p-2 ring-1 ring-slate-700"
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0,1fr))`, touchAction: 'none' }} data-testid="board" role="grid" aria-label="寶珠盤面（按住拖曳相鄰同色珠）">
            {board.map((row, r) => row.map((e0, c) => {
              const e = e0 as Elem; const i = k(r, c); const mp = magic[r]?.[c] ?? 0; const on = onPath.has(i);
              return (
                <div key={i} role="gridcell" data-r={r} data-c={c} data-elem={e} data-magic={mp || undefined}
                  aria-label={`${LABEL[e]}${mp ? `魔法珠威力${mp}` : '珠'} 第${r + 1}列第${c + 1}行`}
                  className="relative grid aspect-square min-h-[44px] cursor-grab place-items-center rounded-full text-base font-bold text-slate-900 transition-transform"
                  style={{ background: `radial-gradient(circle at 35% 30%, #fff8, ${COLOR[e]} 55%)`, opacity: flash.has(i) ? 0.25 : ready ? 1 : 0.3,
                    transform: on ? 'scale(1.1)' : flash.has(i) ? 'scale(0.7)' : undefined, animation: shake.has(i) ? 'm3pshake .3s ease' : mp ? 'm3pglow 1.4s infinite' : undefined,
                    outline: on ? '3px solid white' : mp ? '2px solid #ffe3a1' : undefined, boxShadow: mp ? '0 0 12px 3px #ffd678bb' : undefined }}>
                  {LABEL[e]}
                  {mp > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-amber-200 px-1.5 text-[11px] font-extrabold leading-5 text-slate-900 shadow">{mp}</span>}
                </div>
              );
            }))}
            <DragPathSvg points={drag.points} color={dragEl ? COLOR[dragEl] : '#fff'} />
            {banner && <div role="status" data-testid="match3-banner" className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-amber-300 px-4 py-2 text-lg font-extrabold text-slate-900 shadow-xl">{banner}</div>}
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1.5" data-testid="team">
            {team.map((c) => {
              const e = c.element as Elem; const en = energy[e]; const full = en >= ENERGY_MAX;
              return (
                <div key={c.id} data-testid="match3-ally" data-el={e} data-energy={en} className="min-w-0 rounded-lg p-0.5 text-center" style={{ boxShadow: full ? `0 0 0 2px ${COLOR[e]}, 0 0 10px ${COLOR[e]}` : undefined }}>
                  <BeastCardFace card={{ id: c.id, name: c.name, thumbnail: c.art.thumbnail, element: c.element }} />
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded bg-slate-700"><span className="block h-full transition-[width]" style={{ width: `${en}%`, background: COLOR[e] }} /></div>
                  <div className="truncate text-[11px]" style={{ color: COLOR[e] }}>{full ? '能量滿' : `${LABEL[e]} ${en}%`}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {ELEMS.map((e) => <span key={e} className="rounded px-2 py-0.5 text-slate-900" style={{ background: COLOR[e] }}>{LABEL[e]}：{counts[e] ?? 0} 張</span>)}
          </div>
          <details className="mt-3 rounded bg-black/40 p-2 text-xs text-slate-400">
            <summary className="flex min-h-[44px] cursor-pointer items-center">開發者事件（{events.length}）</summary>
            <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all text-[10px] text-emerald-300" data-testid="events">{events.length ? events.map((e) => JSON.stringify(e)).join('\n') : '事件：尚無（window.__match3Events）'}</pre>
          </details>
          <ol className="mt-3 max-h-48 overflow-auto rounded bg-slate-900/70 p-2 text-xs text-slate-300" data-testid="log">
            {log.length ? log.map((l, i) => <li key={i}>{l}</li>) : <li>還沒有消除紀錄</li>}
          </ol>
        </section>
        <section>
          <h2 className="mb-2 font-bold">新卡卡池（{PREVIEW_CARDS.length} 張）{lastElems.length ? `・亮起：${lastElems.map((e) => LABEL[e]).join('、')} 屬性` : ''}</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5" data-testid="gallery">
            {PREVIEW_CARDS.map((c) => {
              const lit = lastElems.includes(c.element as Elem);
              return (
                <div key={c.id} data-card-id={c.id} className="rounded-lg p-0.5" style={{ boxShadow: lit ? `0 0 0 3px ${COLOR[c.element as Elem]}` : undefined, opacity: lastElems.length && !lit ? 0.55 : 1 }}>
                  <BeastCardFace card={{ id: c.id, name: c.name, thumbnail: c.art.thumbnail, element: c.element }} />
                  <div className="mt-0.5 text-center text-xs" style={{ color: COLOR[c.element as Elem] }}>主屬性：{LABEL[c.element as Elem] ?? c.element}</div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
