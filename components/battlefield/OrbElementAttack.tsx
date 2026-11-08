'use client';
import type { BeastElement } from '@/lib/beast-game/elements';
import { ELEMENT_PALETTE } from '@/lib/beast-game/element-palette';
import styles from './Match3Board.module.css';
export interface ElementFlight { id: string; element: BeastElement; x1: number; y1: number; x2: number; y2: number; amount: number }
const shapes: Record<BeastElement,string> = {
  SPACE:'M-22,-3 L10,-5 L26,0 L10,5 L-22,3 Z M-12,-9 L-12,9',
  AIR:'M-23,3 Q-12,-12 0,0 Q12,12 23,-3 M0,0 L9,-12 M9,-12 L14,-2',
  WATER:'M-22,0 Q-4,-14 24,0 Q-4,14 -22,0 Z',
  FIRE:'M-22,7 Q-6,4 -10,-12 Q4,-5 24,0 Q8,13 -22,7 Z',
  EARTH:'M-16,-11 L8,-14 L22,-3 L16,12 L-8,14 L-22,3 Z',
};
export default function OrbElementAttack({ flights, side }: { flights: ElementFlight[]; side: 'ally'|'enemy' }) {
  if (!flights.length) return null;
  return <svg className={styles.elementAttack} aria-hidden="true" data-testid={`orb-${side}-weapons`}>
    {flights.map(f=>{
      const path=`M ${f.x1} ${f.y1} Q ${(f.x1+f.x2)/2+24} ${(f.y1+f.y2)/2} ${f.x2} ${f.y2}`;
      return <g key={f.id} style={{color:ELEMENT_PALETTE[f.element]}} data-element={f.element}>
        <path d={path} fill="none" stroke="currentColor" strokeWidth={side==='ally'?3:2} strokeDasharray={side==='enemy'?'5 7':undefined} opacity=".6" />
        <g className={styles.flyingWeapon}><path d={shapes[f.element]} fill="currentColor" stroke="#fff4d2" strokeWidth="1.5"/><animateMotion dur={side === 'enemy' ? '.35s' : '.65s'} path={path} rotate="auto" fill="freeze" /></g>
        <text x={f.x2} y={f.y2-12} textAnchor="middle" fill="currentColor" fontSize="16" fontWeight="bold">−{f.amount}</text>
      </g>;
    })}
  </svg>;
}
