/** Server-authored pinball paths. Rendering never chooses the recipient. */
import { seededRng } from './board';
import type { BeastElement } from '../elements';

export interface DropPoint { t: number; x: number; y: number }
export interface DropCatch { ownerId: string; slot: number; left: number; right: number }
export interface OrbDrop {
  reward?: { element: BeastElement; variant: number; count: number };
  index: number; element: BeastElement; source?: {r:number;c:number}; delayMs: number; points: DropPoint[];
  impacts: number[]; pairImpacts?: number[]; ownerId: string | null; slot: number | null; durationMs: number;
}
export const DROP_FIELD = {
  width: 1000, height: 650, radius: 36,
  pegs: [
    { x:160,y:95 },{ x:390,y:95 },{ x:620,y:95 },{ x:850,y:95 },
    { x:275,y:185 },{ x:505,y:185 },{ x:735,y:185 },
    { x:160,y:275 },{ x:390,y:275 },{ x:620,y:275 },{ x:850,y:275 },
    { x:275,y:365 },{ x:505,y:365 },{ x:735,y:365 },
    { x:160,y:455 },{ x:390,y:455 },{ x:620,y:455 },{ x:850,y:455 },
  ],
} as const;

export const MAX_ORB_DROPS = 256;
export const ORB_WAVE_SIZE = 7;
export function shieldOrbCount(shields: number): number {
  if (!Number.isInteger(shields) || shields < 0 || shields > 56) throw new Error('盾牌數量無效');
  return shields < 9 ? 0 : 2 ** Math.min(shields - 9, 8);
}

/** Existing neighbouring card edges act as physical dividers, not reward reassignment. */
export function dropDividers(catches: readonly DropCatch[]): {x:number;y:number}[] {
  const sorted=[...catches].sort((a,b)=>a.left-b.left);
  const dividers=sorted.slice(1).flatMap((right,i)=>{
    const left=sorted[i];
    return right.slot===left.slot+1 ? [{x:(left.right+right.left)/2,y:555}] : [];
  });
  return dividers;
}

/** Catch mouths are narrower than cards; empty/dead slots are never reassigned. */
export function dropCatches(team: readonly { id: string; hp: number }[], singleWidth?: number): DropCatch[] {
  const live = team.map((u, slot) => ({ ...u, slot })).filter(u => u.hp > 0);
  if (singleWidth !== undefined && (!Number.isFinite(singleWidth) || singleWidth < 72 || singleWidth > 720)) throw new Error('神獸接取版面無效');
  if (live.length === 1) {
    const width = singleWidth ?? 720;
    return [{ ownerId: live[0].id, slot: live[0].slot, left: (1000-width)/2, right: (1000+width)/2 }];
  }
  return live.map(u => ({ ownerId: u.id, slot: u.slot, left: u.slot * 200 + 30, right: u.slot * 200 + 170 }));
}

/** Shared fixed-step simulation: equal-mass balls collide on the same clock. */
export function simulateOrbDrops(input: {
  count: number; element: BeastElement; seed: number; launchX: number; catches: readonly DropCatch[]; sources?: readonly {r:number;c:number;element:BeastElement;x:number}[];
}): OrbDrop[] {
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > MAX_ORB_DROPS || !Number.isFinite(input.launchX)) throw new Error('法珠掉落數量或起點無效');
  const dividers=dropDividers(input.catches), rng=seededRng(input.seed), dt=1/120, radius=DROP_FIELD.radius, scale=1.6;
  type Ball={index:number;x:number;y:number;vx:number;vy:number;born:number;finished:boolean;points:DropPoint[];impacts:number[];pairImpacts:number[]};
  const balls:Ball[]=[], output:OrbDrop[]=[];
  const launchX=Math.max(radius,Math.min(1000-radius,input.launchX));
  const stamp=(b:Ball,step:number)=>Math.round((step-b.born)*dt*1000);
  const impact=(b:Ball,step:number)=>{const t=stamp(b,step);if(b.impacts.at(-1)!==t)b.impacts.push(t);};
  const world=(b:Ball,step:number)=>{
    if(b.x<radius||b.x>1000-radius){b.x=Math.max(radius,Math.min(1000-radius,b.x));b.vx*=-.62;impact(b,step);}
    if(b.y<radius){b.y=radius;if(b.vy<0)b.vy*=-.62;}
    for(const peg of DROP_FIELD.pegs){
      const dx=b.x-peg.x,dy=b.y-peg.y,d=Math.hypot(dx,dy),contact=radius+13;
      if(d>=contact)continue;
      const nx=d>.001?dx/d:0,ny=d>.001?dy/d:-1;
      b.x=peg.x+nx*contact;b.y=peg.y+ny*contact;
      const speed=b.vx*nx+b.vy*ny;
      if(speed<0){b.vx-=1.62*speed*nx;b.vy-=1.62*speed*ny;b.vx*=.98;b.vy*=.98;impact(b,step);}
    }
    for(const q of dividers){
      const side=b.x===q.x?(b.vx<0?-1:1):(b.x<q.x?-1:1),ex=side*48,ey=650-q.y,l=Math.hypot(ex,ey);
      const t=Math.max(0,Math.min(1,((b.x-q.x)*ex+(b.y-q.y)*ey)/(l*l)));
      const qx=q.x+t*ex,qy=q.y+t*ey,dx=b.x-qx,dy=b.y-qy,d=Math.hypot(dx,dy);
      const inside=b.y>=q.y&&Math.abs(b.x-q.x)<(b.y-q.y)*Math.abs(ex)/ey;
      if(!inside&&d>=radius)continue;
      const nx=inside||d<.001?side*ey/l:dx/d,ny=inside||d<.001?-Math.abs(ex)/l:dy/d;
      const depth=inside?radius-(dx*nx+dy*ny):radius-d;
      b.x+=nx*(depth+.01);b.y+=ny*(depth+.01);
      const speed=b.vx*nx+b.vy*ny;if(speed<0){b.vx-=1.62*speed*nx;b.vy-=1.62*speed*ny;}impact(b,step);
    }
  };
  for(let step=0;step<=720*(input.count+1)&&output.length<input.count;step++){
    let active=balls.filter(b=>!b.finished);
    const source=input.sources?.[balls.length];
    const entrance=source?.x ?? launchX;
    // Release at the physical entrance only when the previous sphere has cleared it.
    const waveReady = balls.length % ORB_WAVE_SIZE !== 0 || balls.slice(-ORB_WAVE_SIZE).every(b=>b.finished || b.y-radius>=275);
    if(balls.length<input.count&&waveReady&&(balls.length===0||step-balls[balls.length-1].born>=36)&&active.every(b=>Math.hypot(b.x-entrance,b.y-radius)>=2*radius+2)){
      const b:Ball={index:balls.length,x:entrance,y:radius,vx:(rng()-.5)*240,vy:0,born:step,finished:false,points:[{t:0,x:entrance,y:radius}],impacts:[],pairImpacts:[]};
      balls.push(b);active.push(b);
    }
    for(const b of active){if(b.born===step)continue;b.vy+=1050*dt;b.x+=b.vx*dt;b.y=Math.min(650,b.y+b.vy*dt);world(b,step);}
    // Iterative contacts prevent a ball-ball correction pushing a sphere through a nearby wall.
    for(let pass=0;pass<24;pass++){
      let touching=false;
      for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
        const a=active[i],b=active[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
        if(d>=2*radius||a.y>=650||b.y>=650)continue;
        touching=true;const nx=d>.001?dx/d:1,ny=d>.001?dy/d:0,depth=(2*radius-d+.02)/2;
        a.x-=nx*depth;a.y-=ny*depth;b.x+=nx*depth;b.y+=ny*depth;
        const closing=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
        if(closing<0){const impulse=-1.62*closing/2;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;
          for(const ball of [a,b]){impact(ball,step);const t=stamp(ball,step);if(ball.pairImpacts.at(-1)!==t)ball.pairImpacts.push(t);}
        }
      }
      if(!touching)break;for(const b of active)world(b,step);
    }
    for(const b of active){
      if(b.born===step)continue;
      const elapsed=stamp(b,step),reached=b.y>=650,timedOut=step-b.born>=720;
      if(reached)b.y=650;
      b.points.push({t:elapsed,x:b.x,y:b.y});
      if(reached||timedOut){
        b.finished=true;const caught=reached?input.catches.find(c=>b.x>=c.left+radius&&b.x<=c.right-radius):undefined;
        output.push({index:b.index,element:input.sources?.[b.index]?.element ?? input.element,...(input.sources?.[b.index]?{source:{r:input.sources[b.index].r,c:input.sources[b.index].c}}:{}),delayMs:b.born*dt*1000*scale,points:b.points.map(p=>({x:Math.round(p.x*1000)/1000,y:Math.round(p.y*1000)/1000,t:Math.round(p.t*scale*100)/100})),impacts:b.impacts.map(t=>t*scale),pairImpacts:b.pairImpacts.map(t=>t*scale),durationMs:elapsed*scale,ownerId:caught?.ownerId??null,slot:caught?.slot??null});
      }
    }
  }
  if(output.length!==input.count)throw new Error('法珠物理運算尚未完成');
  return output.sort((a,b)=>a.index-b.index);
}
