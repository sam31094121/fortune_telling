import type { CSSProperties } from 'react';
import { ORB_MATERIAL, type ProductElement } from './elementOrbPalette';
import { SharedElementSealPaper } from './SharedElementSealPaper';
import styles from './ElementTreasureOrb.module.css';
import referenceStyles from '@/components/battlefield/ElementOrbDisplay.module.css';
import { ElementOrbVisual } from './ElementOrbVisual';

// Fixed, staggered elemental rhythms; never random and never a ritual timer.
const RHYTHM: Record<ProductElement, { float: string; pulse: string; delay: string }> = {
  空: { float: '6.7s', pulse: '4.9s', delay: '-1.3s' },
  風: { float: '4.3s', pulse: '3.7s', delay: '-2.1s' },
  水: { float: '5.8s', pulse: '4.4s', delay: '-3.2s' },
  火: { float: '4.9s', pulse: '3.1s', delay: '-0.7s' },
  地: { float: '7.6s', pulse: '5.9s', delay: '-4.6s' },
};

/** Reuse the reference's complete core, ring, inner light and pulse material.
 * Shared presentation only:
 * callers still own selection, seal state, ritual timing and awards. */
export function ElementTreasureOrb({ element, released, burning = false, preview, animated = true, visualScale }: {
  element: ProductElement;
  released: boolean;
  burning?: boolean;
  animating?: boolean;
  preview?: boolean;
  animated?: boolean;
  visualScale?: number;
}) {
  const palette = ORB_MATERIAL[element];
  const rhythm = RHYTHM[element];
  const rgb = palette.light.slice(1).match(/.{2}/g)!.map(value => parseInt(value, 16)).join(', ');
  return (
    <span
      className={`${referenceStyles.orbContainer} ${styles.orb}`}
      data-soft-element-orb={element}
      data-element-treasure-orb={element}
      data-state={burning ? 'opening' : released ? 'released' : 'sealed'}
      data-animated={animated}
      aria-hidden="true"
      style={{ '--orb-glow': palette.light, '--orb-ring': palette.ring, '--orb-glow-rgb': rgb, '--orb-size': '100%', '--orb-scale': visualScale ?? (preview ? 1.34 : 2.64),
        '--orb-float-duration': rhythm.float, '--orb-pulse-duration': rhythm.pulse, '--orb-pulse-delay': rhythm.delay, '--orb-float-distance': preview ? '3px' : '5px',
      } as CSSProperties}
    >
      <ElementOrbVisual />
      {(!released || burning) && <SharedElementSealPaper burning={burning} />}
    </span>
  );
}
