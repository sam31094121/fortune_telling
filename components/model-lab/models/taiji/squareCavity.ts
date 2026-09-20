import * as THREE from 'three';
import { BEAM, ENTRANCE_SCALE, entrancePoint, type Point } from '../../latticeMath';

export const CAVITY_PITCH = ENTRANCE_SCALE;
export const CAVITY_LINE_WIDTH = BEAM * ENTRANCE_SCALE;
export const CAVITY_CLEAR = CAVITY_PITCH - CAVITY_LINE_WIDTH;
const INNER_RADIUS = .995;
export type CavityEdge = { start: Point; end: Point };

/** The interior's cubic lattice, rotated and uniformly scaled into the sphere.
 * Keep complete cells only: no clipped faces, stretched axes or dangling rods. */
export function cavityLatticeEdges(): CavityEdge[] {
  const result = new Map<string, CavityEdge>();
  for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) for (let z = -3; z <= 1; z++) {
    const corners = Array.from({ length: 8 }, (_, n) => [x + (n & 1), y + ((n >> 1) & 1), z + ((n >> 2) & 1)] as Point);
    if (corners.some(p => Math.hypot(...entrancePoint(p)) > INNER_RADIUS)) continue;
    corners.forEach((start, n) => {
      for (let axis = 0; axis < 3; axis++) {
        if (n & (1 << axis)) continue;
        const end = corners[n | (1 << axis)];
        result.set(`${start.join(',')}|${end.join(',')}`, { start: entrancePoint(start), end: entrancePoint(end) });
      }
    });
  }
  return [...result.values()];
}

/** Thin 3D rods use the same world-space width as the interior mapping. */
export function squareCavityGeometry(): THREE.BufferGeometry {
  const positions: number[] = [], indices: number[] = [];
  for (const { start, end } of cavityLatticeEdges()) {
    const size = start.map((value, i) => Math.max(CAVITY_LINE_WIDTH, Math.abs(end[i] - value))) as Point;
    const rod = new THREE.BoxGeometry(...size);
    rod.translate(...start.map((value, i) => (value + end[i]) / 2) as Point);
    const offset = positions.length / 3;
    positions.push(...rod.attributes.position.array);
    for (const index of rod.index!.array) indices.push(index + offset);
    rod.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
