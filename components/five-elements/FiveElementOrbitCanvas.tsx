'use client';

/**
 * 五行星軌 Canvas（純 SVG，無 WebGL、無持續動畫）
 * 外圈＝相生循環、內部五角星＝相剋。節點位置與名稱永久固定。
 * 資料只影響尺寸/亮度（scale 0.85–1.15），弱元素不消失。
 */

import { FiveElementNode } from './FiveElementNode';
import { FiveElementRelationPath } from './FiveElementRelationPath';
import { FiveElementLabels } from './FiveElementLabels';

export interface OrbitNodeData { label: string; value: number | null; tenGodLabels: string[] }

const CX = 160; const CY = 148; const R = 96;
/** 固定節點順序（順時針，相生相鄰）：木→火→土→金→水 */
const ORDER = ['木', '火', '土', '金', '水'];
/** 相剋內星順序：木→土→水→火→金→木（以 ORDER 索引表示） */
const STAR_ORDER = [0, 2, 4, 1, 3];

export function FiveElementOrbitCanvas({ nodes }: { nodes: OrbitNodeData[] }) {
  const points = ORDER.map((_, i) => {
    const angle = ((-90 + i * 72) * Math.PI) / 180;
    return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) };
  });
  const byLabel = new Map(nodes.map((n) => [n.label, n]));
  const values = ORDER.map((l) => byLabel.get(l)?.value ?? null);
  const known = values.filter((v): v is number => v !== null);
  const maxV = known.length > 0 ? Math.max(...known) : 1;
  const minV = known.length > 0 ? Math.min(...known) : 0;
  const scaleOf = (v: number | null) => {
    if (v === null || maxV === minV) return 1; // 缺資料/齊平 → 標準大小，不假裝
    return 0.85 + ((v - minV) / (maxV - minV)) * 0.3; // 鎖定 0.85–1.15
  };

  return (
    <svg viewBox="0 0 320 320" className="mx-auto block w-full max-w-[340px]" role="img" aria-label="五行星軌：外圈相生、內星相剋">
      {/* 軌道（固定結構） */}
      <FiveElementRelationPath points={points} starOrder={STAR_ORDER} />
      {/* 五行星體（永久存在） */}
      {ORDER.map((label, i) => (
        <FiveElementNode key={label} x={points[i].x} y={points[i].y} label={label} value={values[i]} scale={scaleOf(values[i])} />
      ))}
      {/* 十神標籤（只顯示後端提供的正式資料） */}
      <FiveElementLabels points={points} order={ORDER} byLabel={byLabel} cx={CX} cy={CY} />
    </svg>
  );
}
