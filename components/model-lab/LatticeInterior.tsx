'use client';

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { moveSafely, rebase, type Address, type Point } from './latticeMath';
import LatticeField from './LatticeField';
import styles from './LatticeInterior.module.css';

type Input = { held: Set<string>; look: [number, number]; reset: boolean };
const BINDINGS: Record<string, string> = { KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right', KeyR: 'up', KeyF: 'down', ArrowLeft: 'yawLeft', ArrowRight: 'yawRight', ArrowUp: 'pitchUp', ArrowDown: 'pitchDown', KeyQ: 'rollLeft', KeyE: 'rollRight', ShiftLeft: 'fast', ShiftRight: 'fast' };

function InteriorScene({ input, readout }: { input: MutableRefObject<Input>; readout: MutableRefObject<HTMLSpanElement | null> }) {
  const address = useRef<Address>(rebase({ chunk: [BigInt(0), BigInt(0), BigInt(0)], local: [.5, .5, -.12] }));
  const elapsed = useRef(0);
  const { camera, gl } = useThree();
  const work = useMemo(() => ({ rotation: new THREE.Quaternion(), axis: new THREE.Vector3(), movement: new THREE.Vector3() }), []);
  useEffect(() => {
    camera.position.set(...address.current.local);
    camera.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    const canvas = gl.domElement;
    let pointer: number | null = null, x = 0, y = 0;
    const down = (event: PointerEvent) => { if (pointer !== null) return; pointer = event.pointerId; x = event.clientX; y = event.clientY; canvas.setPointerCapture(pointer); };
    const move = (event: PointerEvent) => {
      if (pointer !== event.pointerId) return;
      input.current.look[0] += event.clientX - x;
      input.current.look[1] += event.clientY - y;
      x = event.clientX; y = event.clientY;
    };
    const up = () => { pointer = null; };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('lostpointercapture', up); window.addEventListener('blur', up); document.addEventListener('visibilitychange', up);
    return () => {
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('lostpointercapture', up); window.removeEventListener('blur', up); document.removeEventListener('visibilitychange', up);
    };
  }, [camera, gl, input]);
  useFrame((_, dt) => {
    const d = Math.min(dt, .05), state = input.current, held = state.held;
    const value = (a: string, b: string) => Number(held.has(a)) - Number(held.has(b));
    if (state.reset) {
      camera.quaternion.setFromAxisAngle(work.axis.set(0, 1, 0), Math.PI);
      state.look = [0, 0]; state.reset = false;
    }
    const turns: [Point, number][] = [
      [[0, 1, 0], value('yawLeft', 'yawRight') * d - state.look[0] * .003],
      [[1, 0, 0], value('pitchUp', 'pitchDown') * d - state.look[1] * .003],
      [[0, 0, 1], value('rollLeft', 'rollRight') * d],
    ];
    state.look = [0, 0];
    for (const [axis, angle] of turns) camera.quaternion.multiply(work.rotation.setFromAxisAngle(work.axis.set(...axis), angle));
    camera.quaternion.normalize();
    work.movement.set(value('right', 'left'), value('up', 'down'), value('back', 'forward'));
    if (work.movement.lengthSq()) {
      work.movement.normalize().applyQuaternion(camera.quaternion).multiplyScalar(d * (held.has('fast') ? 1.2 : .6));
      address.current.local = moveSafely(address.current.local, work.movement.toArray() as Point);
      address.current = rebase(address.current);
    }
    camera.position.set(...address.current.local);
    elapsed.current += d;
    if (elapsed.current > .25 && readout.current) {
      elapsed.current = 0;
      readout.current.textContent = `方格 ${address.current.chunk.map((n, i) => (n * BigInt(8) + BigInt(Math.floor(address.current.local[i]))).toString()).join(' · ')}`;
    }
  }, -2);
  return <LatticeField />;
}

export default function LatticeInterior({ onExit }: { onExit: () => void }) {
  const input = useRef<Input>({ held: new Set(), look: [0, 0], reset: false });
  const readout = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const clear = () => { input.current.held.clear(); input.current.look = [0, 0]; };
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Escape') { onExit(); return; }
      if (BINDINGS[event.code]) { event.preventDefault(); input.current.held.add(BINDINGS[event.code]); }
    };
    const up = (event: KeyboardEvent) => { if (BINDINGS[event.code]) input.current.held.delete(BINDINGS[event.code]); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
    return () => { clear(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear); };
  }, [onExit]);
  const button = (action: string, label: string) => <button key={action} type="button" aria-label={label}
    onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); input.current.held.add(action); }}
    onPointerUp={() => input.current.held.delete(action)} onPointerCancel={() => input.current.held.delete(action)} onLostPointerCapture={() => input.current.held.delete(action)}>{label}</button>;
  return <section className={styles.interior} aria-label="連續正方格內景">
    <Canvas dpr={[1, 1.5]} camera={{ position: [.5, .5, 7.88], fov: 60, near: .01, far: 40 }} gl={{ antialias: true }}>
      <InteriorScene input={input} readout={readout} />
    </Canvas>
    <header className={styles.header}>
      <div><strong>連續方格空間</strong><span ref={readout}>每格等大 · 六面相通</span></div>
      <button type="button" onClick={onExit}>返回太極</button>
    </header>
    <div className={styles.controls}>
      <p>拖動畫面轉向 · 按住移動 · 格邊始終 1:1</p>
      <div className={styles.rows} aria-label="移動控制">
        {button('forward', '前進')}{button('back', '後退')}{button('left', '左移')}{button('right', '右移')}{button('up', '上移')}{button('down', '下移')}
      </div>
      <div className={styles.rows} aria-label="轉向控制">
        {button('yawLeft', '向左看')}{button('yawRight', '向右看')}{button('pitchUp', '向上看')}{button('pitchDown', '向下看')}{button('rollLeft', '左翻轉')}{button('rollRight', '右翻轉')}
      </div>
      <button type="button" onClick={() => { input.current.reset = true; }}>正對格面</button>
      <small>獨立內景，隨移動延伸。電腦：WASD 移動、R/F 升降、方向鍵轉向、Q/E 翻轉。</small>
    </div>
  </section>;
}
