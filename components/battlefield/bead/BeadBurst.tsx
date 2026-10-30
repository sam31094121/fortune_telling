'use client';
/** 寶珠精修：消除粒子（少、小、柔和淡出），只用 transform／opacity。 */
import type { CSSProperties } from 'react';
import type { BeastElement } from '@/lib/beast-game/elements';
import { ELEMENT_PALETTE } from '@/lib/beast-game/element-palette';
import { MATCH3_COLS, MATCH3_ROWS } from '@/lib/beast-game/match3/config';
import { BEAD_TIMING, PARTICLES_MAX, PARTICLES_PER_BEAD } from '@/lib/beast-game/match3/bead-visual-config';
import bp from './BeadPolish.module.css';

export interface BurstCell { r: number; c: number; el: BeastElement; order: number }

export function BeadBurst({ cells }: { cells: BurstCell[] }) {
  const parts: { key: string; style: CSSProperties }[] = [];
  const every = Math.max(1, Math.ceil((cells.length * PARTICLES_PER_BEAD) / PARTICLES_MAX));
  cells.forEach((cell, i) => {
    if (i % every) return;
    for (let j = 0; j < PARTICLES_PER_BEAD; j++) {
      const a = (cell.order * 2.39 + j * Math.PI) % (Math.PI * 2);
      parts.push({ key: `${cell.r}-${cell.c}-${j}`, style: {
        left: `${((cell.c + 0.5) / MATCH3_COLS) * 100}%`, top: `${((cell.r + 0.5) / MATCH3_ROWS) * 100}%`,
        background: ELEMENT_PALETTE[cell.el],
        ['--dx' as string]: `${Math.cos(a) * 18}px`, ['--dy' as string]: `${Math.sin(a) * 18 - 6}px`,
        animationDelay: `${Math.min(cell.order * BEAD_TIMING.popStaggerMs, BEAD_TIMING.popStaggerMaxMs) + 90}ms`,
      } as CSSProperties });
    }
  });
  return <div className={bp.burst} aria-hidden="true" data-testid="bead-burst">{parts.map((p) => <i key={p.key} style={p.style} />)}</div>;
}

export function CascadeLabel({ step }: { step: number }) {
  if (step < 2) return null;
  return <div key={step} className={bp.cascade} data-testid="cascade-label" aria-live="polite">連鎖 ×{step}</div>;
}