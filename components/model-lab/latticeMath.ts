/** Integer-indexed, unit cubic lattice. Rendering and collision share these dimensions. */
export const CELL = 1;
export const BEAM = 0.006;
export const BODY_RADIUS = 0.12;
export const CHUNK = 8;
/** Exterior centre spacing .6; line .0036; clear opening .5964; outer width .6036. */
export const ENTRANCE_SCALE = .6;
/** Field starts beyond the real cavity's rear end (local Y=-.55). */
export const ENTRANCE_Y = -.56;
export type Point = [number, number, number];
export type Address = { chunk: [bigint, bigint, bigint]; local: Point };

/** Proper rotation + uniform scale, not a mirror. Interior camera +Z/up+Y maps to -Y/up-Z. */
export function entrancePoint(p: Point): Point {
  return [-(p[0] - .5) * ENTRANCE_SCALE, ENTRANCE_Y - p[2] * ENTRANCE_SCALE, -(p[1] - .5) * ENTRANCE_SCALE];
}

export function portalProjection(eyeY: number) {
  const distance = Math.max(.12, (eyeY - ENTRANCE_Y) / ENTRANCE_SCALE);
  return { distance, fov: 2 * Math.atan(.5 / distance) * 180 / Math.PI, near: Math.max(.01, distance - .001) };
}

export function rebase(address: Address): Address {
  const chunk = [...address.chunk] as Address['chunk'];
  const local = [...address.local] as Point;
  for (let a = 0; a < 3; a++) {
    const shift = Math.floor(local[a] / CHUNK);
    chunk[a] += BigInt(shift);
    local[a] -= shift * CHUNK;
  }
  return { chunk, local };
}

/** Conservative swept sphere against the infinite grid's rods, independent of rendered chunks.
 * Each rod is infinite along one axis; expand its square cross-section by the body radius.
 * This can stop slightly early at corners, but never tunnels through an edge. */
export function sweepFraction(start: Point, delta: Point): number {
  const half = BEAM / 2 + BODY_RADIUS;
  let first = 1;
  for (let axis = 0; axis < 3; axis++) {
    const u = (axis + 1) % 3, v = (axis + 2) % 3;
    const minU = Math.ceil(Math.min(start[u], start[u] + delta[u]) - half);
    const maxU = Math.floor(Math.max(start[u], start[u] + delta[u]) + half);
    const minV = Math.ceil(Math.min(start[v], start[v] + delta[v]) - half);
    const maxV = Math.floor(Math.max(start[v], start[v] + delta[v]) + half);
    for (let i = minU; i <= maxU; i++) for (let j = minV; j <= maxV; j++) {
      let enter = 0, exit = 1;
      for (const [a, center] of [[u, i], [v, j]]) {
        const lo = center - half, hi = center + half;
        if (Math.abs(delta[a]) < 1e-14) {
          if (start[a] <= lo || start[a] >= hi) { exit = -1; break; }
        } else {
          const t0 = (lo - start[a]) / delta[a], t1 = (hi - start[a]) / delta[a];
          enter = Math.max(enter, Math.min(t0, t1));
          exit = Math.min(exit, Math.max(t0, t1));
        }
      }
      if (enter < exit && exit > 0) first = Math.min(first, enter);
    }
  }
  return first;
}

export function moveSafely(start: Point, delta: Point): Point {
  const fraction = sweepFraction(start, delta);
  const length = Math.hypot(...delta);
  const t = fraction < 1 ? Math.max(0, fraction - 1e-5 / Math.max(length, 1e-10)) : 1;
  return start.map((x, i) => x + delta[i] * t) as Point;
}

/** One owner per edge, with integer endpoints; no double beams at shared cell faces. */
export function latticeEdges(radius: number): { center: Point; axis: number }[] {
  const edges: { center: Point; axis: number }[] = [];
  for (let axis = 0; axis < 3; axis++) {
    for (let a = -radius; a < radius; a++)
      for (let b = -radius; b <= radius; b++)
        for (let c = -radius; c <= radius; c++) {
          const center: Point = [0, 0, 0];
          center[axis] = a + .5;
          center[(axis + 1) % 3] = b;
          center[(axis + 2) % 3] = c;
          edges.push({ center, axis });
        }
  }
  return edges;
}
