'use client';
/** 拖曳連珠共用：pointer events（滑鼠＋觸控），沿路徑畫線；退回上一格可撤銷。只處理手勢，規則全在 lib/beast-game/match3。 */
import { useCallback, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
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

/** 拖曳路徑：SVG 折線，疊在盤面上，不擋指標。 */
export function DragPathSvg({ points, color, luminous = false }: { points: DragPoint[]; color: string; luminous?: boolean }) {
  if (points.length === 0) return null;
  const d = points.map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <svg aria-hidden="true" data-testid="drag-path" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 3 }}>
      <polyline points={d} fill="none" stroke="rgba(0,0,0,.55)" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={d} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      {luminous && <polyline data-chain-flow="true" points={d} fill="none" stroke="#effdff" strokeWidth={2} strokeDasharray="8 26" strokeLinecap="round" strokeLinejoin="round" />}
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 9 : 6} fill="#fff" stroke={color} strokeWidth={3} />)}
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
