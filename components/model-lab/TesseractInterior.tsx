'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import TesseractModel from './TesseractModel';
import MultiverseField from './MultiverseField';
import CellFaceInspector from './CellFaceInspector';
import TaijiModel from './models/taiji/TaijiModel';
import { geometryFacts } from './multiverseMath';
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
  return <><color attach="background" args={[PROJECTION.background]} /><ambientLight intensity={1} /><directionalLight position={[3, 4, 5]} intensity={2} /><group ref={group}><group scale={1 / PROJECTION.taijiScale}><TaijiModel wireframe={false} layers={{ ghost: false, yin1: false, yang2: false }} /></group>{multiverse ? <MultiverseField /> : null}</group></>;
}

const FACTS = geometryFacts();
const round = (value: number) => Math.round(value * 1000) / 1000;

export default function TesseractInterior({ onExit }: { onExit: () => void }) {
  const zoom = useRef<((factor: number) => void) | null>(null);
  const [multiverse, setMultiverse] = useState(false);
  const [inspect, setInspect] = useState(false);
  useEffect(() => { const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') onExit(); }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, [onExit]);
  if (inspect) return <CellFaceInspector onExit={() => setInspect(false)} />;
  return <section className={styles.interior} aria-label="太極內外立方連接投影">
    <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ fov: 40, near: .01, far: 100 }} gl={{ antialias: true }}><Scene zoom={zoom} multiverse={multiverse} /></Canvas>
    <header className={styles.header}><div><strong>太極 · 內外立方連接</strong><span>拖動旋轉 · 滾輪或雙指推進</span></div><button onClick={onExit}>返回太極</button></header>
    <div className={styles.controls}>
      <button onClick={() => setInspect(true)}>同一單元六面檢查</button>{' '}
      <button onClick={() => zoom.current?.(.8)}>推進</button>{' '}<button onClick={() => zoom.current?.(1.25)}>後退</button>{' '}<button aria-pressed={multiverse} onClick={() => setMultiverse(on => !on)}>{multiverse ? '只看一個單元' : '四角形多重宇宙（1:1 貼面）'}</button>
      <details className={styles.facts}><summary>四維與三維・精算對照</summary>
        <table className={styles.facts}><tbody>
          <tr><th>三維立方</th><td>{FACTS.cube.vertices} 個角・{FACTS.cube.edges} 條線・{FACTS.cube.squareFaces} 個正方形面</td></tr>
          <tr><th>四維超立方</th><td>{FACTS.tesseract.vertices} 個角・{FACTS.tesseract.edges} 條線・{FACTS.tesseract.squareFaces} 個正方形面・{FACTS.tesseract.cells} 個立方單元</td></tr>
          <tr><th>投影換算</th><td>scale = {PROJECTION.numerator} ÷ ({PROJECTION.distance4D} − w)：外立方邊長 {round(FACTS.projected.outerEdge)}、內立方 {round(FACTS.projected.innerEdge)}、連接邊 {round(FACTS.projected.bridge)}</td></tr>
          <tr><th>貼住太極</th><td>放進太極後每格 {round(FACTS.taiji.cell)}、線寬 {FACTS.taiji.line}，與方形內壁 1:1，八個角落在內壁格點上</td></tr>
        </tbody></table>
        <small>數字都是從真的頂點與邊數算出來的（守門：npm run test:model-lab-multiverse）。四維邊長本來相等，投影到三維後連接邊會被壓短，所以連接面不一定是正方形；重複鋪排是視覺上的無盡感，不是數學上的四維空間填充。</small>
      </details>
    </div>
  </section>;
}
