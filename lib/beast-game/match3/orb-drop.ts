/** Server-authored pinball paths. Rendering never chooses the recipient. */
import { seededRng } from './board';
import type { BeastElement } from '../elements';

export interface DropPoint { t: number; x: number; y: number }
export interface DropCatch { ownerId: string; slot: number; left: number; right: number }
export interface OrbDrop {
  index: number; element: BeastElement; delayMs: number; points: DropPoint[];
  impacts: number[]; ownerId: string | null; slot: number | null; durationMs: number;
}
export const DROP_FIELD = {
  width: 1000, height: 650, radius: 14,
  pegs: [
    { x: 160, y: 150 }, { x: 390, y: 150 }, { x: 620, y: 150 }, { x: 850, y: 150 },
    { x: 275, y: 310 }, { x: 505, y: 310 }, { x: 735, y: 310 },
    { x: 160, y: 465 }, { x: 390, y: 465 }, { x: 620, y: 465 }, { x: 850, y: 465 },
  ],
} as const;

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
export function dropCatches(team: readonly { id: string; hp: number }[]): DropCatch[] {
  const live = team.map((u, slot) => ({ ...u, slot })).filter(u => u.hp > 0);
  if (live.length === 1) return [{ ownerId: live[0].id, slot: live[0].slot, left: 450, right: 550 }];
  return live.map(u => ({ ownerId: u.id, slot: u.slot, left: u.slot * 200 + 30, right: u.slot * 200 + 170 }));
}

/** Fixed-step gravity and dissipative reflection, bounded to protect response time. */
export function simulateOrbDrops(input: {
  count: number; element: BeastElement; seed: number; launchX: number; catches: readonly DropCatch[];
}): OrbDrop[] {
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 48 || !Number.isFinite(input.launchX)) throw new Error('法珠掉落數量或起點無效');
  const dividers=dropDividers(input.catches);
  const rng = seededRng(input.seed), dt = 1 / 120, radius = DROP_FIELD.radius;
  return Array.from({ length: input.count }, (_, index) => {
    let x = Math.max(radius, Math.min(1000 - radius, input.launchX)), y: number = radius;
    let vx = (rng() - .5) * 240, vy = 0, elapsed = 0;
    const points: DropPoint[] = [{ t: 0, x, y }], impacts: number[] = [];
    for (let step = 1; step <= 720 && y < DROP_FIELD.height; step++) {
      const previousX = x, previousY = y;
      vy += 1050 * dt; x += vx * dt; y += vy * dt;
      if (x < radius || x > 1000 - radius) {
        x = Math.max(radius, Math.min(1000 - radius, x)); vx *= -.62;
        impacts.push(Math.round(step * dt * 1000));
      }
      for (const peg of DROP_FIELD.pegs) {
        const dx = x - peg.x, dy = y - peg.y, distance = Math.hypot(dx, dy), contact = radius + 13;
        if (distance >= contact) continue;
        const nx = distance > .001 ? dx / distance : 0, ny = distance > .001 ? dy / distance : -1;
        x = peg.x + nx * contact; y = peg.y + ny * contact;
        const normalSpeed = vx * nx + vy * ny;
        if (normalSpeed < 0) {
          vx -= 1.62 * normalSpeed * nx; vy -= 1.62 * normalSpeed * ny;
          vx *= .98; vy *= .98; impacts.push(Math.round(step * dt * 1000));
        }
      }
      // Sloped card-edge divider: reflect on its surface, never assign a recipient here.
      for(const divider of dividers) {
        if(y < divider.y-radius) continue;
        const side=x===divider.x ? (vx<0?-1:1) : (x<divider.x?-1:1);
        const slope=48/(DROP_FIELD.height-divider.y);
        const halfWidth=Math.max(0,y-divider.y)*slope;
        if(Math.abs(x-divider.x)>=halfWidth+radius) continue;
        x=divider.x+side*(halfWidth+radius);
        const length=Math.hypot(1,slope), nx=side/length, ny=-slope/length;
        const normalSpeed=vx*nx+vy*ny;
        if(normalSpeed<0) {vx-=1.62*normalSpeed*nx;vy-=1.62*normalSpeed*ny;}
        impacts.push(Math.round(step*dt*1000));
      }
      elapsed = Math.round(step * dt * 1000);
      if (y >= DROP_FIELD.height) {
        const fraction = (DROP_FIELD.height - previousY) / (y - previousY);
        x = previousX + (x - previousX) * fraction; y = DROP_FIELD.height;
      }
      if (step % 2 === 0 || y === DROP_FIELD.height || impacts.at(-1) === elapsed) points.push({ t: elapsed, x, y });
    }
    const caught = y === DROP_FIELD.height ? input.catches.find(c => x >= c.left + radius && x <= c.right - radius) : undefined;
    const ritualScale = 1.6;
    return { index, element: input.element, delayMs: index * 160, points: points.map(p=>({...p,t:p.t*ritualScale})), impacts: impacts.map(t=>t*ritualScale), durationMs: elapsed*ritualScale, ownerId: caught?.ownerId ?? null, slot: caught?.slot ?? null };
  });
}
