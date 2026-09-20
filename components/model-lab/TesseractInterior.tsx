'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import TesseractModel from './TesseractModel';
import MultiverseField from './MultiverseField';
import { PROJECTION } from './projectionMath';
import styles from './LatticeInterior.module.css';

function Scene({ zoom, multiverse }: { zoom: MutableRefObject<((factor: number) => void) | null>; multiverse: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { camera, gl, size, invalidate } = useThree();
  useEffect(() => {
    camera.position.set(...PROJECTION.camera).multiplyScalar(PROJECTION.cameraScale * Math.max(1, .9 / (size.width / size.height)));
    camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); invalidate();
  }, [camera, size.width, size.height, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    const dolly = (factor: number) => {
      const length = camera.position.length();
      camera.position.multiplyScalar(THREE.MathUtils.clamp(length * factor, .7, 20) / length);
      camera.lookAt(0, 0, 0); invalidate();
    };
    zoom.current = dolly;
    const down = (e: PointerEvent) => { pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => {
      const previous = pointers.get(e.pointerId); if (!previous) return;
      if (pointers.size === 1 && group.current) {
        group.current.rotation.y += (e.clientX - previous.x) * .006;
        group.current.rotation.x += (e.clientY - previous.y) * .006;
        invalidate();
      } else if (pointers.size === 2) {
        const other = [...pointers.entries()].find(([id]) => id !== e.pointerId)![1];
        const before = Math.hypot(previous.x - other.x, previous.y - other.y);
        const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        if (before > 1 && after > 1) dolly(before / after);
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    const up = (e: PointerEvent) => pointers.delete(e.pointerId);
    const wheel = (e: WheelEvent) => { e.preventDefault(); dolly(Math.exp(e.deltaY * .0015)); };
    const clear = () => pointers.clear();
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('lostpointercapture', up);
    canvas.addEventListener('wheel', wheel, { passive: false }); window.addEventListener('blur', clear);
    return () => {
      zoom.current = null; canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('lostpointercapture', up);
      canvas.removeEventListener('wheel', wheel); window.removeEventListener('blur', clear);
    };
  }, [camera, gl, invalidate, zoom]);
  return <><color attach="background" args={[PROJECTION.background]} /><group ref={group}><TesseractModel />{multiverse ? <MultiverseField /> : null}</group></>;
}

export default function TesseractInterior({ onExit }: { onExit: () => void }) {
  const zoom = useRef<((factor: number) => void) | null>(null);
  const [multiverse, setMultiverse] = useState(false);
  useEffect(() => { const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') onExit(); }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, [onExit]);
  return <section className={styles.interior} aria-label="太極內外立方連接投影">
    <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ fov: 40, near: .01, far: 100 }} gl={{ antialias: true }}><Scene zoom={zoom} multiverse={multiverse} /></Canvas>
    <header className={styles.header}><div><strong>太極 · 內外立方連接</strong><span>拖動旋轉 · 滾輪或雙指推進</span></div><button onClick={onExit}>返回太極</button></header>
    <div className={styles.controls}>
      <button onClick={() => zoom.current?.(.8)}>推進</button>{' '}<button onClick={() => zoom.current?.(1.25)}>後退</button>{' '}<button aria-pressed={multiverse} onClick={() => setMultiverse(on => !on)}>{multiverse ? '只看一個單元' : '四角形多重宇宙（1:1 貼面）'}</button>
      <details className={styles.facts}><summary>幾何說明</summary><small>16 頂點、32 邊、8 個立方單元；四維裡的 24 個面都是正方形。原四維邊長相等；三維投影後的連接面不一定是正方形。開「四角形多重宇宙」是把同一個單元往六個方向 1:1 面貼面鋪開：外立方投影後邊長 2、間距也是 2，相鄰兩個單元剛好共用一整面的四條邊，不留縫也不重疊——那是視覺上的無盡感，不是數學上的四維空間填充。</small></details>
    </div>
  </section>;
}
