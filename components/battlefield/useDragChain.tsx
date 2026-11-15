'use client';
/** 拖曳連珠共用：pointer events（滑鼠＋觸控），沿路徑畫線；退回上一格可撤銷。只處理手勢，規則全在 lib/beast-game/match3。 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as RPointerEvent } from 'react';
import { canExtend, type Board, type Cell, type MagicGrid } from '@/lib/beast-game/match3';

export interface DragPoint { x: number; y: number }

export function useDragChain(board: Board, enabled: boolean, onRelease: (path: Cell[]) => void, diagonal = false, magic?: MagicGrid, shieldMode = false) {
  const ref = useRef<HTMLDivElement>(null);
  const pathRef = useRef<Cell[]>([]);
  const [path, setPath] = useState<Cell[]>([]);
  const [points, setPoints] = useState<DragPoint[]>([]);

  /** 指標要落在格子中心附近（約 84% 範圍）才算進入，斜向滑過角落不會誤連。 */
  const cellAt = useCallback((x: number, y: number, strict: boolean): { cell: Cell; pt: DragPoint } | null => {
    const host = ref.current; if (!host) return null;
    const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest('[data-r]') as HTMLElement | null;
    if (!el || !host.contains(el)) return null;
    const rc = el.getBoundingClientRect(), hr = host.getBoundingClientRect();
    const cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2;
    if (strict && Math.hypot(x - cx, y - cy) > rc.width * 0.42) return null;
    return { cell: { r: Number(el.dataset.r), c: Number(el.dataset.c) }, pt: { x: cx - hr.left, y: cy - hr.top } };
  }, []);

  const commit = (next: Cell[], pts: DragPoint[]) => { pathRef.current = next; setPath(next); setPoints(pts); };
  const ptsRef = useRef<DragPoint[]>([]);

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (!enabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const hit = cellAt(e.clientX, e.clientY, false); if (!hit) return;
    e.preventDefault();
    try { ref.current?.setPointerCapture(e.pointerId); } catch { /* 部分瀏覽器不支援 */ }
    ptsRef.current = [hit.pt]; commit([hit.cell], ptsRef.current);
  };
  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const cur = pathRef.current; if (!cur.length) return;
    const hit = cellAt(e.clientX, e.clientY, true); if (!hit) return;
    const last = cur[cur.length - 1];
    if (last.r === hit.cell.r && last.c === hit.cell.c) return;
    const prev = cur[cur.length - 2];
    if (prev && prev.r === hit.cell.r && prev.c === hit.cell.c) { ptsRef.current = ptsRef.current.slice(0, -1); commit(cur.slice(0, -1), ptsRef.current); return; }
    if (canExtend(board, cur, hit.cell, diagonal, magic, shieldMode)) { ptsRef.current = [...ptsRef.current, hit.pt]; commit([...cur, hit.cell], ptsRef.current); }
  };
  const end = () => {
    const done = pathRef.current; ptsRef.current = []; commit([], []);
    if (done.length) onRelease(done);
  };
  const cancel = () => { ptsRef.current = []; commit([], []); };

  return { ref, path, points, handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: cancel } };
}

/**
 * AUDIT-2 H2（fix-3）：拖曳狀態放在外部小倉庫，不放在呼叫端的 React state。
 * ‧ 按下、每進一格、放開時，只有訂閱者（盤面格子、拖曳線、提示字）重畫，不會讓整個戰鬥元件（約 1,200 行）跟著重畫。
 * ‧ 命中判斷：按下時一次量好所有格子的位置（快取），移動時用算的，不再每次呼叫 elementFromPoint＋getBoundingClientRect
 *   （那會在每次移動時強迫同步排版）。捲動或視窗大小改變時快取作廢、下次重量。
 * ‧ 規則、門檻、判定（canExtend、84% 中心範圍）都和 useDragChain 相同；useDragChain 原樣保留給其他頁面使用。
 */
export interface DragSnapshot { path: Cell[]; points: DragPoint[]; /** 這條連線怎麼來的：拖曳／點選模式／鍵盤（AUDIT-2 H8）。 */ via: 'pointer' | 'tap' | 'key' }
export interface DragStore { get(): DragSnapshot; subscribe(fn: () => void): () => void }
const EMPTY: DragSnapshot = { path: [], points: [], via: 'pointer' };
export type TapResult = 'start' | 'extend' | 'undo' | 'reject';
type CellBox = { r: number; c: number; cx: number; cy: number; left: number; top: number; right: number; bottom: number; w: number };

export function useDragChainStore(board: Board, enabled: boolean, onRelease: (path: Cell[]) => void, diagonal = false, magic?: MagicGrid, shieldMode = false, opts: { tapMode?: boolean } = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const snap = useRef<DragSnapshot>(EMPTY);
  const listeners = useRef(new Set<() => void>());
  const store = useRef<DragStore>({ get: () => snap.current, subscribe: fn => { listeners.current.add(fn); return () => { listeners.current.delete(fn); }; } }).current;
  const boxes = useRef<{ list: CellBox[]; hostLeft: number; hostTop: number } | null>(null);
  // 最新的參數放 ref：事件處理函式固定不變，呼叫端重畫時不用重新綁定。
  const live = useRef({ board, enabled, onRelease, diagonal, magic, shieldMode, tapMode: !!opts.tapMode });
  live.current = { board, enabled, onRelease, diagonal, magic, shieldMode, tapMode: !!opts.tapMode };
  // 不能出手時（例如回合結算中）清掉點選／鍵盤做到一半的連線。
  useEffect(() => { if (!enabled && snap.current.path.length && snap.current.via !== 'pointer') { snap.current = EMPTY; for (const fn of listeners.current) fn(); } }, [enabled]);

  const emit = (next: DragSnapshot) => { snap.current = next; for (const fn of listeners.current) fn(); };
  const measure = () => {
    const host = ref.current; if (!host) return null;
    const hr = host.getBoundingClientRect();
    const list: CellBox[] = [];
    host.querySelectorAll<HTMLElement>('[data-r]').forEach(el => {
      const rc = el.getBoundingClientRect();
      list.push({ r: Number(el.dataset.r), c: Number(el.dataset.c), cx: rc.left + rc.width / 2, cy: rc.top + rc.height / 2, left: rc.left, top: rc.top, right: rc.right, bottom: rc.bottom, w: rc.width });
    });
    return (boxes.current = { list, hostLeft: hr.left, hostTop: hr.top });
  };
  const cellAt = (x: number, y: number, strict: boolean): { cell: Cell; pt: DragPoint } | null => {
    const b = boxes.current ?? measure(); if (!b) return null;
    for (const box of b.list) {
      if (x < box.left || x > box.right || y < box.top || y > box.bottom) continue;
      if (strict && Math.hypot(x - box.cx, y - box.cy) > box.w * 0.42) return null;
      return { cell: { r: box.r, c: box.c }, pt: { x: box.cx - b.hostLeft, y: box.cy - b.hostTop } };
    }
    return null;
  };
  const setDragging = (on: boolean) => { const h = ref.current; if (!h) return; if (on) h.setAttribute('data-dragging', ''); else h.removeAttribute('data-dragging'); };
  const invalidate = useRef(() => { boxes.current = null; }).current;

  const pointOf = (cell: Cell): DragPoint | null => {
    const b = boxes.current ?? measure(); const box = b?.list.find(x => x.r === cell.r && x.c === cell.c);
    return b && box ? { x: box.cx - b.hostLeft, y: box.cy - b.hostTop } : null;
  };
  /**
   * AUDIT-2 H8：點選模式與鍵盤的替代操作（WCAG 2.5.7 拖曳替代、2.1.1 鍵盤）。
   * 點一顆＝開始；點相鄰可連的同色珠＝延伸；再點最後一顆＝撤銷；其他＝不接受。送出與取消由 submit()／cancel()。
   * 規則判定和拖曳完全相同（canExtend）。
   */
  const api = useRef({
    tapCell(cell: Cell, via: 'tap' | 'key'): TapResult {
      const L = live.current; if (!L.enabled) return 'reject';
      const cur = snap.current.via === 'pointer' ? [] : snap.current.path;
      if (!cur.length) { const pt = pointOf(cell); if (!pt) return 'reject'; emit({ path: [cell], points: [pt], via }); return 'start'; }
      const last = cur[cur.length - 1];
      if (last.r === cell.r && last.c === cell.c) { const path = cur.slice(0, -1); emit(path.length ? { path, points: snap.current.points.slice(0, -1), via } : EMPTY); return 'undo'; }
      if (!canExtend(L.board, cur, cell, L.diagonal, L.magic, L.shieldMode)) return 'reject';
      const pt = pointOf(cell); if (!pt) return 'reject';
      emit({ path: [...cur, cell], points: [...snap.current.points, pt], via }); return 'extend';
    },
    submit() { const done = snap.current.path; emit(EMPTY); if (done.length && live.current.enabled) live.current.onRelease(done); },
    cancel() { emit(EMPTY); },
  }).current;

  const handlers = useRef({
    onPointerDown(e: RPointerEvent<HTMLDivElement>) {
      const L = live.current;
      if (!L.enabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
      measure(); // 每次按下重量一次（盤面補珠、換版面後位置可能變）
      const hit = cellAt(e.clientX, e.clientY, false); if (!hit) return;
      e.preventDefault();
      if (L.tapMode) { api.tapCell(hit.cell, 'tap'); return; }
      try { ref.current?.setPointerCapture(e.pointerId); } catch { /* 部分瀏覽器不支援 */ }
      window.addEventListener('scroll', invalidate, { passive: true, once: true });
      window.addEventListener('resize', invalidate, { passive: true, once: true });
      setDragging(true);
      emit({ path: [hit.cell], points: [hit.pt], via: 'pointer' });
    },
    onPointerMove(e: RPointerEvent<HTMLDivElement>) {
      if (snap.current.via !== 'pointer') return;
      const cur = snap.current.path; if (!cur.length) return;
      const hit = cellAt(e.clientX, e.clientY, true); if (!hit) return;
      const last = cur[cur.length - 1];
      if (last.r === hit.cell.r && last.c === hit.cell.c) return;
      const prev = cur[cur.length - 2];
      if (prev && prev.r === hit.cell.r && prev.c === hit.cell.c) { emit({ path: cur.slice(0, -1), points: snap.current.points.slice(0, -1), via: 'pointer' }); return; }
      const L = live.current;
      if (canExtend(L.board, cur, hit.cell, L.diagonal, L.magic, L.shieldMode)) emit({ path: [...cur, hit.cell], points: [...snap.current.points, hit.pt], via: 'pointer' });
    },
    onPointerUp() {
      if (snap.current.via !== 'pointer') return;
      const done = snap.current.path; setDragging(false); emit(EMPTY);
      if (done.length) live.current.onRelease(done);
    },
    onPointerCancel() { if (snap.current.via !== 'pointer') return; setDragging(false); emit(EMPTY); },
  }).current;

  return { ref, store, handlers, api };
}
/** 訂閱拖曳狀態（只有呼叫這個 hook 的元件會隨拖曳重畫）。 */
export function useDragSnapshot(store: DragStore): DragSnapshot {
  return useSyncExternalStore(store.subscribe, store.get, () => EMPTY);
}

/** 拖曳路徑：SVG 折線，疊在盤面上，不擋指標。 */
export function DragPathSvg({ points, color, luminous = false, persistent = false }: { points: DragPoint[]; color: string; luminous?: boolean; persistent?: boolean }) {
  if (persistent) return <PersistentDragPathSvg points={points} color={color} luminous={luminous} />;
  if (points.length === 0) return null;
  const d = points.map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <svg aria-hidden="true" data-testid="drag-path" style={SVG_STYLE}>
      <polyline points={d} fill="none" stroke="rgba(0,0,0,.55)" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={d} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      {luminous && <polyline data-chain-flow="true" points={d} fill="none" stroke="#effdff" strokeWidth={2} strokeDasharray="8 26" strokeLinecap="round" strokeLinejoin="round" />}
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 9 : 6} fill="#fff" stroke={color} strokeWidth={3} />)}
    </svg>
  );
}
const SVG_STYLE = { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 3 } as const;
const SVG_HIDDEN = { ...SVG_STYLE, visibility: 'hidden' } as const;
const DOT_POOL = 16;
/**
 * 戰鬥盤用：節點常駐，拖曳中只改屬性、不插拔元素。
 * 全站 CSS 有多條 body:has(…) 規則，盤面內每插拔一個 svg／polyline／circle，Chrome 都會把整頁（約 850 節點）
 * 重算樣式（4× 降速單次 22–26ms）。這裡把路徑點做成固定池（不夠才以 8 為單位加大），多的點用 display="none" 收起；
 * 最後一顆（頭）永遠是最後一個 circle，原本 circle:last-of-type 的呼吸動畫與外觀不變。
 */
function PersistentDragPathSvg({ points, color, luminous }: { points: DragPoint[]; color: string; luminous: boolean }) {
  const n = points.length;
  const d = n ? points.map((p) => `${p.x},${p.y}`).join(' ') : '';
  const pool = Math.max(DOT_POOL, Math.ceil(Math.max(0, n - 1) / 8) * 8);
  const head = n ? points[n - 1] : null;
  return (
    <svg aria-hidden="true" data-testid="drag-path" data-empty={n ? undefined : 'true'} style={n ? SVG_STYLE : SVG_HIDDEN}>
      <polyline points={d} fill="none" stroke="rgba(0,0,0,.55)" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={d} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      {luminous && <polyline data-chain-flow="true" points={d} fill="none" stroke="#effdff" strokeWidth={2} strokeDasharray="8 26" strokeLinecap="round" strokeLinejoin="round" />}
      {Array.from({ length: pool }, (_, i) => { const p = i < n - 1 ? points[i] : null; return <circle key={i} cx={p ? p.x : 0} cy={p ? p.y : 0} r={6} fill="#fff" stroke={color} strokeWidth={3} display={p ? undefined : 'none'} />; })}
      <circle cx={head ? head.x : 0} cy={head ? head.y : 0} r={9} fill="#fff" stroke={color} strokeWidth={3} display={head ? undefined : 'none'} />
    </svg>
  );
}

/** 拖曳中的提示字：未滿 3／普通／魔法珠／五珠技／超過威力上限。 */
export function dragHint(n: number, label: string, cap: number, magicMin: number, skillLen: number): string {
  if (n === 0) return '';
  if (n < 3) return `${label}珠 ${n} 顆，再連 ${3 - n} 顆才能發動`;
  if (n === skillLen) return `${label}珠 ${n} 顆：剛好 5 顆！放開觸發五珠技＋生成魔法珠`;
  if (n >= magicMin) return `${label}珠 ${n} 顆：放開生成魔法珠（威力 ${n}）${n > cap ? `，普通威力只算 ${cap} 顆` : ''}`;
  return `${label}珠 ${n} 顆：放開發動（再連 1 顆可生成魔法珠）`;
}
