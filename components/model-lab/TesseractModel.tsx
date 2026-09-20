'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { EDGES_4D, PROJECTION, VERTICES_4D, project4D } from './projectionMath';

/** Same vertices, edges, colours and luminous rods as the approved B preview. */
export default function TesseractModel({ scale = 1 }: { scale?: number }) {
  const model = useMemo(() => {
    const group = new THREE.Group();
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const vertices = VERTICES_4D.map(p => new THREE.Vector3(...project4D(p)));
    for (const { from, to, axis } of EDGES_4D) {
      const start = vertices[from], end = vertices[to];
      const direction = end.clone().sub(start);
      const color = axis === 3 ? PROJECTION.bridge : VERTICES_4D[from][3] === 1 ? PROJECTION.outer : PROJECTION.inner;
      const geometry = new THREE.CylinderGeometry(PROJECTION.lineRadius, PROJECTION.lineRadius, direction.length(), 10);
      const material = new THREE.MeshBasicMaterial({ color, toneMapped: false });
      const rod = new THREE.Mesh(geometry, material);
      rod.position.copy(start).add(end).multiplyScalar(.5);
      rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      group.add(rod);
      const glowMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: PROJECTION.glowOpacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const glow = new THREE.Mesh(geometry, glowMaterial);
      glow.position.copy(rod.position); glow.quaternion.copy(rod.quaternion);
      glow.scale.set(PROJECTION.glowScale, 1, PROJECTION.glowScale);
      group.add(glow);
      geometries.push(geometry); materials.push(material, glowMaterial);
    }
    return { group, geometries, materials };
  }, []);
  useEffect(() => () => { model.geometries.forEach(g => g.dispose()); model.materials.forEach(m => m.dispose()); }, [model]);
  return <primitive object={model.group} scale={scale} />;
}
