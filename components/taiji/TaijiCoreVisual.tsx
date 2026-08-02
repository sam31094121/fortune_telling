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
      shapeRendering="geometricPrecision"
      textRendering="optimizeLegibility"
    >
      <defs>
        {/* 珍珠玉質感：多層漸層堆疊出高光、中間色、邊緣收暗，取代單調的兩色平塗 */}
        <radialGradient id="taijiLightGradient" cx="32%" cy="26%" r="82%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="28%" stopColor="#fffaf0" />
          <stop offset="62%" stopColor="#f6dd97" />
          <stop offset="100%" stopColor="#d9b56a" />
        </radialGradient>
        <radialGradient id="taijiDarkGradient" cx="32%" cy="26%" r="86%">
          <stop offset="0%" stopColor="#4d4270" />
          <stop offset="30%" stopColor="#241c3a" />
          <stop offset="68%" stopColor="#120d1e" />
          <stop offset="100%" stopColor="#020103" />
        </radialGradient>
        <radialGradient id="taijiRingGradient" cx="50%" cy="50%" r="50%">
          <stop offset="88%" stopColor="rgba(230, 236, 248, 0)" />
          <stop offset="97%" stopColor="rgba(230, 236, 248, 0.9)" />
          <stop offset="100%" stopColor="rgba(230, 236, 248, 0.35)" />
        </radialGradient>
      </defs>

      <circle className={styles.outerRing} cx="0" cy="0" r="121" />

      {/* 兩魚固定間距、同一剛體繞圓心 0,0 順時針公轉，相對角度恆定，物理上不可能重疊碰撞 */}
      <g className={styles.fishOrbit}>
        <g className={`${styles.fish} ${styles.yinFish}`}>
          <path
            d="M 0 -120 A 120 120 0 0 0 0 120 A 60 60 0 0 0 0 0 A 60 60 0 0 1 0 -120 Z"
            fill="url(#taijiDarkGradient)"
            stroke="rgba(230, 236, 248, 0.55)"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx="0" cy="-60" r="17" fill="#f5f7fb" />
        </g>

        <g className={`${styles.fish} ${styles.yangFish}`}>
          <path
            d="M 0 -120 A 60 60 0 0 0 0 0 A 60 60 0 0 1 0 120 A 120 120 0 0 0 0 -120 Z"
            fill="url(#taijiLightGradient)"
            stroke="rgba(17, 21, 29, 0.5)"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx="0" cy="60" r="17" fill="#11151d" />
        </g>
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
