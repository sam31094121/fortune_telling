'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ElementTreasureOrb } from '@/components/bazi/customer/ElementTreasureOrb';
import { getProductOrbFromBrand } from '@/lib/five-element-orb-map';
import { DROP_FIELD, dropDividers, type OrbDrop, type DropCatch } from '@/lib/beast-game/match3/orb-drop';
import styles from './OrbDropAnimation.module.css';
import boardStyles from './Match3Board.module.css';
import Match3ElementGlyph from './Match3ElementGlyph';

/** Plays server points only; neither hit testing nor inventory changes happen here. */
export default function OrbDropAnimation({ drops, catches, onDone, onSound }: {
  drops: OrbDrop[]; catches: DropCatch[]; onDone: () => void; onSound: (kind: 'drop' | 'merge') => void;
}) {
  const root = useRef<HTMLDivElement>(null), done = useRef(onDone), sound = useRef(onSound);
  done.current = onDone; sound.current = onSound;
  const [bounds, setBounds] = useState<{left:number;top:number;width:number;height:number} | null>(null);
  const [rewards, setRewards] = useState<{index:number;x:number;y:number}[]>([]);
  useLayoutEffect(() => {
    const parent = root.current?.parentElement, board = parent?.querySelector('[data-testid="match3-board"]');
    const team = parent?.querySelector('[data-testid="match3-ally"]')?.parentElement;
    if (!parent || !board || !team) return;
    const measure = () => {
      const p = parent.getBoundingClientRect(), b = board.getBoundingClientRect(), t = team.getBoundingClientRect();
      setBounds({left:t.left-p.left,top:b.top-p.top,width:t.width,height:Math.max(1,t.top-b.top + Math.min(48,t.height * .25))});
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(parent); observer.observe(team);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!bounds || !root.current) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const playbackScale = 1.2;
    const animations = drops.map(drop => {
      const el = root.current!.querySelector<HTMLElement>(`[data-drop-index="${drop.index}"]`)!;
      return el.animate(drop.points.map(p => ({ offset:p.t/drop.durationMs, left:`${p.x/10}%`, top:`${p.y/DROP_FIELD.height*100}%` })),
        {duration: reduced ? 1 : drop.durationMs * playbackScale, delay: reduced ? 0 : drop.delayMs * playbackScale, fill:'both', easing:'linear'});
    });
    let raf = 0, ended = false, receiptAt: number | null = null;
    const lastImpact = drops.map(() => -1), landed = new Set<number>();
    const cardGlows: Animation[] = [];
    let sinking = 0;
    const visibility = () => [...animations,...cardGlows].forEach(a => {
        if (document.hidden && a.playState === 'running') a.pause();
        else if (!document.hidden && a.playState === 'paused') a.play();
      });
    visibility(); document.addEventListener('visibilitychange', visibility);
    const tick = () => {
      if (ended) return;
      animations.forEach((a,i) => {
        const drop=drops[i], time=Number(a.currentTime ?? 0)/playbackScale-drop.delayMs;
        if (!document.hidden && !reduced) {
          let impact=-1; drop.impacts.forEach((t,j)=>{if(t<=time)impact=j;});
          if (impact>lastImpact[i]) { sound.current('drop'); lastImpact[i]=impact; }
        }
        if (a.playState==='finished' && !landed.has(i)) {
          landed.add(i);
          const el=root.current?.querySelector<HTMLElement>(`[data-drop-index="${drop.index}"]`);
          if(drop.ownerId) {
            const card=Array.from(root.current?.parentElement?.querySelectorAll<HTMLElement>('[data-testid="match3-ally"]') ?? []).find(c=>c.dataset.id===drop.ownerId);
            if(card) cardGlows.push(card.animate([
              {boxShadow:'0 0 0 0 transparent'},
              {boxShadow:'0 0 18px 5px #ffda68',offset:.35},
              {boxShadow:'0 0 0 0 transparent'}
            ],{duration:reduced?1:550,easing:'ease-out'}));
            const weapon=Array.from(root.current?.parentElement?.querySelectorAll<HTMLElement>('[data-treasure][data-owner]') ?? []).find(w=>w.dataset.owner===drop.ownerId);
            if(weapon && root.current && el) {
              const w=weapon.getBoundingClientRect(), r=root.current.getBoundingClientRect(), e=el.getBoundingClientRect();
              const x=e.left+e.width/2-r.left, y=e.top+e.height/2-r.top;
              const tx=w.left+w.width/2-r.left, ty=w.top+w.height/2-r.top;
              sinking++;
              const sink=el.animate([
                {left:x+'px',top:y+'px',transform:'translate(-50%,-50%) scale(1)'},
                {left:x+'px',top:(y-5)+'px',transform:'translate(-50%,-50%) scale(.96)',offset:.15},
                {left:tx+'px',top:ty+'px',transform:'translate(-50%,-50%) scale(.7)'}
              ],{duration:reduced?1:900,fill:'forwards',easing:'ease-in'});
              cardGlows.push(sink);
              sink.onfinish=()=>{
                if(ended)return;
                sinking--; el.dataset.landed='true';
                setRewards(items=>[...items,{index:drop.index,x:tx,y:w.top-r.top}]);
                cardGlows.push(weapon.animate([{filter:'brightness(1)'},{filter:'brightness(1.8)',offset:.3},{filter:'brightness(1)'}],{duration:reduced?1:550}));
                if(!document.hidden)sound.current('merge');
              };
            } else if(el) el.dataset.landed='true';
          }
          else if(el && root.current) {
            const r=root.current.getBoundingClientRect(), e=el.getBoundingClientRect();
            const inventory=root.current.parentElement?.querySelector('[data-testid="orb-treasures"]')?.getBoundingClientRect();
            const x=e.left+e.width/2-r.left, y=e.top+e.height/2-r.top;
            sinking++;
            const miss=el.animate([
              {left:x+'px',top:y+'px',opacity:1},
              {left:x+'px',top:((inventory?.bottom ?? r.bottom+60)-r.top)+'px',opacity:1,offset:.85},
              {left:x+'px',top:((inventory?.bottom ?? r.bottom+60)-r.top+8)+'px',opacity:0}
            ],{duration:reduced?1:900,fill:'forwards',easing:'ease-in'});
            cardGlows.push(miss);
            miss.onfinish=()=>{if(ended)return;sinking--;el.dataset.landed='true';if(!document.hidden)sound.current('drop');};
          }
        }
      });
      if (landed.size===drops.length && sinking===0 && !document.hidden) {
        receiptAt ??= performance.now();
        if(performance.now()-receiptAt >= (reduced ? 0 : 550)) { ended=true; done.current(); return; }
      }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return () => { ended=true;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);animations.forEach(a=>a.cancel());cardGlows.forEach(a=>a.cancel()); };
    // A resize rescales the same path; it does not reroll or restart the timeline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!bounds, drops]);
  return <div ref={root} className={styles.stage} style={bounds ?? {visibility:'hidden'}} data-testid="orb-drop-stage" aria-label="法珠掉落" role="status">
    <svg className={styles.pegs} viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true">
      {DROP_FIELD.pegs.map(p=><circle key={p.x+':'+p.y} cx={p.x} cy={p.y} r="13"/>)}
    </svg>
    {dropDividers(catches).map(p=><span key={p.x} className={`${styles.divider} ${boardStyles.orb} ${boardStyles.fire}`} style={{position:"absolute",width:24,height:24,minWidth:0,minHeight:0,left:`${p.x/10}%`,top:`${p.y/DROP_FIELD.height*100}%`}} aria-hidden="true"><span className={boardStyles.gem}><i className={boardStyles.sweep}/></span><Match3ElementGlyph element="FIRE" className={boardStyles.elementGlyph}/></span>)}
    {rewards.map(r=><span key={r.index} className={styles.reward} style={{left:r.x,top:r.y}} role="status" aria-label="武器增加一件">+1</span>)}
    {drops.map(d=><div key={d.index} className={styles.orb} data-drop-index={d.index} data-owner={d.ownerId ?? ''}>
      <ElementTreasureOrb element={getProductOrbFromBrand(d.element.toLowerCase() as 'space'|'air'|'water'|'fire'|'earth')} released animated={false} visualScale={0.85}/>
    </div>)}
  </div>;
}
