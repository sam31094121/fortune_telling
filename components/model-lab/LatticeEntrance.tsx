'use client';

import { useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, RenderTexture } from '@react-three/drei';
import * as THREE from 'three';
import TaijiModel from './models/taiji/TaijiModel';
import { A } from './models/taiji/geometry';
import { ENTRANCE_SCALE, portalProjection } from './latticeMath';
import LatticeField from './LatticeField';
import type { StageSettings } from './LabStage';
import styles from './LatticeInterior.module.css';

function PortalView({ eyeY }: { eyeY: MutableRefObject<number> }) {
  const camera = useRef<THREE.PerspectiveCamera>(null);
  useFrame(() => {
    if (!camera.current) return;
    const { distance, fov, near } = portalProjection(eyeY.current);
    camera.current.position.set(.5, .5, -distance);
    camera.current.up.set(0, 1, 0);
    camera.current.lookAt(.5, .5, 1);
    camera.current.fov = fov;
    camera.current.near = near;
    camera.current.updateProjectionMatrix();
  }, -2);
  return <><PerspectiveCamera ref={camera} makeDefault manual aspect={1} fov={30} near={.01} far={60} /><LatticeField /></>;
}

// A live, perspective-correct window into the same field, not a finite box or a static image.
function EntranceScene({ settings, entering, onEnter, requestEnter }: {
  settings: StageSettings; entering: boolean; onEnter: () => void; requestEnter: () => void;
}) {
  const elapsed = useRef(0);
  const done = useRef(false);
  const eyeY = useRef(3);
  useFrame(({ camera, size }, dt) => {
    const start = Math.max(2.7, 1.35 / Math.tan(Math.PI / 6) / Math.min(1, size.width / size.height));
    if (entering) elapsed.current = Math.min(.8, elapsed.current + Math.min(dt, .05));
    const t = elapsed.current / .8;
    const ease = t * t * (3 - 2 * t);
    eyeY.current = THREE.MathUtils.lerp(start, A + .12 * ENTRANCE_SCALE, ease);
    camera.position.set(0, eyeY.current, 0);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, -2, 0);
    if (t === 1 && !done.current) { done.current = true; onEnter(); }
  }, -3);
  return <>
    <color attach="background" args={['#080f1d']} />
    <ambientLight intensity={settings.ambient} />
    <directionalLight position={[3, 4, 2]} intensity={settings.keyLight} />
    <directionalLight position={[-4, 2, -3]} intensity={settings.fillLight} />
    <TaijiModel wireframe={settings.wireframe} layers={settings.layers} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, A, 0]} onClick={requestEnter}>
      <planeGeometry args={[ENTRANCE_SCALE, ENTRANCE_SCALE]} />
      <meshBasicMaterial toneMapped={false} side={THREE.DoubleSide}>
        <RenderTexture attach="map" width={768} height={768} samples={2} compute={() => false}>
          <PortalView eyeY={eyeY} />
        </RenderTexture>
      </meshBasicMaterial>
    </mesh>
  </>;
}

export default function LatticeEntrance({ settings, onEnter, onExit }: {
  settings: StageSettings; onEnter: () => void; onExit: () => void;
}) {
  const [entering, setEntering] = useState(false);
  const open = settings.layers.yin1 === false;
  return <section className={styles.interior} aria-label="太極鏤空方格入口預覽">
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 3, 0], fov: 60, near: .01, far: 30 }}>
      <EntranceScene settings={settings} entering={entering} onEnter={onEnter} requestEnter={() => { if (open) setEntering(true); }} />
    </Canvas>
    <header className={styles.header}><div><strong>太極鏤空 · 方格入口</strong><span>外殼不變 · 鏡頭正對原有空口</span></div><button onClick={onExit}>返回原視角</button></header>
    <div className={styles.controls}>
      <p>透過方口看見深層格網 · 進入後六向延伸</p>
      <button disabled={!open || entering} onClick={() => setEntering(true)}>{!open ? '此空口已被陰片 1 封住' : entering ? '正在穿過方口…' : '穿過方口 · 進入延伸空間'}</button>
      <small>正方格邊長比例 1:1；進入後可往六方向延伸。不是數學四維。</small>
    </div>
  </section>;
}
