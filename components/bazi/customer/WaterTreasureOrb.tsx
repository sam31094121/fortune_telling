'use client';
import { ElementTreasureOrb } from './ElementTreasureOrb';
import type { ProductElement } from './elementOrbPalette';
export type { ProductElement } from './elementOrbPalette';
/** Compatibility entry point. Legacy material/profile hints now share the orb system.
 * Selection, twelve-second ritual timing and awards remain with the caller. */
export function WaterTreasureOrb({ element, released, preview = false, burnSealOnRelease = false, animating = false }: {
  element: ProductElement;
  released: boolean;
  variant?: 'crystal' | 'caustic' | 'luminous';
  preview?: boolean;
  burnSealOnRelease?: boolean;
  animating?: boolean;
  displayProfile?: 'default' | 'mobile-reward' | 'home-soft';
}) {
  return <ElementTreasureOrb element={element} released={released}
    burning={released && burnSealOnRelease && animating} preview={preview} />;
}
