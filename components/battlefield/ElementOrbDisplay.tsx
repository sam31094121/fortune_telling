'use client';
import { memo } from 'react';
import styles from './ElementOrbDisplay.module.css';
import { ElementTreasureOrb } from '@/components/bazi/customer/ElementTreasureOrb';
import { ORB_MATERIAL } from '@/components/bazi/customer/elementOrbPalette';
import { getProductOrbFromBrand } from '@/lib/five-element-orb-map';
import type { BeastElement } from '@/lib/beast-game/elements';
export { ElementOrbVisual } from '@/components/bazi/customer/ElementOrbVisual';
interface ElementOrbDisplayProps {
  element: BeastElement;
  size?: 'tiny' | 'mini' | 'small' | 'medium' | 'large';
  animated?: boolean;
}
const SCALE = { tiny: .6, mini: .8, small: 1, medium: 1.5, large: 2 };
/** Battle labels show released material; they do not create an unlock interaction. */
const ElementOrbDisplay = memo(function ElementOrbDisplay({ element, size = 'medium', animated = false }: ElementOrbDisplayProps) {
  const productElement = getProductOrbFromBrand(element.toLowerCase() as 'space' | 'air' | 'water' | 'fire' | 'earth');
  return <div className={styles.orbContainer} data-size={size} data-element={productElement} data-animated={animated}
    style={{ '--orb-glow': ORB_MATERIAL[productElement].light } as React.CSSProperties}>
    <span className={styles.orbStage}><ElementTreasureOrb element={productElement} released preview animated={animated} visualScale={SCALE[size]} /></span>
    <div className={styles.orbLabel}>{productElement}</div>
  </div>;
});
export default ElementOrbDisplay;
