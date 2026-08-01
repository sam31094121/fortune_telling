'use client';

import styles from './TaijiCoreVisual.module.css';

export type TaijiVisualStage = 'idle' | 'taiji' | 'liangyi' | 'sixiang' | 'bagua';

type BaguaDefinition = { name: string; symbol: string; angle: number; element: 'EARTH' | 'WATER' | 'FIRE' | 'AIR' | 'SPACE' };

const BAGUA: BaguaDefinition[] = [
  { name: '乾', symbol: '☰', angle: 0, element: 'SPACE' },
  { name: '兌', symbol: '☱', angle: 45, element: 'SPACE' },
  { name: '離', symbol: '☲', angle: 90, element: 'FIRE' },
  { name: '震', symbol: '☳', angle: 135, element: 'AIR' },
  { name: '巽', symbol: '☴', angle: 180, element: 'AIR' },
  { name: '坎', symbol: '☵', angle: 225, element: 'WATER' },
  { name: '艮', symbol: '☶', angle: 270, element: 'EARTH' },
  { name: '坤', symbol: '☷', angle: 315, element: 'EARTH' },
];

const FOUR_SYMBOLS = [
  { name: '太陽', symbol: '⚊', x: 74, y: -74 },
  { name: '少陰', symbol: '⚋', x: 74, y: 74 },
  { name: '太陰', symbol: '⚋', x: -74, y: 74 },
  { name: '少陽', symbol: '⚊', x: -74, y: -74 },
] as const;

function baguaPoint(angle: number, radius: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
}

type TaijiCoreVisualProps = {
  active?: boolean;
  stage?: TaijiVisualStage;
  highlightElement?: 'EARTH' | 'WATER' | 'FIRE' | 'AIR' | 'SPACE' | null;
  className?: string;
};

/**
 * 太極 → 兩儀 → 四象 → 八卦：單一 SVG 座標系統，向量比例固定，
 * 分裂/展開一律沿同一圓心等比例進行，八卦依角度公式順時針展開。
 */
export default function TaijiCoreVisual({ active = false, stage = 'idle', highlightElement = null, className = '' }: TaijiCoreVisualProps) {
  const splitApart = stage === 'liangyi' || stage === 'sixiang' || stage === 'bagua';
  const showFourSymbols = stage === 'sixiang' || stage === 'bagua';
  const showBagua = stage === 'bagua';

  return (
    <svg
      className={`${styles.svg} ${active ? styles.active : ''} ${splitApart ? styles.split : ''} ${className}`.trim()}
      viewBox="-190 -190 380 380"
      role="img"
      aria-label="太極"
    >
      <defs>
        <filter id="taijiCoreGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="taijiLightGradient" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fffdf5" />
          <stop offset="100%" stopColor="#f3d98a" />
        </radialGradient>
        <radialGradient id="taijiDarkGradient" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#2a2140" />
          <stop offset="100%" stopColor="#05040a" />
        </radialGradient>
      </defs>

      <circle className={styles.outerRing} cx="0" cy="0" r="121" />

      <g className={`${styles.fish} ${styles.yinFish}`} filter="url(#taijiCoreGlow)">
        <path
          d="M 0 -120 A 120 120 0 0 0 0 120 A 60 60 0 0 0 0 0 A 60 60 0 0 1 0 -120 Z"
          fill="url(#taijiDarkGradient)"
        />
        <circle cx="0" cy="-60" r="17" fill="#f5f7fb" />
      </g>

      <g className={`${styles.fish} ${styles.yangFish}`} filter="url(#taijiCoreGlow)">
        <path
          d="M 0 -120 A 60 60 0 0 0 0 0 A 60 60 0 0 1 0 120 A 120 120 0 0 0 0 -120 Z"
          fill="url(#taijiLightGradient)"
        />
        <circle cx="0" cy="60" r="17" fill="#11151d" />
      </g>

      <g className={`${styles.fourSymbols} ${showFourSymbols ? styles.fourSymbolsVisible : ''}`}>
        {FOUR_SYMBOLS.map((item, index) => (
          <g
            key={item.name}
            transform={`translate(${item.x} ${item.y})`}
            className={styles.fourSymbolItem}
            style={{ transitionDelay: `${index * 90}ms` }}
          >
            <circle r="22" className={styles.symbolCircle} />
            <text x="0" y="6" textAnchor="middle" className={styles.symbolText}>
              {item.symbol}
            </text>
          </g>
        ))}
      </g>

      <g className={`${styles.baguaGroup} ${showBagua ? styles.baguaGroupVisible : ''}`}>
        {BAGUA.map((item, index) => {
          const { x, y } = baguaPoint(item.angle, 154);
          const highlighted = showBagua && highlightElement === item.element;
          return (
            <g
              key={item.name}
              transform={`translate(${x} ${y})`}
              className={`${styles.baguaItem} ${highlighted ? styles.baguaItemHighlight : ''}`}
              style={{ transitionDelay: `${index * 70}ms` }}
            >
              <circle r="24" className={styles.baguaCircle} />
              <text x="0" y="4" textAnchor="middle" className={styles.baguaSymbol}>
                {item.symbol}
              </text>
              <text x="0" y="39" textAnchor="middle" className={styles.baguaName}>
                {item.name}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
