'use client';

import styles from './TaijiCoreVisual.module.css';

export type TaijiVisualStage = 'idle' | 'taiji' | 'liangyi' | 'sixiang' | 'bagua';

type ElementKey = 'EARTH' | 'WATER' | 'FIRE' | 'AIR' | 'SPACE';
type BaguaDefinition = { id: string; angle: number; element: ElementKey; lines: [boolean, boolean, boolean] };
type FourSymbolDefinition = { id: string; angle: number; pattern: [boolean, boolean] };
type ElementGemDefinition = { id: ElementKey; angle: number; colorClass: string };

const BAGUA: BaguaDefinition[] = [
  { id: 'qian', angle: 0, element: 'SPACE', lines: [true, true, true] },
  { id: 'dui', angle: 45, element: 'SPACE', lines: [false, true, true] },
  { id: 'li', angle: 90, element: 'FIRE', lines: [true, false, true] },
  { id: 'zhen', angle: 135, element: 'AIR', lines: [false, false, true] },
  { id: 'xun', angle: 180, element: 'AIR', lines: [true, true, false] },
  { id: 'kan', angle: 225, element: 'WATER', lines: [false, true, false] },
  { id: 'gen', angle: 270, element: 'EARTH', lines: [true, false, false] },
  { id: 'kun', angle: 315, element: 'EARTH', lines: [false, false, false] },
];

const FOUR_SYMBOLS: FourSymbolDefinition[] = [
  { id: 'greater-yang', angle: 45, pattern: [true, true] },
  { id: 'lesser-yin', angle: 135, pattern: [true, false] },
  { id: 'greater-yin', angle: 225, pattern: [false, false] },
  { id: 'lesser-yang', angle: 315, pattern: [false, true] },
];

const ELEMENT_GEMS: ElementGemDefinition[] = [
  { id: 'SPACE', angle: 0, colorClass: styles.gemSpace },
  { id: 'FIRE', angle: 72, colorClass: styles.gemFire },
  { id: 'AIR', angle: 144, colorClass: styles.gemAir },
  { id: 'WATER', angle: 216, colorClass: styles.gemWater },
  { id: 'EARTH', angle: 288, colorClass: styles.gemEarth },
];

function polarPoint(angle: number, radius: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
}

type TaijiCoreVisualProps = {
  active?: boolean;
  stage?: TaijiVisualStage;
  highlightElement?: ElementKey | null;
  className?: string;
};

function TrigramLines({ lines }: { lines: [boolean, boolean, boolean] }) {
  return (
    <g className={styles.trigramLines}>
      {lines.map((solid, index) => {
        const y = -10 + index * 10;
        if (solid) {
          return <rect key={index} x="-14" y={y} width="28" height="3.2" rx="1.6" />;
        }
        return (
          <g key={index}>
            <rect x="-14" y={y} width="10.5" height="3.2" rx="1.6" />
            <rect x="3.5" y={y} width="10.5" height="3.2" rx="1.6" />
          </g>
        );
      })}
    </g>
  );
}

function FourSymbolMark({ pattern }: { pattern: [boolean, boolean] }) {
  return (
    <g className={styles.fourSymbolMark}>
      {pattern.map((solid, index) => {
        const y = -5 + index * 10;
        if (solid) return <rect key={index} x="-12" y={y} width="24" height="3.4" rx="1.7" />;
        return (
          <g key={index}>
            <rect x="-12" y={y} width="8.5" height="3.4" rx="1.7" />
            <rect x="3.5" y={y} width="8.5" height="3.4" rx="1.7" />
          </g>
        );
      })}
    </g>
  );
}

export default function TaijiCoreVisual({ active = false, stage = 'idle', highlightElement = null, className = '' }: TaijiCoreVisualProps) {
  const splitApart = stage === 'liangyi' || stage === 'sixiang' || stage === 'bagua';
  const showFiveStars = splitApart;
  const showFourSymbols = stage === 'sixiang' || stage === 'bagua';
  const showBagua = stage === 'bagua';
  const stageClass = stage === 'bagua'
    ? styles.stageBagua
    : stage === 'sixiang'
      ? styles.stageSixiang
      : stage === 'liangyi'
        ? styles.stageLiangyi
        : stage === 'taiji'
          ? styles.stageTaiji
          : styles.stageIdle;

  return (
    <svg
      className={`${styles.svg} ${stageClass} ${active ? styles.active : ''} ${className}`.trim()}
      viewBox="-190 -190 380 380"
      role="img"
      aria-label="Taiji core emblem"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <radialGradient id="tdhTaijiLightGradient" cx="30%" cy="22%" r="88%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f8fafc" />
        </radialGradient>
        <radialGradient id="tdhTaijiDarkGradient" cx="34%" cy="24%" r="90%">
          <stop offset="0%" stopColor="#111827" />
          <stop offset="100%" stopColor="#020204" />
        </radialGradient>
        <radialGradient id="tdhTaijiSurfaceGlow" cx="34%" cy="24%" r="78%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
          <stop offset="46%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id="tdhTaijiRingGradient" cx="50%" cy="50%" r="50%">
          <stop offset="78%" stopColor="rgba(255,255,255,0)" />
          <stop offset="90%" stopColor="rgba(253,230,138,0.78)" />
          <stop offset="97%" stopColor="rgba(103,232,249,0.62)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
        </radialGradient>
        <filter id="tdhTaijiSoftShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#020617" floodOpacity="0.45" />
        </filter>
      </defs>

      <g className={styles.auraRings} aria-hidden="true">
        <circle className={styles.outerHalo} cx="0" cy="0" r="168" />
        <circle className={styles.middleHalo} cx="0" cy="0" r="146" />
        <circle className={styles.innerOrbit} cx="0" cy="0" r="132" />
      </g>

      <g className={`${styles.elementOrbit} ${showFiveStars ? styles.elementOrbitVisible : ''}`} aria-hidden="true">
        {ELEMENT_GEMS.map((gem, index) => {
          const { x, y } = polarPoint(gem.angle, 142);
          const highlighted = highlightElement === gem.id;
          return (
            <g
              key={gem.id}
              className={`${styles.elementGem} ${gem.colorClass} ${highlighted ? styles.elementGemHighlight : ''}`}
              transform={`translate(${x} ${y})`}
              style={{ transitionDelay: `${index * 70}ms` }}
            >
              <circle r="9.5" />
              <circle className={styles.elementGemCore} r="4.2" />
            </g>
          );
        })}
      </g>

      <circle className={styles.outerRing} cx="0" cy="0" r="122" />

      <g className={styles.fishOrbit} filter="url(#tdhTaijiSoftShadow)">
        <g className={`${styles.fish} ${styles.yinFish}`}>
          <path
            className={styles.fishBody}
            d="M 0 -120 A 120 120 0 0 1 0 120 A 60 60 0 0 1 0 0 A 60 60 0 0 0 0 -120 Z"
            fill="#050505"
          />
          <path
            className={styles.fishEdgeDark}
            d="M 0 -120 A 120 120 0 0 1 0 120 A 60 60 0 0 1 0 0 A 60 60 0 0 0 0 -120 Z"
          />
        </g>

        <g className={`${styles.fish} ${styles.yangFish}`}>
          <path
            className={styles.fishBody}
            d="M 0 -120 A 120 120 0 0 0 0 120 A 60 60 0 0 0 0 0 A 60 60 0 0 1 0 -120 Z"
            fill="#ffffff"
          />
          <path
            className={styles.fishEdgeLight}
            d="M 0 -120 A 120 120 0 0 0 0 120 A 60 60 0 0 0 0 0 A 60 60 0 0 1 0 -120 Z"
          />
        </g>
        <circle className={styles.taijiDotLight} cx="0" cy="-60" r="15" />
        <circle className={styles.taijiDotDark} cx="0" cy="60" r="15" />
        <circle className={styles.eyeGlintOnLightDot} cx="-5" cy="-66" r="3.2" />
        <circle className={styles.eyeGlintOnDarkDot} cx="-5" cy="54" r="3.2" />
      </g>

      {/* 陰陽兩眼永久保留在核心中；外層演化只能襯托，不能遮蔽。 */}
      <g className={`${styles.fourSymbols} ${showFourSymbols ? styles.fourSymbolsVisible : ''}`} aria-hidden="true">
        {FOUR_SYMBOLS.map((item, index) => (
          <g
            key={item.id}
            transform={`translate(${polarPoint(item.angle, 86).x} ${polarPoint(item.angle, 86).y}) rotate(${item.angle - 90})`}
            className={styles.fourSymbolItem}
            style={{ transitionDelay: `${index * 90}ms` }}
          >
            <circle r="23" className={styles.symbolCircle} />
            <FourSymbolMark pattern={item.pattern} />
          </g>
        ))}
      </g>

      <g className={`${styles.baguaGroup} ${showBagua ? styles.baguaGroupVisible : ''}`} aria-hidden="true">
        {BAGUA.map((item, index) => {
          const { x, y } = polarPoint(item.angle, 160);
          const highlighted = showBagua && highlightElement === item.element;
          return (
            <g
              key={item.id}
              transform={`translate(${x} ${y}) rotate(${item.angle})`}
              className={`${styles.baguaItem} ${highlighted ? styles.baguaItemHighlight : ''}`}
              style={{ transitionDelay: `${index * 70}ms` }}
            >
              <circle r="25" className={styles.baguaCircle} />
              <TrigramLines lines={item.lines} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
