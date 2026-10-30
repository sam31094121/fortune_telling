'use client';
/**
 * 寶珠精修：連線（細、漸粗、慢流動的虛線＋節點環＋隨 N 長大的計數徽章）。
 * v3：
 *  - 跟手尾線：window pointermove → rAF 合併 → 直接寫 ref 的 <line>，不觸發 React 重繪（減少掉幀）。
 *  - 徽章離開手指：放在連線頭上方 LINK_MOTION.badgeOffsetY；太靠上緣時改到側邊；以 CSS transform 平滑跟隨。
 *  - 分級（3 → 4 魔珠 → 5 五珠技 → 10 上限）：元素固定不換、只過渡顏色；標籤交叉淡化；升級時一圈淡出的光環。
 */
import { useEffect, useRef, type CSSProperties } from 'react';
import type { BeastElement } from '@/lib/beast-game/elements';
import type { DragPoint } from '../useDragChain';
import { LINK_MOTION, LINK_TIER_LABEL, badgeScale, linkColor, linkTier, type LinkTier } from '@/lib/beast-game/match3/bead-visual-config';
import bp from './BeadPolish.module.css';

const TIERS: LinkTier[] = ['short', 'normal', 'magic', 'skill5', 'cap'];

export function BeadLink({ points, el }: { points: DragPoint[]; el: BeastElement | null }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tailRef = useRef<SVGLineElement>(null);
  const active = points.length > 0 && !!el;
  const head = active ? points[points.length - 1] : null;
  const headRef = useRef(head);
  headRef.current = head;

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let px = NaN;
    let py = NaN;
    const paint = () => {
      raf = 0;
      const svg = svgRef.current, line = tailRef.current, h = headRef.current;
      if (!svg || !line || !h || Number.isNaN(px)) return;
      const r = svg.getBoundingClientRect();
      line.setAttribute('x1', String(h.x));
      line.setAttribute('y1', String(h.y));
      line.setAttribute('x2', String(px - r.left));
      line.setAttribute('y2', String(py - r.top));
    };
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { window.removeEventListener('pointermove', onMove); if (raf) cancelAnimationFrame(raf); };
  }, [active]);

  if (!active || !head || !el) return null;
  const n = points.length;
  const tier = linkTier(n);
  const color = linkColor(el, tier);
  const d = points.map((p) => `${p.x},${p.y}`).join(' ');
  const nearTop = head.y < LINK_MOTION.badgeFlipTopPx;
  const bx = nearTop ? head.x + LINK_MOTION.badgeSideX : head.x;
  const by = nearTop ? head.y : head.y - LINK_MOTION.badgeOffsetY;
  const vars = { '--tierMs': `${LINK_MOTION.tierMs}ms`, '--follow': `${LINK_MOTION.followMs}ms` } as CSSProperties;
  return (
    <svg ref={svgRef} className={bp.link} style={vars} data-testid="drag-path" data-tier={tier} aria-hidden="true">
      <polyline points={d} fill="none" stroke={color} strokeOpacity={0.22} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      {points.slice(1).map((p, i) => (
        <line key={i} x1={points[i].x} y1={points[i].y} x2={p.x} y2={p.y} stroke={color} strokeLinecap="round"
          strokeWidth={1.2 + (2.2 * (i + 1)) / Math.max(n - 1, 1)} />
      ))}
      <line ref={tailRef} className={bp.tail} data-testid="link-tail" x1={head.x} y1={head.y} x2={head.x} y2={head.y}
        stroke={color} strokeOpacity={0.5} strokeWidth={1.2} strokeLinecap="round" />
      <polyline className={bp.flow} points={d} fill="none" stroke="var(--bone)" strokeOpacity={0.55} strokeWidth={1} strokeDasharray="2 7" strokeLinecap="round" />
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === n - 1 ? 8 : 6} fill="none" stroke={color} strokeOpacity={i === n - 1 ? 0.9 : 0.55} strokeWidth={1} />)}
      {tier !== 'short' && tier !== 'normal' && (
        <circle key={`pulse-${tier}`} className={bp.tierPulse} cx={head.x} cy={head.y} r={14} fill="none" stroke={color} strokeWidth={1} />
      )}
      <g className={bp.badgePos} style={{ transform: `translate(${bx}px, ${by}px) scale(${badgeScale(n)})` }}>
        <g className={bp.badge} data-testid="link-badge" data-n={n} data-side={nearTop ? 'side' : 'above'}>
          <rect x={-24} y={-10} width={48} height={20} rx={10} fill="var(--ink)" fillOpacity={0.88} stroke={color} strokeWidth={0.8} />
          {TIERS.map((t) => (
            <text key={t} className={bp.tierLbl} x={0} y={4} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}
              style={{ opacity: t === tier ? 1 : 0 }}>
              {n}{LINK_TIER_LABEL[t] ? `・${LINK_TIER_LABEL[t]}` : ''}
            </text>
          ))}
        </g>
      </g>
    </svg>
  );
}