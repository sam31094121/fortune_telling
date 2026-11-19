'use client';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ORB_MATERIAL } from '@/components/bazi/customer/elementOrbPalette';
import { ElementTreasureOrb } from '@/components/bazi/customer/ElementTreasureOrb';
import { getProductOrbFromBrand } from '@/lib/five-element-orb-map';
import { DROP_FIELD, dropDividers, type OrbDrop, type DropCatch } from '@/lib/beast-game/match3/orb-drop';
import styles from './OrbDropAnimation.module.css';
import boardStyles from './Match3Board.module.css';
import Match3ElementGlyph from './Match3ElementGlyph';

/** Plays server points only; neither hit testing nor inventory changes happen here. */
export default function OrbDropAnimation({ drops, catches, onDone, onSound, onCredit }: {
  drops: OrbDrop[]; catches: DropCatch[]; onDone: () => void; onSound: (kind: 'drop' | 'merge') => void; onCredit?: (drop: OrbDrop) => void;
}) {
  const root = useRef<HTMLDivElement>(null), done = useRef(onDone), sound = useRef(onSound);
  done.current = onDone; sound.current = onSound;
  const credit = useRef(onCredit); credit.current = onCredit;
  const [bounds, setBounds] = useState<{left:number;top:number;width:number;height:number;dividerY:number} | null>(null);
  const [birthSites,setBirthSites]=useState<{x:number;y:number}[]>([]);
  const [rewards, setRewards] = useState<{index:number;x:number;y:number}[]>([]);
  useLayoutEffect(() => {
    const parent = root.current?.parentElement, board = parent?.querySelector('[data-testid="match3-board"]');
    const team = parent?.querySelector('[data-testid="match3-ally"]')?.parentElement;
    if (!parent || !board || !team) return;
    const measure = () => {
      const p = parent.getBoundingClientRect(), b = board.getBoundingClientRect(), t = team.getBoundingClientRect();
      const single = team.getAttribute('data-last-ally') === 'true' ? Array.from(team.querySelectorAll<HTMLElement>('[data-testid="match3-ally"]')).find(c => Number(c.dataset.hp) > 0)?.getBoundingClientRect() : undefined;
      const bottom = single ? single.top - 10 : t.bottom + 12;
      setBirthSites(drops.map(d=>{const cell=d.source?board.querySelector('[data-r="'+d.source.r+'"][data-c="'+d.source.c+'"]'):null;const c=cell?.getBoundingClientRect();return {x:c?c.left+c.width/2-t.left:t.width/2,y:c?c.top+c.height/2-b.top:16};}));
      setBounds({left:t.left-p.left,top:b.top-p.top,width:t.width,height:Math.max(1,bottom-b.top),dividerY:Math.max(b.bottom-b.top+10,bottom-b.top-(DROP_FIELD.height-555)*t.width/DROP_FIELD.width)});
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(parent); observer.observe(team);
    return () => observer.disconnect();
  }, []);
  const pathY = (y:number) => y<=555 ? `calc(var(--drop-divider-y) * ${y/555})` : `calc(var(--drop-divider-y) + (100% - var(--drop-divider-y)) * ${(y-555)/(DROP_FIELD.height-555)})`;
  useEffect(() => {
    if (!bounds || !root.current) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const playbackScale = 1.2;
    // These keyed nodes remain mounted for this drop sequence.
    const orbNodes = drops.map(drop => root.current!.querySelector<HTMLElement>(`[data-drop-index="${drop.index}"]`)!);
    const birthNodes = drops.map(drop => root.current!.querySelector<HTMLElement>(`[data-birth-index="${drop.index}"]`));
    const animations = drops.map((drop, i) => {
      const el = orbNodes[i];
      return el.animate(drop.points.map(p => ({ offset:p.t/drop.durationMs, left:`${p.x/10}%`, top:pathY(p.y) })),
        {duration: reduced ? 1 : drop.durationMs * playbackScale, delay: reduced ? 0 : 400 + drop.delayMs * playbackScale, fill:'both', easing:'linear'});
    });
    let raf = 0, ended = false, receiptAt: number | null = null;
    const lastImpact = drops.map(() => -1), landed = new Set<number>(), birthed=new Set<number>();
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
        const drop=drops[i], time=(Number(a.currentTime ?? 0)-(reduced?0:400))/playbackScale-drop.delayMs;
        // Future waves and completed balls have no per-frame DOM work.
        if(landed.has(i) || (!reduced && time < -260)) return;
        const birth=birthNodes[i], active=time>=-260&&time<0?'true':'false';
        if(birth && birth.dataset.active!==active)birth.dataset.active=active;
        if((time>=0 || reduced) && orbNodes[i].dataset.born!=='true')orbNodes[i].dataset.born='true';
        if(time>=-260&&!birthed.has(i)){
          birthed.add(i);
          const cell=drop.source?root.current?.parentElement?.querySelector<HTMLElement>('[data-testid="match3-board"] [data-r="'+drop.source.r+'"][data-c="'+drop.source.c+'"]'):null;
          if(cell)cardGlows.push(cell.animate([{filter:'brightness(1)'},{filter:'brightness(1.7)',offset:.5},{filter:'brightness(1)'}],{duration:reduced?1:300}));
        }
        if (!document.hidden && !reduced) {
          let impact=-1; drop.impacts.forEach((t,j)=>{if(t<=time)impact=j;});
          if (impact>lastImpact[i]) { sound.current('drop'); lastImpact[i]=impact; }
        }
        if (a.playState==='finished' && !landed.has(i)) {
          landed.add(i);
          const el=orbNodes[i];
          if(drop.ownerId) {
            const card=Array.from(root.current?.parentElement?.querySelectorAll<HTMLElement>('[data-testid="match3-ally"]') ?? []).find(c=>c.dataset.id===drop.ownerId);
            if(card) cardGlows.push(card.animate([
              {boxShadow:'0 0 0 0 transparent'},
              {boxShadow:'0 0 18px 5px #ffda68',offset:.35},
              {boxShadow:'0 0 0 0 transparent'}
            ],{duration:reduced?1:550,easing:'ease-out'}));
            const weapon=Array.from(root.current?.parentElement?.querySelectorAll<HTMLElement>('[data-treasure][data-owner]') ?? []).find(w=>w.dataset.owner===drop.ownerId && (!drop.reward || (w.dataset.treasure===drop.reward.element && Number(w.dataset.variant)===drop.reward.variant)) && w.getBoundingClientRect().width>0 && w.getBoundingClientRect().height>0);
            const destination = weapon ?? card;
            if(destination && root.current && el) {
              const w=destination.getBoundingClientRect(), r=root.current.getBoundingClientRect(), e=el.getBoundingClientRect();
              const x=e.left+e.width/2-r.left, y=e.top+e.height/2-r.top;
              const tx=w.left+w.width/2-r.left, ty=(weapon ? w.top+w.height/2 : w.bottom-10)-r.top;
              sinking++;
              const sink=el.animate([
                {left:x+'px',top:y+'px',transform:'translate(-50%,-50%) scale(1)'},
                {left:x+'px',top:(y-9)+'px',transform:'translate(-50%,-50%) scale(.96)',offset:.18},
                {left:x+'px',top:y+'px',transform:'translate(-50%,-50%) scale(.9)',offset:.35},
                {left:tx+'px',top:ty+'px',transform:'translate(-50%,-50%) scale(.7)'}
              ],{duration:reduced?1:1100,fill:'forwards',easing:'ease-in-out'});
              cardGlows.push(sink);
              sink.onfinish=()=>{
                if(ended)return;
                sinking--; el.dataset.landed='true';
                credit.current?.(drop);
                setRewards(items=>[...items,{index:drop.index,x:tx,y:w.top-r.top}]);
                cardGlows.push(destination.animate([{filter:'brightness(1)',transform:'scale(1)'},{filter:'brightness(1.8)',transform:'scale(1.12)',offset:.3},{filter:'brightness(1)',transform:'scale(1)'}],{duration:reduced?1:850}));
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
        if(performance.now()-receiptAt >= (reduced ? 0 : 900)) { ended=true; done.current(); return; }
      }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return () => { ended=true;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);animations.forEach(a=>a.cancel());cardGlows.forEach(a=>a.cancel()); };
    // A resize rescales the same path; it does not reroll or restart the timeline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!bounds, drops]);
  return <div ref={root} className={styles.stage} style={bounds ? {left:bounds.left,top:bounds.top,width:bounds.width,height:bounds.height,'--drop-divider-y':bounds.dividerY+'px'} as CSSProperties : {visibility:'hidden'}} data-testid="orb-drop-stage" aria-label="法珠掉落" role="status">
    {DROP_FIELD.pegs.map(p=><span key={p.x+":"+p.y} className={styles.peg} style={{left:`${p.x/10}%`,top:pathY(p.y)}} aria-hidden="true"/>)}
    {dropDividers(catches).map(p=><span key={p.x} data-testid="orb-card-divider" className={`${styles.divider} ${boardStyles.orb} ${boardStyles.fire}`} style={{position:"absolute",width:"9.6%",height:"calc(100% - var(--drop-divider-y))",minWidth:0,minHeight:0,left:`${p.x/10}%`,top:pathY(p.y)}} aria-hidden="true"><span className={boardStyles.gem}><i className={boardStyles.sweep}/></span><Match3ElementGlyph element="FIRE" className={boardStyles.elementGlyph}/></span>)}
    {drops.map((d,i)=><span key={d.index} className={styles.birth} data-birth-index={d.index} style={{left:birthSites[i]?.x??0,top:birthSites[i]?.y??0,color:ORB_MATERIAL[getProductOrbFromBrand(d.element.toLowerCase() as 'space'|'air'|'water'|'fire'|'earth')].light}} aria-hidden="true"><svg viewBox="0 0 40 70"><path d="M23 0L12 22L25 19L13 43L24 38L18 65"/></svg></span>)}
    {rewards.map(r=><span key={r.index} className={styles.reward} style={{left:r.x,top:r.y}} role="status" aria-label="武器增加一件">+1</span>)}
    {drops.map(d=><div key={d.index} className={styles.orb} data-drop-index={d.index} data-owner={d.ownerId ?? ''}>
      <ElementTreasureOrb element={getProductOrbFromBrand(d.element.toLowerCase() as 'space'|'air'|'water'|'fire'|'earth')} released animated={false} visualScale={0.85}/>
    </div>)}
  </div>;
}
