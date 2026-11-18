'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ElementTreasureOrb } from '@/components/bazi/customer/ElementTreasureOrb';
import { getProductOrbFromBrand } from '@/lib/five-element-orb-map';
import { DROP_FIELD, type OrbDrop, type DropCatch } from '@/lib/beast-game/match3/orb-drop';
import styles from './OrbDropAnimation.module.css';

/** Plays server points only; neither hit testing nor inventory changes happen here. */
export default function OrbDropAnimation({ drops, catches, onDone, onSound }: {
  drops: OrbDrop[]; catches: DropCatch[]; onDone: () => void; onSound: (kind: 'drop' | 'merge') => void;
}) {
  const root = useRef<HTMLDivElement>(null), done = useRef(onDone), sound = useRef(onSound);
  done.current = onDone; sound.current = onSound;
  const [bounds, setBounds] = useState<{left:number;top:number;width:number;height:number} | null>(null);
  const [received, setReceived] = useState<string[]>([]);
  useLayoutEffect(() => {
    const parent = root.current?.parentElement, board = parent?.querySelector('[data-testid="match3-board"]');
    const team = parent?.querySelector('[data-testid="match3-ally"]')?.parentElement;
    if (!parent || !board || !team) return;
    const measure = () => {
      const p = parent.getBoundingClientRect(), b = board.getBoundingClientRect(), t = team.getBoundingClientRect();
      setBounds({left:t.left-p.left,top:b.top-p.top,width:t.width,height:Math.max(1,t.top-b.top)});
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(parent); observer.observe(team);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!bounds || !root.current) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animations = drops.map(drop => {
      const el = root.current!.querySelector<HTMLElement>(`[data-drop-index="${drop.index}"]`)!;
      return el.animate(drop.points.map(p => ({ offset:p.t/drop.durationMs, left:`${p.x/10}%`, top:`${p.y/DROP_FIELD.height*100}%` })),
        {duration: reduced ? 1 : drop.durationMs, delay: reduced ? 0 : drop.delayMs, fill:'both', easing:'linear'});
    });
    let raf = 0, ended = false, receiptAt: number | null = null;
    const lastImpact = drops.map(() => -1), landed = new Set<number>();
    const visibility = () => animations.forEach(a => {
        if (document.hidden && a.playState === 'running') a.pause();
        else if (!document.hidden && a.playState === 'paused') a.play();
      });
    visibility(); document.addEventListener('visibilitychange', visibility);
    const tick = () => {
      if (ended) return;
      animations.forEach((a,i) => {
        const drop=drops[i], time=Number(a.currentTime ?? 0)-drop.delayMs;
        if (!document.hidden && !reduced) {
          let impact=-1; drop.impacts.forEach((t,j)=>{if(t<=time)impact=j;});
          if (impact>lastImpact[i]) { sound.current('drop'); lastImpact[i]=impact; }
        }
        if (a.playState==='finished' && !landed.has(i)) {
          landed.add(i);
          const el=root.current?.querySelector<HTMLElement>(`[data-drop-index="${drop.index}"]`);
          if(el) el.dataset.landed='true';
          if(drop.ownerId) { setReceived(ids=>[...ids,drop.ownerId!]); if(!document.hidden)sound.current('merge'); }
          else if(!document.hidden)sound.current('drop');
        }
      });
      if (landed.size===drops.length && !document.hidden) {
        receiptAt ??= performance.now();
        if(performance.now()-receiptAt >= (reduced ? 0 : 550)) { ended=true; done.current(); return; }
      }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return () => { ended=true;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);animations.forEach(a=>a.cancel()); };
    // A resize rescales the same path; it does not reroll or restart the timeline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!bounds, drops]);
  return <div ref={root} className={styles.stage} style={bounds ?? {visibility:'hidden'}} data-testid="orb-drop-stage" aria-label="法珠掉落" role="status">
    <svg className={styles.pegs} viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true">
      {DROP_FIELD.pegs.map(p=><circle key={p.x+':'+p.y} cx={p.x} cy={p.y} r="13"/>)}
      {catches.map(c=><path key={c.ownerId} data-caught={received.includes(c.ownerId)||undefined} d={`M${c.left} 620 V646 H${c.right} V620`}/>)}
    </svg>
    {drops.map(d=><div key={d.index} className={styles.orb} data-drop-index={d.index} data-owner={d.ownerId ?? ''}>
      <ElementTreasureOrb element={getProductOrbFromBrand(d.element.toLowerCase() as 'space'|'air'|'water'|'fire'|'earth')} released animated={false}/>
    </div>)}
  </div>;
}
