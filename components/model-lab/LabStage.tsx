'use client';

import { Suspense, useEffect, useMemo, useRef, Component, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid, OrbitControls, TrackballControls, OrthographicCamera, PerspectiveCamera, GizmoHelper, GizmoViewport, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { LAB_MODELS, type LabView } from './models/registry';

export interface StageSettings {
  modelId: string;
  glbUrl: string | null;
  wireframe: boolean;
  showGrid: boolean;
  showGizmo: boolean;
  showShadow: boolean;
  autoRotate: boolean;
  background: string;
  ambient: number;
  keyLight: number;
  fillLight: number;
  keyAngle: number;
  fov: number;
  ortho: boolean;
  viewId: string | null;
  viewNonce: number;
  layers: Record<string, boolean>;
  dragSpeed: number;
}

/** 方向鍵：(sx, sy) 為畫面方向（右、上為正），物體朝該方向轉 degrees 度。 */
export type NudgeFn = (sx: number, sy: number, degrees: number) => void;

const IDENTITY_Q: [number, number, number, number] = [0, 0, 0, 1];
const ORIGIN: [number, number, number] = [0, 0, 0];
const PERSPECTIVE_START: [number, number, number] = [3, 2.2, 3.6];
const ORTHO_START: [number, number, number] = [0, 0, 10];

/** GLB 載入失敗不該把整個舞台打掉，就地報錯即可。 */
class LoadBoundary extends Component<{ children: ReactNode; onError: (m: string) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError(error.message || '模型載入失敗');
  }
  componentDidUpdate(prev: { children: ReactNode }) {
    if (prev.children !== this.props.children && this.state.failed) this.setState({ failed: false });
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function LoadedModel({ url, wireframe }: { url: string; wireframe: boolean }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    cloned.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => {
        if (material && 'wireframe' in material) (material as THREE.MeshStandardMaterial).wireframe = wireframe;
      });
    });
  }, [cloned, wireframe]);
  return <primitive object={cloned} />;
}

/** 相機讀數直接寫進 DOM，不走 state，免得每幀重繪整個面板。 */
function CameraReadout({ target }: { target: RefObject<HTMLElement | null> }) {
  const { camera } = useThree();
  const clock = useRef(0);
  useFrame((_, delta) => {
    clock.current += delta;
    if (clock.current < 0.15 || !target.current) return;
    clock.current = 0;
    const p = camera.position;
    const zoom = (camera as THREE.OrthographicCamera).isOrthographicCamera ? `   縮放 ${camera.zoom.toFixed(1)}` : '';
    target.current.textContent =
      `x ${p.x.toFixed(2)}  y ${p.y.toFixed(2)}  z ${p.z.toFixed(2)}   距原點 ${p.length().toFixed(2)}${zoom}`;
  });
  return null;
}

function CanvasHandle({ onReady }: { onReady: (gl: THREE.WebGLRenderer) => void }) {
  const { gl } = useThree();
  useEffect(() => onReady(gl), [gl, onReady]);
  return null;
}

/** 套用視角：相機回到 +Z 正前方，依畫面半高決定縮放，讓模型與參考幀同尺寸。 */
function ViewRig({ view, ortho, nonce, fov }: { view: LabView | null; ortho: boolean; nonce: number; fov: number }) {
  const camera = useThree((s) => s.camera);
  const height = useThree((s) => s.size.height);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  useEffect(() => {
    if (!view) return;
    if (ortho && (camera as THREE.OrthographicCamera).isOrthographicCamera) {
      camera.position.set(0, 0, 10);
      camera.zoom = height / 2 / view.halfHeight;
    } else if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      camera.position.set(0, 0, view.halfHeight / Math.tan(THREE.MathUtils.degToRad(fov) / 2));
    }
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }, [view, ortho, nonce, height, fov, camera, controls]);
  return null;
}

/** 以相機自身的上、右軸繞目標點轉，連同 up 一起轉，可以翻過頭頂不卡住。 */
function CameraNudger({ nudgeRef }: { nudgeRef: RefObject<NudgeFn | null> }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  useEffect(() => {
    nudgeRef.current = (sx, sy, degrees) => {
      const target = controls?.target ?? new THREE.Vector3();
      const offset = camera.position.clone().sub(target);
      const up = camera.up.clone().normalize();
      const right = new THREE.Vector3().crossVectors(up, offset).normalize();
      const axis = up.multiplyScalar(-sx).add(right.multiplyScalar(sy));
      if (axis.lengthSq() === 0) return;
      axis.normalize();
      const angle = THREE.MathUtils.degToRad(degrees);
      offset.applyAxisAngle(axis, angle);
      camera.up.applyAxisAngle(axis, angle);
      camera.position.copy(target).add(offset);
      camera.lookAt(target);
      controls?.update();
    };
    return () => {
      nudgeRef.current = null;
    };
  }, [camera, controls, nudgeRef]);
  return null;
}

export default function LabStage({
  settings,
  readoutRef,
  nudgeRef,
  onRendererReady,
  onLoadError,
}: {
  settings: StageSettings;
  readoutRef: RefObject<HTMLElement | null>;
  nudgeRef: RefObject<NudgeFn | null>;
  onRendererReady: (gl: THREE.WebGLRenderer) => void;
  onLoadError: (message: string) => void;
}) {
  const entry = LAB_MODELS.find((m) => m.id === settings.modelId) ?? LAB_MODELS[0];
  const Model = entry.Component;
  const view = entry.views?.find((v) => v.id === settings.viewId) ?? null;
  const keyRad = (settings.keyAngle * Math.PI) / 180;
  const keyPos: [number, number, number] = [Math.cos(keyRad) * 4, 5, Math.sin(keyRad) * 4];
  const modelPosition: [number, number, number] = view ? [view.offset[0], view.offset[1], 0] : ORIGIN;

  return (
    <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true, antialias: true }}>
      {settings.ortho ? (
        <OrthographicCamera makeDefault position={ORTHO_START} near={0.01} far={100} zoom={100} />
      ) : (
        <PerspectiveCamera makeDefault position={PERSPECTIVE_START} fov={settings.fov} near={0.01} far={200} />
      )}
      <color attach="background" args={[settings.background]} />
      <CanvasHandle onReady={onRendererReady} />
      <CameraReadout target={readoutRef} />

      <ambientLight intensity={settings.ambient} />
      <directionalLight
        position={keyPos}
        intensity={settings.keyLight}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <directionalLight position={[-4, 2, -3]} intensity={settings.fillLight} />

      <Suspense fallback={null}>
        {settings.glbUrl ? (
          <LoadBoundary onError={onLoadError}>
            <LoadedModel url={settings.glbUrl} wireframe={settings.wireframe} />
          </LoadBoundary>
        ) : (
          <group quaternion={view?.quaternion ?? IDENTITY_Q} position={modelPosition}>
            <Model wireframe={settings.wireframe} layers={settings.layers} />
          </group>
        )}
      </Suspense>

      {settings.showShadow ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <shadowMaterial opacity={0.28} />
        </mesh>
      ) : null}

      {settings.showGrid ? (
        <Grid
          args={[20, 20]}
          cellSize={0.1}
          cellThickness={0.5}
          cellColor="#3a4358"
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#5c6b8a"
          fadeDistance={26}
          fadeStrength={1}
          infiniteGrid
          followCamera={false}
        />
      ) : null}

      {settings.showGizmo ? (
        <GizmoHelper alignment="bottom-right" margin={[70, 70]}>
          <GizmoViewport axisColors={['#e0555c', '#66c06c', '#4c8bd8']} labelColor="#e8ecf5" />
        </GizmoHelper>
      ) : null}

      {settings.autoRotate ? (
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} autoRotate autoRotateSpeed={0.9} rotateSpeed={settings.dragSpeed} />
      ) : (
        // 軌道控制會把上下翻轉鎖在兩極之間；檢查模型要能翻過頭頂，改用不設限的軌跡球
        <TrackballControls makeDefault rotateSpeed={settings.dragSpeed} zoomSpeed={1.2} panSpeed={0.8} dynamicDampingFactor={0.15} />
      )}
      <CameraNudger nudgeRef={nudgeRef} />
      <ViewRig view={view} ortho={settings.ortho} nonce={settings.viewNonce} fov={settings.fov} />
    </Canvas>
  );
}
