'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PROJECTION } from './projectionMath';
import { EQUAL_EDGE_LENGTH, equalEdgeRods } from './equalEdgeProjection';
import type { LabModelProps } from './models/registry';

/**
 * 等長投影：32 條邊在畫面上長度完全一樣（都是 √3），證明四維裡本來就全部等長，
 * 透視投影看到的大小差是眼睛被騙。線寬沿用太極內壁的比例，顏色沿用同一組。
 */
export default function EqualEdgeTesseract({ wireframe, layers }: LabModelProps) {
  const group = useRef<THREE.Group>(null);
  const spin = layers?.spin !== false;

  const { geometry, material, matrices, colors } = useMemo(() => {
    const rods = equalEdgeRods();
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
      // 原本的「連接邊」在這個投影下跟其他邊一樣長，顏色照留，方便對照是哪一條
      colors.push(new THREE.Color(rod.axis === 3 ? PROJECTION.bridge : PROJECTION.outer));
    }
    return {
      geometry: new THREE.CylinderGeometry(0.012, 0.012, 1, 8),
      material: new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, wireframe }),
      matrices,
      colors,
    };
  }, [wireframe]);

  const mesh = useRef<THREE.InstancedMesh>(null);
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

  useFrame((_, delta) => {
    if (spin && group.current) group.current.rotation.y += delta * 0.25;
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[geometry, material, matrices.length]} frustumCulled={false} />
    </group>
  );
}

export const EQUAL_EDGE_NOTE = `平行投影（方向 1,1,1,1）：32 條邊在畫面上長度完全相同（${EQUAL_EDGE_LENGTH.toFixed(3)}），外立方與內立方一樣大。太極裡用的是透視投影，看起來一大一小、連接邊是斜的——那是眼睛被騙，四維裡它們本來就等長、24 個面本來都是正方形。代價：角度會被壓成菱形，想看直角要回去看單一個立方單元。`;
