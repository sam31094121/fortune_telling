'use client';

/**
 * 固定五行關係軌道（規格 §7/§8/§12）：
 * 外圈＝相生循環（木火土金水），內部五角星＝相剋。
 * Relation 是固定視覺結構，不因資料改變、不因元素弱而刪線。
 * 動畫：一次性畫線（stroke-dash Reveal），完成後靜態。
 */

export function FiveElementRelationPath({ points, starOrder }: {
  points: Array<{ x: number; y: number }>;
  starOrder: number[];
}) {
  // 相生外圈：閉合五邊形弧線（沿節點順序）
  const ringPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  // 相剋內星：木→土→水→火→金→木
  const starPts = starOrder.map((i) => points[i]);
  const starPath = starPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  return (
    <g fill="none">
      <path d={ringPath} stroke="rgba(52,211,153,0.55)" strokeWidth={1.6} strokeLinejoin="round"
        style={{ strokeDasharray: 900, strokeDashoffset: 900, animation: 'feDraw 1.1s ease-out forwards' }} />
      <path d={starPath} stroke="rgba(251,113,133,0.42)" strokeWidth={1.2} strokeLinejoin="round"
        style={{ strokeDasharray: 900, strokeDashoffset: 900, animation: 'feDraw 1.1s ease-out 0.9s forwards' }} />
      <style>{`@keyframes feDraw { to { stroke-dashoffset: 0; } }`}</style>
    </g>
  );
}
