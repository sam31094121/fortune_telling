import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { EDGES_4D, PROJECTION, VERTICES_4D, project4D } from '../../projectionMath';

export const RIB_THICKNESS = .0036;
export type ContactRib = { edge: [number, number]; geometry: THREE.BufferGeometry; pad: THREE.BufferGeometry; a: THREE.Vector3; b: THREE.Vector3; anchor: THREE.Vector3; anchorTriangle: THREE.Triangle; supportAxis: number; supportSign: number; padArea: number };

/** Local finite-thickness ribs. Every convex rib stays outside one cavity
 * supporting plane; its complete base is the unchanged straight cube edge.
 * A small, inward-extruded triangle of the ACTUAL body mesh is its contact pad.
 * The pad's exterior face is exactly the existing body triangle, not a sphere proxy.
 */
export function createContactRibs(surfaces: THREE.BufferGeometry[]): ContactRib[] {
  const triangles: { triangle: THREE.Triangle; center: THREE.Vector3; normal: THREE.Vector3; clearance: number }[] = [];
  for (const geometry of surfaces) {
    const p = geometry.getAttribute('position'), index = geometry.index;
    for (let i = 0; i < (index?.count ?? p.count); i += 3) {
      const vertices = [0, 1, 2].map(k => new THREE.Vector3().fromBufferAttribute(p, index ? index.getX(i + k) : i + k));
      const triangle = new THREE.Triangle(...vertices as [THREE.Vector3, THREE.Vector3, THREE.Vector3]);
      if (triangle.getArea() < 1e-9) continue;
      const center = triangle.getMidpoint(new THREE.Vector3()), normal = triangle.getNormal(new THREE.Vector3());
      if (normal.dot(center) < 0) normal.negate();
      const clearance = Math.min(...vertices.map((v, k) => new THREE.Line3(v, vertices[(k + 1) % 3]).closestPointToPoint(center, true, new THREE.Vector3()).distanceTo(center)));
      if (clearance > .00015) triangles.push({ triangle, center, normal, clearance });
    }
  }
  const result: ContactRib[] = [];
  for (const edge of EDGES_4D.filter(e => e.axis !== 3 && VERTICES_4D[e.from][3] === 1)) {
    const a = new THREE.Vector3(...project4D(VERTICES_4D[edge.from])).multiplyScalar(PROJECTION.taijiScale);
    const b = new THREE.Vector3(...project4D(VERTICES_4D[edge.to])).multiplyScalar(PROJECTION.taijiScale);
    const midpoint = a.clone().add(b).multiplyScalar(.5);
    const fixedAxes = [0, 1, 2].filter(axis => axis !== edge.axis);
    let best: typeof triangles[number] | undefined, supportAxis = -1, score = Infinity;
    for (const candidate of triangles) for (const axis of fixedAxes) {
      const sign = Math.sign(a.getComponent(axis));
      if (candidate.triangle.a.getComponent(axis) * sign < PROJECTION.taijiScale + RIB_THICKNESS * 2 || candidate.triangle.b.getComponent(axis) * sign < PROJECTION.taijiScale + RIB_THICKNESS * 2 || candidate.triangle.c.getComponent(axis) * sign < PROJECTION.taijiScale + RIB_THICKNESS * 2) continue;
      const distance = midpoint.distanceToSquared(candidate.center);
      if (distance < score) { best = candidate; score = distance; supportAxis = axis; }
    }
    if (!best) throw new Error(`No actual body attachment for edge ${edge.from}-${edge.to}`);
    const supportSign = Math.sign(a.getComponent(supportAxis));
    const outward = new THREE.Vector3().setComponent(supportAxis, supportSign * RIB_THICKNESS);
    const tangent = b.clone().sub(a).projectOnPlane(best.normal).normalize();
    if (tangent.lengthSq() < .1) tangent.copy(best.triangle.b).sub(best.triangle.a).normalize();
    const span = best.clearance * .45;
    const c = best.center.clone().addScaledVector(tangent, -span), d = best.center.clone().addScaledVector(tangent, span);
    const inward = best.normal.clone().multiplyScalar(-RIB_THICKNESS);
    // Anchor strip has finite area in the existing triangle and a finite inward depth.
    const across = best.normal.clone().cross(tangent).normalize().multiplyScalar(span * .45);
    const anchorPoints = [c.clone().add(across), c.clone().sub(across), d.clone().add(across), d.clone().sub(across)];
    const geometry = new ConvexGeometry([a, b, a.clone().add(outward), b.clone().add(outward), ...anchorPoints, ...anchorPoints.map(p => p.clone().add(inward))]);
    const tri = best.triangle;
    const pad = new ConvexGeometry([tri.a, tri.b, tri.c, tri.a.clone().add(inward), tri.b.clone().add(inward), tri.c.clone().add(inward)]);
    result.push({ edge: [edge.from, edge.to], geometry, pad, a, b, anchor: best.center, anchorTriangle: tri, supportAxis, supportSign, padArea: span * span * 1.8 });
  }
  return result;
}
