'use client';

import { memo } from 'react';
import styles from './ElementOrbDisplay.module.css';
import type { ProductElement } from '@/components/bazi/customer/WaterTreasureOrb';
import { getProductOrbFromBrand } from '@/lib/five-element-orb-map';
import type { BeastElement } from '@/lib/beast-game/elements';

interface ElementOrbDisplayProps {
  element: BeastElement;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

const ELEMENT_MAP: Record<BeastElement, ProductElement> = {
  SPACE: getProductOrbFromBrand('space'),
  AIR: getProductOrbFromBrand('air'),
  WATER: getProductOrbFromBrand('water'),
  FIRE: getProductOrbFromBrand('fire'),
  EARTH: getProductOrbFromBrand('earth'),
};

// 寶珠顏色映射（來自WaterTreasureOrb）
const ORB_COLORS: Record<ProductElement, { glow: string; ring: string }> = {
  空: { glow: '#dfd8ff', ring: '#eee9ff' },
  風: { glow: '#8dffcd', ring: '#c6ffe1' },
  水: { glow: '#60edff', ring: '#c2fbff' },
  火: { glow: '#ff9fc5', ring: '#ffd2e7' },
  地: { glow: '#ffe198', ring: '#ffebb0' },
};

const ElementOrbDisplay = memo(function ElementOrbDisplay({
  element,
  size = 'medium',
  animated = false,
}: ElementOrbDisplayProps) {
  const productElement = ELEMENT_MAP[element];
  const colors = ORB_COLORS[productElement];

  return (
    <div
      className={styles.orbContainer}
      data-size={size}
      data-element={productElement}
      data-animated={animated}
      style={{
        '--orb-glow': colors.glow,
        '--orb-ring': colors.ring,
      } as React.CSSProperties}
    >
      {/* 3D寶珠Canvas替代品 - 使用CSS模擬 */}
      <div className={styles.orbVisual}>
        {/* 外環光 */}
        <div className={styles.orbRing} />

        {/* 中心發光球 */}
        <div className={styles.orbCore} />

        {/* 邊緣Fresnel光 */}
        <div className={styles.orbEdge} />

        {/* 內部漸層 */}
        <div className={styles.orbInner} />
      </div>

      {/* 寶珠標籤 */}
      <div className={styles.orbLabel}>{productElement}</div>
    </div>
  );
});

export default ElementOrbDisplay;
