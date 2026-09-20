'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ROD_RADIUS } from './multiverseMath';
import { INSCRIBED_SCALE, TAIJI_UNIT_SCALE, inscribedUnitRods, taijiCellRods } from './taijiCells';

/**
 * 太極內壁的每一格都換成四維單元：7 格、224 根線，一個 InstancedMesh 畫完。
 * 外立方與內壁格線完全重合（守門 tests/taiji-4d-cells.test.cjs 逐條比對），
 * 所以線是接起來的、沒有縫；線寬沿用同一個比例縮到太極裡。
 */
export default function TaijiTesseractField({ opacity = 0.9, mode = 'cells' }: { opacity?: number; mode?: 'cells' | 'inscribed' }) {
  const mesh = useRef<THREE.InstancedMesh>(null);

  const { geometry, material, matrices, colors } = useMemo(() => {
    const rods = mode === 'inscribed' ? inscribedUnitRods() : taijiCellRods();
    const object = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    const matrices: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    for (const rod of rods) {
      const start = new THREE.Vector3(...rod.a);
      const end = new THREE.Vector3(...rod.b);
      const direction = end.clone().sub(start);
      object.position.copy(start).add(end).multiplyScalar(0.5);
      object.quaternion.setFromUnitVectors(up, direction.clone().normalize());
      object.scale.set(1, direction.length(), 1);
      object.updateMatrix();
      matrices.push(object.matrix.clone());
      colors.push(new THREE.Color(rod.color));
    }
    return {
      geometry: new THREE.CylinderGeometry(ROD_RADIUS * (mode === 'inscribed' ? INSCRIBED_SCALE : TAIJI_UNIT_SCALE), ROD_RADIUS * (mode === 'inscribed' ? INSCRIBED_SCALE : TAIJI_UNIT_SCALE), 1, 6),
      material: new THREE.MeshBasicMaterial({ transparent: true, opacity, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }),
      matrices,
      colors,
    };
  }, [opacity, mode]);

  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    matrices.forEach((matrix, index) => {
      instanced.setMatrixAt(index, matrix);
      instanced.setColorAt(index, colors[index]);
    });
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  }, [matrices, colors]);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  return <instancedMesh ref={mesh} args={[geometry, material, matrices.length]} frustumCulled={false} />;
}
