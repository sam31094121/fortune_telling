'use client';
/** 拖曳連珠共用：pointer events（滑鼠＋觸控），沿路徑畫線；退回上一格可撤銷。只處理手勢，規則全在 lib/beast-game/match3。 */
import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { canExtend, type Board, type Cell, type MagicGrid } from '@/lib/beast-game/match3';

export interface DragPoint { x: number; y: number }

export function useDragChain(board: Board, enabled: boolean, onRelease: (path: Cell[]) => void, diagonal = false, magic?: MagicGrid, shieldMode = false) {
  const ref = useRef<HTMLDivElement>(null);
  const pathRef = useRef<Cell[]>([]);
  const [path, setPath] = useState<Cell[]>([]);
  const [points, setPoints] = useState<DragPoint[]>([]);

  /** 拖曳開始時量一次所有格子位置（相對盤面），移動中只做算術，不再每次 pointermove 呼叫 elementFromPoint＋getBoundingClientRect 強制重排。
   *  捲動或尺寸改變時作廢，下一次再量。 */
  const geometry = useRef<{ hostLeft: number; hostTop: number; cells: { r: number; c: number; x: number; y: number; w: number; h: number }[] } | null>(null);
  const dropGeometry = useRef<(() => void) | null>(null);
  const measureCells = useCallback(() => {
    const host = ref.current; if (!host) return null;
    const hr = host.getBoundingClientRect();
    const cells = Array.from(host.querySelectorAll<HTMLElement>('[data-r]')).map(el => {
      // offset 量測不含 .sel 的 scale，與格子中心一致。
      const rc = el.getBoundingClientRect();
      const w = el.offsetWidth || rc.width, h = el.offsetHeight || rc.height;
      return { r: Number(el.dataset.r), c: Number(el.dataset.c), x: rc.left + rc.width / 2 - hr.left - w / 2, y: rc.top + rc.height / 2 - hr.top - h / 2, w, h };
    });
    geometry.current = { hostLeft: hr.left, hostTop: hr.top, cells };
    if (!dropGeometry.current) {
      const drop = () => { geometry.current = null; window.removeEventListener('scroll', drop, true); window.removeEventListener('resize', drop); dropGeometry.current = null; };
      dropGeometry.current = drop;
      window.addEventListener('scroll', drop, { capture: true, passive: true }); window.addEventListener('resize', drop);
    }
    return geometry.current;
  }, []);
  useEffect(() => () => { dropGeometry.current?.(); }, []);
  const releaseGeometry = () => { if (dropGeometry.current) dropGeometry.current(); else geometry.current = null; };

  /** 指標要落在格子中心附近（約 84% 範圍）才算進入，斜向滑過角落不會誤連。 */
  const cellAt = useCallback((x: number, y: number, strict: boolean): { cell: Cell; pt: DragPoint } | null => {
    const g = geometry.current ?? measureCells(); if (!g) return null;
    const lx = x - g.hostLeft, ly = y - g.hostTop;
    const hit = g.cells.find(q => lx >= q.x && lx < q.x + q.w && ly >= q.y && ly < q.y + q.h);
    if (!hit) return null;
    const cx = hit.x + hit.w / 2, cy = hit.y + hit.h / 2;
    if (strict && Math.hypot(lx - cx, ly - cy) > hit.w * 0.42) return null;
    return { cell: { r: hit.r, c: hit.c }, pt: { x: cx, y: cy } };
  }, [measureCells]);

  const commit = (next: Cell[], pts: DragPoint[]) => { pathRef.current = next; setPath(next); setPoints(pts); };
  const ptsRef = useRef<DragPoint[]>([]);

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (!enabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    measureCells();
    const hit = cellAt(e.clientX, e.clientY, false); if (!hit) return;
    e.preventDefault();
    try { ref.current?.setPointerCapture(e.pointerId); } catch { /* 部分瀏覽器不支援 */ }
    ptsRef.current = [hit.pt]; commit([hit.cell], ptsRef.current);
  };
  const onPointerMove = (e: Pick<RPointerEvent<HTMLDivElement>, 'clientX' | 'clientY' | 'nativeEvent'>) => {
    let cur = pathRef.current; if (!cur.length) return;
    let pts = ptsRef.current;
    // Busy browsers batch pointer samples. Validate every recorded point, never
    // interpolate missing cells or treat the batch's last point as a jump.
    const samples = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const sample of [...samples, e]) {
      const hit = cellAt(sample.clientX, sample.clientY, true); if (!hit) continue;
      const last = cur[cur.length - 1];
      if (last.r === hit.cell.r && last.c === hit.cell.c) continue;
      const prev = cur[cur.length - 2];
      if (prev && prev.r === hit.cell.r && prev.c === hit.cell.c) { pts = pts.slice(0, -1); cur = cur.slice(0, -1); continue; }
      if (canExtend(board, cur, hit.cell, diagonal, magic, shieldMode)) { pts = [...pts, hit.pt]; cur = [...cur, hit.cell]; }
    }
    if (cur !== pathRef.current) { ptsRef.current = pts; commit(cur, pts); }
  };
  // Native delivery preserves every browser sample while React is rendering.
  // React continuous-event delivery may skip intermediate moves under load.
  const moveHandler = useRef(onPointerMove);
  moveHandler.current = onPointerMove;
  useEffect(() => {
    const host = ref.current; if (!host) return;
    const move = (event: PointerEvent) => moveHandler.current({ clientX: event.clientX, clientY: event.clientY, nativeEvent: event });
    host.addEventListener('pointermove', move);
    return () => host.removeEventListener('pointermove', move);
  }, []);

  const end = () => {
    releaseGeometry();
    const done = pathRef.current; ptsRef.current = []; commit([], []);
    if (done.length) onRelease(done);
  };
  const cancel = () => { releaseGeometry(); ptsRef.current = []; commit([], []); };

  return { ref, path, points, handlers: { onPointerDown, onPointerUp: end, onPointerCancel: cancel } };
}

/** 拖曳路徑：SVG 折線，疊在盤面上，不擋指標。 */
export function DragPathSvg({ points, color, luminous = false }: { points: DragPoint[]; color: string; luminous?: boolean }) {
  if (points.length === 0) return null;
  const d = points.map((p) => `${p.x},${p.y}`).join(' ');
  const layer = { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 3 } as const;
  const head = points[points.length - 1];
  // 會動的流光與拖曳頭放在獨立一層（無濾鏡），每幀只重畫這層；帶發光濾鏡的路徑層只在進出格子時重畫（拖曳 90 FPS 預算）。
  return (
    <>
      <svg aria-hidden="true" data-testid="drag-path" style={layer}>
        <polyline points={d} fill="none" stroke="rgba(0,0,0,.55)" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={d} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 9 : 6} fill="#fff" stroke={color} strokeWidth={3} />)}
      </svg>
      {luminous && <svg aria-hidden="true" data-testid="drag-flow" style={layer}>
        <polyline data-chain-flow="true" points={d} fill="none" stroke="#effdff" strokeWidth={2} strokeDasharray="8 26" strokeLinecap="round" strokeLinejoin="round" />
      </svg>}
      {/* 拖曳頭用 HTML 圓點（transform 脈動走合成器，不必每幀重算樣式／重畫）。 */}
      {luminous && <span aria-hidden="true" data-drag-head="true" style={{ position: 'absolute', left: head.x - 10.5, top: head.y - 10.5, width: 21, height: 21, boxSizing: 'border-box', borderRadius: '50%', background: 'var(--m3-head-fill, #fff)', border: `var(--m3-head-stroke, 3px) solid ${color}`, pointerEvents: 'none', zIndex: 3 }} />}
    </>
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
