'use client';

/** 十神標籤層：只呈現後端已驗證資料；後端未提供 → 不顯示（不得前端自行判定十神） */

import type { OrbitNodeData } from './FiveElementOrbitCanvas';

export function FiveElementLabels({ points, order, byLabel, cx, cy }: {
  points: Array<{ x: number; y: number }>;
  order: string[];
  byLabel: Map<string, OrbitNodeData>;
  cx: number;
  cy: number;
}) {
  return (
    <g>
      {order.map((label, i) => {
        const tenGods = byLabel.get(label)?.tenGodLabels ?? [];
        if (tenGods.length === 0) return null;
        const p = points[i];
        // 標籤放在節點外側（遠離圓心方向）
        const dx = p.x - cx; const dy = p.y - cy;
        const len = Math.hypot(dx, dy) || 1;
        const lx = p.x + (dx / len) * 42;
        const ly = p.y + (dy / len) * 42;
        return (
          <text key={label} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={9.5} fontWeight={700} fill="rgba(255,255,255,0.5)">
            {tenGods.join('／')}
          </text>
        );
      })}
    </g>
  );
}
