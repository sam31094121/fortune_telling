'use client';

/** 五行星體節點：位置固定、名稱永不消失；資料只影響尺寸與亮度（scale 鎖 0.85–1.15） */

export const ELEMENT_NODE_COLOR: Record<string, { core: string; glow: string }> = {
  木: { core: '#34d399', glow: 'rgba(52,211,153,0.45)' },
  火: { core: '#fb7185', glow: 'rgba(251,113,133,0.45)' },
  土: { core: '#d97706', glow: 'rgba(217,119,6,0.45)' },
  金: { core: '#cbd5e1', glow: 'rgba(203,213,225,0.45)' },
  水: { core: '#60a5fa', glow: 'rgba(96,165,250,0.45)' },
};

export function FiveElementNode({ x, y, label, value, scale }: {
  x: number; y: number; label: string; value: number | null; scale: number;
}) {
  const c = ELEMENT_NODE_COLOR[label] ?? { core: '#ffffff', glow: 'rgba(255,255,255,0.3)' };
  const r = 17 * scale;
  return (
    <g>
      {/* 能量暈（一次性渲染，靜態） */}
      <circle cx={x} cy={y} r={r + 7} fill={c.glow} opacity={0.28} />
      <circle cx={x} cy={y} r={r} fill={`url(#feGrad${label})`} stroke={c.core} strokeWidth={1.2} strokeOpacity={0.75} />
      <defs>
        <radialGradient id={`feGrad${label}`} cx="35%" cy="30%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="45%" stopColor={c.core} stopOpacity="0.9" />
          <stop offset="100%" stopColor={c.core} stopOpacity="0.35" />
        </radialGradient>
      </defs>
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={15} fontWeight={900} fill="#0b0d14" fontFamily="serif">{label}</text>
      {/* 數值：後端有才顯示真值；缺資料顯示 —（不得填 0 假裝） */}
      <text x={x} y={y + r + 13} textAnchor="middle" fontSize={10} fontWeight={700} fill="rgba(255,255,255,0.6)">
        {value === null ? '—' : `${value}%`}
      </text>
    </g>
  );
}
