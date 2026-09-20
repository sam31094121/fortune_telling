'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CELL_SPACING, ROD_RADIUS, multiverseCells, cellRods } from './multiverseMath';

/**
 * 四角形多重宇宙：中心那一顆維持同事定案的投影（含輝光），周圍的單元用一個 InstancedMesh 畫完。
 * 不逐根建 Mesh——半徑 1 就有 26 個鄰居、832 根邊，逐根建會直接拖垮手機。
 * 鋪排數學與「面貼面不重疊」由 tests/model-lab-multiverse.test.cjs 守著。
 */
export default function MultiverseField({ radius = 1, opacity = 0.62 }: { radius?: number; opacity?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);

  const { geometry, material, count, matrices, colors } = useMemo(() => {
    const rods = cellRods();
    // 中心單元交給 TesseractModel，這裡只畫周圍的鄰居
    const neighbours = multiverseCells(radius).filter((cell) => cell.some((v) => v !== 0));
    const matrices: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    const object = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    for (const [ox, oy, oz] of neighbours) {
      for (const rod of rods) {
        const start = new THREE.Vector3(rod.a[0] + ox, rod.a[1] + oy, rod.a[2] + oz);
        const end = new THREE.Vector3(rod.b[0] + ox, rod.b[1] + oy, rod.b[2] + oz);
        const direction = end.clone().sub(start);
        object.position.copy(start).add(end).multiplyScalar(0.5);
        object.quaternion.setFromUnitVectors(up, direction.clone().normalize());
        object.scale.set(1, direction.length(), 1);
        object.updateMatrix();
        matrices.push(object.matrix.clone());
        colors.push(new THREE.Color(rod.color));
      }
    }
    return {
      geometry: new THREE.CylinderGeometry(ROD_RADIUS, ROD_RADIUS, 1, 6),
      // 加法混色：線交疊的地方自然變亮，遠處自動淡掉，不用另外畫輝光
      material: new THREE.MeshBasicMaterial({ transparent: true, opacity, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }),
      count: matrices.length,
      matrices,
      colors,
    };
  }, [radius, opacity]);

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

  if (!count) return null;
  return (
    <>
      <fog attach="fog" args={['#061321', CELL_SPACING * 1.6, CELL_SPACING * (radius + 2.6)]} />
      <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />
    </>
  );
}
