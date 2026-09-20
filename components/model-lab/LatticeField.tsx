'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { latticeEdges } from './latticeMath';

/** Shared portal/interior field: one draw call, fine luminous rods, sixteen-cell render radius. */
export default function LatticeField() {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const edges = useMemo(() => latticeEdges(16), []);
  useLayoutEffect(() => {
    const object = new THREE.Object3D();
    edges.forEach(({ axis, center }, index) => {
      object.position.set(...center);
      // The collision clearance remains conservatively wider than the luminous centre line.
      object.scale.set(.018, .018, .018); object.scale.setComponent(axis, 1);
      object.updateMatrix(); mesh.current?.setMatrixAt(index, object.matrix);
    });
    if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
  }, [edges]);
  useFrame(({ camera }) => group.current?.position.set(Math.floor(camera.position.x), Math.floor(camera.position.y), Math.floor(camera.position.z)), -1);
  return <>
    <color attach="background" args={['#03101c']} />
    <fog attach="fog" args={['#03101c', 11, 15]} />
    <group ref={group}><instancedMesh ref={mesh} args={[undefined, undefined, edges.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#48dcff" toneMapped={false} />
    </instancedMesh></group>
  </>;
}
