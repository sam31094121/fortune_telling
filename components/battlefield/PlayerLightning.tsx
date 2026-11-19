import styles from './PlayerLightning.module.css';

/**
 * 雷電質感（2026-11-19 業主要求）：只做顯示幾何，端點由呼叫端傳入已記錄的命中座標，不碰傷害。
 * 層次由外到內：大範圍柔光 → 中層電暈 → 屬性色電身 → 白熱電芯；另有一條細副電弧、分岔與落點火花。
 * 全部用描邊與透明度疊出光感（不用 SVG 濾鏡），手機也不吃力；起手 80ms 內由起點劈到終點，速度感優先。
 */
export default function PlayerLightning({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length, ny = dx / length, spread = Math.min(15, length * .045);
  // 固定的鋸齒偏移（不用亂數：同一次攻擊每次重畫都長一樣，測試與重播一致）。
  const jag = [0, .35, -.6, .5, -.25, .8, -.7, .3, -.45, .65, -.3, .55, -.8, .4, -.2, .7, -.55, .25, -.35, .45, -.15, .3, -.1, 0];
  const last = jag.length - 1;
  const at = (i: number, k: number, scale = 1) => ({ x: x1 + dx * i / last + nx * spread * jag[(i * k) % jag.length] * scale, y: y1 + dy * i / last + ny * spread * jag[(i * k) % jag.length] * scale });
  const draw = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const mainPts = Array.from({ length: last + 1 }, (_, i) => i === 0 ? { x: x1, y: y1 } : i === last ? { x: x2, y: y2 } : at(i, 1));
  const sidePts = Array.from({ length: last + 1 }, (_, i) => i === 0 ? { x: x1, y: y1 } : i === last ? { x: x2, y: y2 } : at(i, 5, .8));
  const main = draw(mainPts), side = draw(sidePts);
  const branchAt = [3, 6, 9, 12, 15, 18];
  const branches = branchAt.map((index, i) => {
    const p = mainPts[index], sign = i % 2 ? -1 : 1, reach = Math.min(38, length * .09) * sign * (1 - i * .08);
    return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} l ${(nx * reach * .5 + dx * .03).toFixed(1)} ${(ny * reach * .5 + dy * .03).toFixed(1)} l ${(nx * reach * .22 - dx * .01).toFixed(1)} ${(ny * reach * .22 - dy * .01).toFixed(1)} l ${(nx * reach * .4 + dx * .04).toFixed(1)} ${(ny * reach * .4 + dy * .04).toFixed(1)}`;
  }).join(' ');
  const sparks = [[-14, -9], [12, -14], [18, 6], [-10, 12], [4, -19], [-20, 2]];
  return <g className={styles.discharge} data-player-lightning="refined" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <g className={styles.channel}>
      <path d={main} className={styles.bloom} stroke="currentColor" strokeWidth="15" pathLength="1" />
      <path d={main} className={styles.halo} stroke="currentColor" strokeWidth="7" pathLength="1" />
      <path d={branches} className={styles.branches} stroke="currentColor" strokeWidth="1.2" />
      <path d={side} className={styles.side} stroke="currentColor" strokeWidth="1.1" pathLength="1" />
      <path d={main} className={styles.body} stroke="currentColor" strokeWidth="2.6" pathLength="1" />
      <path d={main} className={styles.core} stroke="#fbf9ff" strokeWidth="1" pathLength="1" />
    </g>
    <g transform={`translate(${x2} ${y2})`}>
      <g className={styles.impact}>
        <circle r="9" className={styles.flare} fill="#fbf9ff" />
        <ellipse rx="17" ry="11" stroke="currentColor" strokeWidth="1.2" className={styles.shock} />
        <path d="M-6 0H6 M0-5V5" stroke="#fbf9ff" strokeWidth="1.6" />
        <path d="M-9-5l-9-5 M8-8l5-10 M10 5l12 4 M-7 8l-5 10" stroke="currentColor" strokeWidth="1" />
      </g>
      {sparks.map(([sx, sy], i) => <circle key={i} className={styles.spark} cx="0" cy="0" r="1.6" fill="#fff6c9" style={{ ['--sx' as string]: `${sx}px`, ['--sy' as string]: `${sy}px`, animationDelay: `${(80 + i * 14)}ms` }} />)}
    </g>
  </g>;
}
