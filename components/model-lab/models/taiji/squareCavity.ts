import * as THREE from 'three';
import { A } from './geometry';

export const CAVITY_HALF_CLEAR = .30;
export const CAVITY_HALF_OUTER = .325;
export const CAVITY_HALF_LENGTH = .55;

/** Two L-shaped thickness solids along local Y. The deep +/-Z supports meet
 * the existing flat black/white discs; .025 side walls connect to those supports.
 * No face caps the central square, and no original exterior surface is removed. */
export function squareCavityGeometry(black: boolean): THREE.BufferGeometry {
  const c = CAVITY_HALF_CLEAR, o = CAVITY_HALF_OUTER;
  const shape = new THREE.Shape();
  shape.moveTo(c, -c); shape.lineTo(o, -c); shape.lineTo(o, A);
  shape.lineTo(-o, A); shape.lineTo(-o, c); shape.lineTo(c, c); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: CAVITY_HALF_LENGTH * 2, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geometry.rotateX(Math.PI / 2); geometry.translate(0, CAVITY_HALF_LENGTH, 0);
  if (black) geometry.rotateY(Math.PI);
  return geometry;
}
