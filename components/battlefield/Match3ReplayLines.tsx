'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import type { OrbReplayFrame } from '@/lib/beast-game/match3/replay';
import styles from './Match3Board.module.css';

/** Only projects server-recorded cells onto their measured DOM centres. */
export default function Match3ReplayLines({ frame }: { frame: OrbReplayFrame }) {
  const ref = useRef<SVGSVGElement>(null);
  const [points, setPoints] = useState<Record<string, { x: number; y: number }>>({});
  useLayoutEffect(() => {
    const svg = ref.current, board = svg?.parentElement;
    if (!svg || !board) return;
    const measure = () => {
      const bounds = svg.getBoundingClientRect(), next: typeof points = {};
      board.querySelectorAll<HTMLElement>('[role="gridcell"]').forEach(cell => {
        const box = cell.getBoundingClientRect();
        next[`${cell.dataset.r}:${cell.dataset.c}`] = { x: box.left + box.width / 2 - bounds.left, y: box.top + box.height / 2 - bounds.top };
      });
      setPoints(next);
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(board);
    return () => observer.disconnect();
  }, [frame]);
  const at = (p: { r: number; c: number }) => points[`${p.r}:${p.c}`];
  return <svg ref={ref} className={styles.replayLines} data-testid="match3-replay-lines" data-chain={frame.chain} role="img" aria-label={frame.matches.map(g => g.description).join('；')}>
    {frame.matches.map((group, i) => <g key={i} data-match-count={group.count} data-match-element={group.element}>
      {group.paths.map((path, j) => <polyline key={j} data-match-path={JSON.stringify(path)} points={path.map(at).filter(Boolean).map(p => `${p.x},${p.y}`).join(' ')} />)}
      {group.cells.map(p => { const point = at(p); return point && <circle key={`${p.r}:${p.c}`} data-match-cell={`${p.r}:${p.c}`} cx={point.x} cy={point.y} r={12} />; })}
      {(() => { const point = at(group.cells[0]); return point && <g transform={`translate(${point.x},${Math.max(14, point.y - 17)})`}><rect x={-22} y={-12} width={44} height={23} rx={8} /><text textAnchor="middle" dominantBaseline="central">{group.label}</text></g>; })()}
    </g>)}
  </svg>;
}
