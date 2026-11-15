'use client';
import type { BeastElement } from '@/lib/beast-game/elements';
import { ELEMENT_PALETTE } from '@/lib/beast-game/element-palette';
import { counterVisualPath } from '@/lib/beast-game/match3/counter-visual';
import styles from './Match3Board.module.css';
export interface ElementFlight { id: string; element: BeastElement; x1: number; y1: number; x2: number; y2: number; amount: number; sourceId?: string; targetId?: string; sourceName?: string; targetName?: string; hpBefore?: number; hpAfter?: number }
const shapes: Record<BeastElement,string> = {
  SPACE:'M-22,-3 L10,-5 L26,0 L10,5 L-22,3 Z M-12,-9 L-12,9',
  AIR:'M-23,3 Q-12,-12 0,0 Q12,12 23,-3 M0,0 L9,-12 M9,-12 L14,-2',
  WATER:'M-22,0 Q-4,-14 24,0 Q-4,14 -22,0 Z',
  FIRE:'M-22,7 Q-6,4 -10,-12 Q4,-5 24,0 Q8,13 -22,7 Z',
  EARTH:'M-16,-11 L8,-14 L22,-3 L16,12 L-8,14 L-22,3 Z',
};
export default function OrbElementAttack({ flights, side }: { flights: ElementFlight[]; side: 'ally'|'enemy' }) {
  if (!flights.length) return null;
  return <svg className={styles.elementAttack} aria-hidden="true" data-side={side} data-testid={`orb-${side}-weapons`}>
    {flights.map(f=>{
      const enemy = side === 'enemy';
      const character = counterVisualPath(f.sourceId ?? '', f.element, f.x1, f.y1, f.x2, f.y2);
      const visual = enemy || character.lightning ? character : null;
      const path=visual?.path ?? `M ${f.x1} ${f.y1} Q ${(f.x1+f.x2)/2+24} ${(f.y1+f.y2)/2} ${f.x2} ${f.y2}`;
      const dx = f.x2-f.x1, dy = f.y2-f.y1, length = Math.hypot(dx,dy) || 1;
      const fork = (t: number, direction: number) => { const x=f.x1+dx*t,y=f.y1+dy*t,nx=-dy/length*direction,ny=dx/length*direction; return `M ${x} ${y} l ${nx*12-dx*.025} ${ny*12-dy*.025} l ${nx*7+dx*.045} ${ny*7+dy*.045}`; };
      return <g key={f.id} className={enemy ? styles.enemyEnergy : undefined} style={{color:ELEMENT_PALETTE[f.element]}} data-element={f.element} data-source-id={f.sourceId} data-target-id={f.targetId} data-actual-damage={f.amount} data-hp-before={f.hpBefore} data-hp-after={f.hpAfter} data-lightning={visual?.lightning || undefined}>
        <title>{f.sourceName} → {f.targetName}：{f.amount}{f.hpBefore !== undefined && f.hpAfter !== undefined ? `，生命 ${f.hpBefore} → ${f.hpAfter}` : ''}</title>
        <path className={enemy ? styles.enemyEnergyTrail : undefined} d={path} fill="none" stroke="currentColor" strokeWidth={visual?.width ?? 3} opacity=".6" pathLength="1" />
        {visual?.lightning && <g className={styles.lightningCore} fill="none" strokeLinecap="round" strokeLinejoin="round"><path d={path} stroke="#fff8e2" strokeWidth="1.4"/><path d={fork(.32,1)+' '+fork(.66,-1)} stroke="currentColor" strokeWidth="1.5"/></g>}
        {enemy && <g transform={`translate(${f.x1} ${f.y1})`} className={styles.enemyEnergySource}><ellipse rx="19" ry="12" fill="none" stroke="currentColor" strokeWidth="2"/><ellipse rx="8" ry="5" fill="#fff2d2" opacity=".8"/></g>}
        <g className={styles.flyingWeapon}>
          {/* Enemy energy is a hollow elemental head with a split directional wake;
              player energy keeps the existing solid elemental silhouette. */}
          {enemy && <path d="M-30,-11 L-19,0 L-30,11 M-19,-11 L-8,0 L-19,11" fill="none" stroke="currentColor" strokeWidth="3" />}
          <path d={shapes[f.element]} fill={enemy ? '#171e2b' : 'currentColor'} stroke={enemy ? 'currentColor' : '#fff4d2'} strokeWidth={enemy ? 2 : 1.5}/>
          {enemy && <path d={shapes[f.element]} transform="scale(.48)" fill="currentColor" stroke="#fff2d2" strokeWidth="1.2"/>}
          <animateMotion dur={enemy ? '.22s' : '.65s'} path={path} rotate="auto" fill="freeze" />
        </g>
        {enemy && <g transform={`translate(${f.x2} ${f.y2})`}><g className={styles.enemyEnergyImpact} fill="none" stroke="currentColor"><ellipse rx="24" ry="13" strokeWidth="2"/><ellipse rx="13" ry="7" stroke="#fff2d2" strokeWidth="1.5"/><path d="M-30,-16l9,5 M30,-16l-9,5 M-30,16l9,-5 M30,16l-9,-5" strokeWidth="2"/></g></g>}
        {!enemy && <text x={f.x2} y={f.y2-12} textAnchor="middle" fill="currentColor" fontSize="16" fontWeight="bold">−{f.amount}</text>}
      </g>;
    })}
  </svg>;
}
