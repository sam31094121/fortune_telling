'use client';
import type { CSSProperties } from 'react';
import type { BeastElement } from '@/lib/beast-game/elements';
import type { treasureCatalog, TreasureUse, TreasureRole } from '@/lib/beast-game/match3/treasures';
import styles from './OrbTreasures.module.css';

const colors = { SPACE: '#d4bcff', AIR: '#7ef4ca', WATER: '#8ddcff', FIRE: '#ffb17c', EARTH: '#efce83' };
const gemColors = ['#8ee9ff','#85edb5','#d5a6ff','#ffb28d','#ffe39a'];
const roleArt: Record<TreasureRole,BeastElement> = {pierce:'SPACE',volley:'AIR',drain:'WATER',burst:'FIRE',guard:'EARTH'};
export function TreasureGlyph({ element: affinity, role }: { element: BeastElement; role?: TreasureRole }) {
  const element = role ? roleArt[role] : affinity;
  return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    {element === 'SPACE' && <><ellipse cx="24" cy="24" rx="17" ry="11" transform="rotate(-35 24 24)"/><path d="m24 3 4 17 17 4-17 4-4 17-4-17-17-4 17-4Z"/></>}
    {element === 'AIR' && <><path d="M5 26Q9 3 39 8 22 12 15 25ZM10 39Q35 44 43 16 30 32 17 30Z"/><path d="M9 18Q24 7 38 18M10 32Q24 41 39 28"/></>}
    {element === 'WATER' && <><path d="M24 3C22 13 8 21 10 32c2 17 30 16 29-1C38 19 28 14 24 3Z"/><path d="M5 29q10-9 19 0t19 0M9 36q8-8 15-1t16-1"/></>}
    {element === 'FIRE' && <><path d="m24 3 7 20-7-4-7 4Z"/><path d="M24 17v27M19 39l5-5 5 5M14 13C0 31 12 41 17 42M34 13c14 18 2 28-3 29"/></>}
    {role === 'guard' && affinity === 'WATER' && <><g strokeLinecap="round" strokeLinejoin="round"><path d="M14 21C9 20 6 14 4 15c-3 2 0 8 3 10-5-2-5 3-1 6 2 2 5 3 9 2m19-12c5-1 8-7 10-6 3 2 0 8-3 10 5-2 5 3 1 6-2 2-5 3-9 2M7 25l5 3m29-3-5 3"/><circle cx="24" cy="25" r="11"/><circle cx="24" cy="25" r="8"/><path d="M18 26q3-3 6 0t6 0M20 20l-1 2"/></g></>}
    {element === 'EARTH' && !(role === 'guard' && affinity === 'WATER') && <><path d="m24 5 16 10v23H8V15ZM8 15h32M15 23h18v9H15Z"/><path d="M3 43h42M18 15V8m12 7V8"/></>}
  </svg>;
}
export default function OrbTreasures({ catalog, disabled, guard, onUse }: { catalog: ReturnType<typeof treasureCatalog>; disabled: boolean; guard: number; onUse: (element: BeastElement, variant: number) => void }) {
  return <div className={styles.inventory} data-testid="orb-treasures" data-guard={guard}>
    <div className={styles.slots}>{catalog.map(x => <button key={x.element+':'+x.variant} type="button" data-treasure={x.element} data-variant={x.variant} data-role={x.role} data-owner={x.ownerId} data-count={x.count} disabled={disabled || x.count < 1 || !x.available} aria-label={x.name+'，第'+x.tier+'階，'+x.count+'件，點擊釋放'} onClick={() => onUse(x.element,x.variant)} style={{ '--treasure-color': colors[x.element], '--affinity-color': colors[x.element], '--gem-color': gemColors[x.variant] } as CSSProperties}><small className={styles.tier}>{x.tier}</small><TreasureGlyph element={x.element} role={x.role}/><span>{x.count}</span></button>)}</div>
  </div>;
}

export interface TreasureFlight { effect: TreasureUse['effect']; x1: number; y1: number; x2: number; y2: number; }
export function TreasureAnimation({ flight }: { flight: TreasureFlight | null }) {
  if (!flight) return null;
  const { effect: e, x1, y1, x2, y2 } = flight;
  return <div key={e.id} className={styles.animation} data-testid="treasure-animation" data-element={e.element} data-role={e.role} data-variant={e.variant} style={{ '--treasure-color': colors[e.element], '--dx': `${x2-x1}px`, '--dy': `${y2-y1}px` } as CSSProperties} aria-label={e.description} role="status">
    <div className={`${styles.source} ${styles[roleArt[e.role]]}`} style={{ left:x1, top:y1 }}><TreasureGlyph element={e.element} role={e.role}/></div>
    <div className={`${styles.target} ${styles['hit'+roleArt[e.role]]}`} style={{left:x2,top:y2}}>
      {e.role === 'pierce' && <><i/><i/></>}
      {e.role === 'volley' && e.hits.map((hit,i) => <i key={i} data-hit-damage={hit.damage}/>)}
      {e.role === 'drain' && <><i/><i/><i/></>}
      {e.role === 'burst' && <><i/><i/></>}
      {e.role === 'guard' && <><i/><i/></>}
      <span>{e.damage > 0 ? `−${e.damage}` : e.hits.some(h => h.shieldAbsorbed > 0) ? '護盾吸收' : '未造成傷害'}</span>
    </div>
  </div>;
}
