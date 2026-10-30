'use client';
/** 寶珠精修：單顆珠（奢華感的低調）。純 CSS 形狀＋漸層，不使用任何新圖檔。 */
import type { CSSProperties } from 'react';
import type { BeastElement } from '@/lib/beast-game/elements';
import { MATCH3_ORB_LABEL } from '@/lib/beast-game/match3';
import { magicIntensity } from '@/lib/beast-game/match3/bead-visual-config';
import bp from './BeadPolish.module.css';

export function BeadOrb({ el, magicPower = 0, shimmerDelay = 0 }: { el: BeastElement; magicPower?: number; shimmerDelay?: number }) {
  const style = { ['--d' as string]: `${shimmerDelay}ms`, ['--mi' as string]: magicPower > 0 ? magicIntensity(magicPower) : 0 } as CSSProperties;
  return (
    <span className={bp.bead} data-el={el} style={style} aria-hidden="true">
      <span className={bp.halo} />
      <span className={bp.rim}><span className={bp.body} /></span>
      <span className={bp.sheen} />
      {magicPower > 0 && <span className={bp.facets} />}
      <span className={bp.glyph}>{MATCH3_ORB_LABEL[el]}</span>
      {magicPower > 0 && <span className={bp.nbadge}>{magicPower}</span>}
    </span>
  );
}