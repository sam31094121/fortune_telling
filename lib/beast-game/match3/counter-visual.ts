import { ELEMENT_PALETTE } from '../element-palette';
import type { BeastElement } from '../elements';

/** Display geometry only; endpoints always follow the recorded source and target. */
export function counterVisualPath(sourceId: string, element: BeastElement, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy);
  const bend = Math.min(14, length * .06), nx = length ? -dy / length : 0, ny = length ? dx / length : 0;
  const point = (t: number, side: number) => `${x1 + dx * t + nx * bend * side} ${y1 + dy * t + ny * bend * side}`;
  const lightning = sourceId === 'beast_g_baihu' && element === 'SPACE';
  const path = lightning ? `M ${point(0,0)} L ${point(.28,.7)} L ${point(.42,-.7)} L ${point(.65,.65)} L ${point(1,0)}`
    : element === 'FIRE' ? `M ${point(0,0)} L ${point(.42,.5)} L ${point(.62,-.35)} L ${point(1,0)}`
    : element === 'WATER' ? `M ${point(0,0)} C ${point(.3,1)} ${point(.7,-1)} ${point(1,0)}`
    : element === 'EARTH' ? `M ${point(0,0)} L ${point(1,0)}`
    : `M ${point(0,0)} Q ${point(.5,element === 'AIR' ? 1 : -.7)} ${point(1,0)}`;
  return { path, color: ELEMENT_PALETTE[element], width: element === 'EARTH' ? 6 : 4.5, lightning };
}
