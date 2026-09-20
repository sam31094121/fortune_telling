'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import TaijiModel from './models/taiji/TaijiModel';
import type { StageSettings } from './LabStage';
import styles from './LatticeInterior.module.css';

function EntranceScene({ settings }: { settings: StageSettings }) {
  useFrame(({ camera, size }) => {
    const distance = Math.max(2.7, 1.35 / Math.tan(Math.PI / 6) / Math.min(1, size.width / size.height));
    camera.position.set(0, distance, 0);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
  });
  return <>
    <color attach="background" args={['#061321']} />
    <ambientLight intensity={settings.ambient} />
    <directionalLight position={[3, 4, 2]} intensity={settings.keyLight} />
    <directionalLight position={[-4, 2, -3]} intensity={settings.fillLight} />
    <TaijiModel wireframe={settings.wireframe} layers={settings.layers} />
  </>;
}

export default function LatticeEntrance({ settings, onEnter, onExit }: {
  settings: StageSettings; onEnter: () => void; onExit: () => void;
}) {
  const open = settings.layers.yin1 === false && settings.layers.yang2 === false;
  return <section className={styles.interior} aria-label="太極內外立方連接入口">
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 3, 0], fov: 60, near: .01, far: 30 }}>
      <EntranceScene settings={settings} />
    </Canvas>
    <header className={styles.header}><div><strong>太極 · 內外立方連接</strong><span>原黑白曲面內的連接投影</span></div><button onClick={onExit}>返回原視角</button></header>
    <div className={styles.controls}>
      <button disabled={!open} onClick={onEnter}>{open ? '進入連接投影' : '通道被前／後圓片封住'}</button>
      <small>進入後可拖動旋轉、向內推進，隨時返回太極。</small>
    </div>
  </section>;
}
