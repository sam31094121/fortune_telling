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
  // 柏青哥釘陣（鎖死規則：每顆珠子一定撞到釘子，不准直線掉下去，見 tests/beast-match3-orb-drop.test.cjs）：
  // 1) 所有釘子的 x 座標，相鄰間距一律 ≤ 96（小於珠子能擠過去的 98），整個場地沒有任何一條垂直的縫。
  // 2) 奇偶排錯開半格（柏青哥交錯排法）；第一排（y=90）的釘子在五張神獸卡中心 100、300、500、700、900 的正下方（誤差 ≤ 16）。
  // 3) 最左右各有貼牆釘（x=6／40、960／994；偶數排的 40／960 刻意往內收，把牆邊斜擦釘子滑下的窄道封掉），最下排（y=480）精準對準每道卡片分隔尖端（x=200、400、600、800）的正上方，把珠子導向兩側的卡口。
  pegs: [
    { x:6,y:90 },{ x:116,y:90 },{ x:308,y:90 },{ x:500,y:90 },{ x:692,y:90 },{ x:884,y:90 },{ x:994,y:90 },
    { x:40,y:155 },{ x:212,y:155 },{ x:404,y:155 },{ x:596,y:155 },{ x:788,y:155 },{ x:960,y:155 },
    { x:6,y:220 },{ x:116,y:220 },{ x:308,y:220 },{ x:500,y:220 },{ x:692,y:220 },{ x:884,y:220 },{ x:994,y:220 },
    { x:40,y:285 },{ x:212,y:285 },{ x:404,y:285 },{ x:596,y:285 },{ x:788,y:285 },{ x:960,y:285 },
    { x:6,y:350 },{ x:116,y:350 },{ x:308,y:350 },{ x:500,y:350 },{ x:692,y:350 },{ x:884,y:350 },{ x:994,y:350 },
    { x:40,y:415 },{ x:212,y:415 },{ x:404,y:415 },{ x:596,y:415 },{ x:788,y:415 },{ x:960,y:415 },
    { x:40,y:480 },{ x:200,y:480 },{ x:400,y:480 },{ x:600,y:480 },{ x:800,y:480 },{ x:960,y:480 },
  ],
} as const;

/** 珠子從場地上緣再往上這麼高的地方開始自由落下（敵方神獸卡那一排），先落一段才進釘陣，像柏青哥發射的儀式感。 */
/** 珠子碰到左右牆時往場中央多推一把（像柏青哥的導軌），不會貼著牆直落。 */
export const WALL_KICK = 250;
/** 落珠重力（單位／秒²）。 */
export const DROP_GRAVITY = 1600;
export const DROP_RISE = 180;
/** 出發前自由落下的時間（步）：不算進 6 秒物理時限，只在時限外多給這一段。 */
export const DROP_LEAD_STEPS = Math.ceil(Math.sqrt(2 * (DROP_RISE + 36) / DROP_GRAVITY) * 120);
export const DROP_TIME_SCALE = 1; // 物理時間 → 播放時間的倍率（1 = 照物理真實速度，不慢放）
export const DROP_LEAD_MS = Math.round(DROP_LEAD_STEPS * 1000 / 120 * DROP_TIME_SCALE);
/** 單顆珠子的物理時限（步，120 步 = 1 秒）：放寬到 900 步，讓偶爾被別顆珠子擠慢的珠子也能落到底。 */
export const DROP_MAX_STEPS = 900;
export const DROP_MAX_MS = Math.round((DROP_MAX_STEPS + DROP_LEAD_STEPS) * 1000 / 120 * DROP_TIME_SCALE);
export const MAX_ORB_DROPS = 256;
export const ORB_WAVE_SIZE = 30;
/** 同一批相鄰兩顆珠子的放行間隔（步，120 步 = 1 秒）。 */
export const DROP_SPAWN_GAP = 12;
export function shieldOrbCount(shields: number): number {
  if (!Number.isInteger(shields) || shields < 0 || shields > 56) throw new Error('盾牌數量無效');
  return shields < 9 ? 0 : 2 ** Math.min(shields - 9, 8);
}

/** Existing neighbouring card edges act as physical dividers, not reward reassignment. */
export function dropDividers(catches: readonly DropCatch[]): {x:number;y:number}[] {
  const sorted=[...catches].sort((a,b)=>a.left-b.left);
  // 最後一張大卡：左右接取邊界各有一個實體火珠分流角，內外都依碰撞路徑判定。
  if(sorted.length===1)return [{x:sorted[0].left,y:555},{x:sorted[0].right,y:555}];
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
  const dividers=dropDividers(input.catches), rng=seededRng(input.seed), dt=1/120, radius=DROP_FIELD.radius, scale=DROP_TIME_SCALE;
  type Ball={index:number;x:number;y:number;vx:number;vy:number;born:number;finished:boolean;points:DropPoint[];impacts:number[];pairImpacts:number[]};
  const balls:Ball[]=[], output:OrbDrop[]=[];
  const launchX=Math.max(radius,Math.min(1000-radius,input.launchX));
  const stamp=(b:Ball,step:number)=>Math.round((step-b.born)*dt*1000);
  const impact=(b:Ball,step:number)=>{const t=stamp(b,step);if(b.impacts.at(-1)!==t)b.impacts.push(t);};
  const world=(b:Ball,step:number)=>{
    if(b.x<radius||b.x>1000-radius){b.x=Math.max(radius,Math.min(1000-radius,b.x));b.vx*=-.62;b.vx+=(b.x<=radius?1:-1)*WALL_KICK;impact(b,step);}
    if(b.y<-DROP_RISE){b.y=-DROP_RISE;if(b.vy<0)b.vy*=-.62;}
    for(const peg of DROP_FIELD.pegs){
      const dx=b.x-peg.x,dy=b.y-peg.y,d=Math.hypot(dx,dy),contact=radius+13;
      if(d>=contact)continue;
      const nx=d>.001?dx/d:0,ny=d>.001?dy/d:-1;
      b.x=peg.x+nx*contact;b.y=peg.y+ny*contact;
      const speed=b.vx*nx+b.vy*ny;
      if(speed<0){b.vx-=1.62*speed*nx;b.vy-=1.62*speed*ny;b.vx*=.98;b.vy*=.98;impact(b,step);}
      // 貼牆釘子：把寶珠往場中央推開，避免卡在牆與釘子的夾角。
      if(peg.x<100)b.vx+=60;else if(peg.x>900)b.vx-=60;
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
  for(let step=0;step<=(DROP_MAX_STEPS+DROP_LEAD_STEPS)*(input.count+1)&&output.length<input.count;step++){
    let active=balls.filter(b=>!b.finished);
    const source=input.sources?.[balls.length];
    const entrance=source?.x ?? launchX;
    // Release at the physical entrance only when the previous sphere has cleared it.
    const waveReady = balls.length % ORB_WAVE_SIZE !== 0 || balls.slice(-ORB_WAVE_SIZE).every(b=>b.finished || b.y-radius>=60);
    if(balls.length<input.count&&waveReady&&(balls.length===0||step-balls[balls.length-1].born>=DROP_SPAWN_GAP)&&active.every(b=>Math.hypot(b.x-entrance,b.y+DROP_RISE)>=2*radius+2)){
      const b:Ball={index:balls.length,x:entrance,y:-DROP_RISE,vx:(rng()-.5)*240,vy:0,born:step,finished:false,points:[{t:0,x:entrance,y:-DROP_RISE}],impacts:[],pairImpacts:[]};
      balls.push(b);active.push(b);
    }
    for(const b of active){if(b.born===step)continue;b.vy+=DROP_GRAVITY*dt;b.x+=b.vx*dt;b.y=Math.min(650,b.y+b.vy*dt);world(b,step);}
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
      const elapsed=stamp(b,step),reached=b.y>=650,timedOut=step-b.born>=DROP_MAX_STEPS+DROP_LEAD_STEPS;
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
