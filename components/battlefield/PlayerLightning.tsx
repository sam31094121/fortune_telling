import styles from './PlayerLightning.module.css';

/** Display geometry only. The caller supplies the recorded hit's endpoints. */
export default function PlayerLightning({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length, ny = dx / length, spread = Math.min(12, length * .035);
  const offsets = [0, .22, -.38, .54, .12, -.48, -.17, .63, .25, -.55, -.22, .42, -.36, .18, -.14, 0];
  const points = offsets.map((offset, i) => ({ x: x1 + dx * i / 15 + nx * spread * offset, y: y1 + dy * i / 15 + ny * spread * offset }));
  const arc = points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  const branches = [3, 5, 8, 10, 12].map((index, i) => {
    const p = points[index], sign = i % 2 ? -1 : 1, reach = Math.min(32, length * .075) * sign;
    return `M ${p.x} ${p.y} l ${nx * reach * .46 + dx * .025} ${ny * reach * .46 + dy * .025} l ${nx * reach * .19 - dx * .009} ${ny * reach * .19 - dy * .009} l ${nx * reach * .35 + dx * .034} ${ny * reach * .35 + dy * .034}`;
  }).join(' ');
  return <g className={styles.discharge} data-player-lightning="refined" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <g className={styles.channel}>
      <path d={arc} className={styles.halo} stroke="currentColor" strokeWidth="7" />
      <path d={branches} className={styles.branches} stroke="currentColor" strokeWidth=".9" />
      <path d={arc} stroke="currentColor" strokeWidth="2.2" />
      <path d={arc} className={styles.core} stroke="#f4f1ff" strokeWidth=".85" />
    </g>
    <g transform={`translate(${x2} ${y2})`}>
      <g className={styles.impact}>
        <ellipse rx="15" ry="10" stroke="currentColor" strokeWidth="1" />
        <path d="M-5 0H5 M0-4V4" stroke="#f4f1ff" strokeWidth="1.4" />
        <path d="M-8-5l-8-5 M7-7l5-9 M9 4l11 4 M-6 7l-5 9" stroke="currentColor" strokeWidth=".8" />
      </g>
    </g>
  </g>;
}
