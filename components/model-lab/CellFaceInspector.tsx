'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import TesseractModel from './TesseractModel';
import { CONTACT_CELL_FACES, PROJECTION, VERTICES_4D, project4D, rotate4D } from './projectionMath';
import styles from './LatticeInterior.module.css';

function FaceScene({ face, inside, angles, turn, locked, zoom }: {
  face: number; inside: boolean; angles: [number, number];
  turn: (dx: number, dy: number) => void; locked: boolean; zoom: number;
}) {
  const { camera, gl, size, invalidate } = useThree();
  const ids = CONTACT_CELL_FACES[face].ids;
  const points = useMemo(() => ids.map(id => new THREE.Vector3(...project4D(rotate4D(VERTICES_4D[id], ...angles)))), [ids, angles]);
  useEffect(() => {
    const c = camera as THREE.PerspectiveCamera;
    if (locked) {
      const center = points.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(.25);
      const up = points[1].clone().sub(points[0]).normalize();
      const normal = up.clone().cross(points[3].clone().sub(points[0])).normalize();
      if (normal.dot(center) < 0) normal.negate();
      const distance = inside ? center.length() : 5;
      c.position.copy(inside ? new THREE.Vector3() : center.clone().addScaledVector(normal, distance));
      c.up.copy(up); c.lookAt(center);
      const side = Math.max(40, Math.min(size.width - 90, size.height - 70) * .8);
      c.fov = THREE.MathUtils.clamp(2 * Math.atan(size.height / (side * distance)) * 180 / Math.PI / zoom, 3, 165);
    } else {
      c.position.set(...PROJECTION.camera).multiplyScalar(PROJECTION.cameraScale);
      c.up.set(0, 1, 0); c.lookAt(0, 0, 0); c.fov = 40 / zoom;
    }
    c.updateProjectionMatrix(); invalidate();
  }, [camera, points, inside, locked, zoom, size, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement;
    let previous: { id: number; x: number; y: number } | null = null;
    const down = (e: PointerEvent) => { if (!locked) { previous = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); } };
    const move = (e: PointerEvent) => { if (!locked && previous?.id === e.pointerId) { turn((e.clientX - previous.x) * .006, (e.clientY - previous.y) * .006); previous = { id: e.pointerId, x: e.clientX, y: e.clientY }; } };
    const up = () => { previous = null; };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('lostpointercapture', up);
    return () => { canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('lostpointercapture', up); };
  }, [gl, locked, turn]);
  return <><color attach="background" args={[PROJECTION.background]} /><TesseractModel xw={angles[0]} yw={angles[1]} />
    <Line points={[...points, points[0]]} color="#ffdc78" lineWidth={3} />
    {points.map((p, i) => <Html key={ids[i]} position={p} center style={{ pointerEvents: 'none', color: '#ffe9ad', background: '#071522dd', padding: '3px 5px', fontSize: 11, whiteSpace: 'nowrap' }}>{String.fromCharCode(65 + i)}{ids[i]}</Html>)}
  </>;
}

/** Source IDs never change during rotation; face selection is explicit. */
export default function CellFaceInspector({ onExit }: { onExit: () => void }) {
  const [face, setFace] = useState(0), [inside, setInside] = useState(true);
  const [angles, setAngles] = useState<[number, number]>([Math.PI / 2, 0]);
  const [locked, setLocked] = useState(true), [zoom, setZoom] = useState(1);
  const animation = useRef(0);
  useEffect(() => () => cancelAnimationFrame(animation.current), []);
  const align = () => {
    cancelAnimationFrame(animation.current); setLocked(false); setZoom(1);
    const start = performance.now(), from = angles;
    const frame = (now: number) => { const t = Math.min(1, (now - start) / 650), k = t * t * (3 - 2 * t); setAngles([from[0] + (Math.PI / 2 - from[0]) * k, from[1] * (1 - k)]); if (t < 1) animation.current = requestAnimationFrame(frame); else setLocked(true); };
    animation.current = requestAnimationFrame(frame);
  };
  const ids = CONTACT_CELL_FACES[face].ids;
  const points = ids.map(id => new THREE.Vector3(...project4D(rotate4D(VERTICES_4D[id], ...angles))));
  const lengths = points.map((p, i) => p.distanceTo(points[(i + 1) % 4]));
  const cornerAngles = points.map((p, i) => points[(i + 3) % 4].clone().sub(p).angleTo(points[(i + 1) % 4].clone().sub(p)) * 180 / Math.PI);
  return <section className={styles.inspector} aria-label="同一四維胞元六面檢查">
    <header><strong>同一單元 · 六面逐一檢查</strong><button onClick={onExit}>返回連接結構</button></header>
    <nav aria-label="選擇實際面">{CONTACT_CELL_FACES.map((f, i) => <button key={f.name} aria-pressed={face === i} onClick={() => { setFace(i); setZoom(1); }}>{f.name}</button>)}</nav>
    <div className={styles.inspectorStage}><Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ fov: 100, near: .01, far: 100 }}><FaceScene face={face} inside={inside} angles={angles} turn={(dx, dy) => setAngles(([x, y]) => [x + dx, y + dy])} locked={locked} zoom={zoom} /></Canvas></div>
    <footer><div><button onClick={() => setInside(v => !v)}>{inside ? '切到外部' : '切到內部'}</button><button onClick={align}>四維轉正／適合畫面</button><button onClick={() => { cancelAnimationFrame(animation.current); setLocked(false); }}>自由四維轉動</button><button onClick={() => setZoom(z => Math.min(4, z * 1.2))}>＋</button><button onClick={() => setZoom(z => Math.max(.5, z / 1.2))}>－</button></div>
      <p>{locked ? '已鎖定正視' : '拖動＝真正 XW／YW 四維旋轉'} · {CONTACT_CELL_FACES[face].name} · 頂點 {ids.join(' → ')}</p>
      <p>投影 3D 四邊：{lengths.map(v => v.toFixed(4)).join(' / ')}<br />四角：{cornerAngles.map(v => v.toFixed(3)).join('° / ')}°</p>
      <small>同一源胞元 x=+1，源 4D 四邊均為 2。此頁驗證胞元幾何，不代表太極接縫已通過。</small>
    </footer>
  </section>;
}
