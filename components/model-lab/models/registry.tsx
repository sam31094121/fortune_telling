'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ComponentType } from 'react';
import type { Group } from 'three';
import TaijiModel, { TAIJI_LAYERS } from './taiji/TaijiModel';
import EqualEdgeTesseract from '../EqualEdgeTesseract';
import { TAIJI_REFS, TAIJI_VIEWS } from './taiji/alignment';

export interface LabModelProps {
  wireframe: boolean;
  layers: Record<string, boolean>;
}

export interface LabLayer {
  id: string;
  name: string;
  defaultOn: boolean;
}

/** 物體姿態預設：相機固定在 +Z 正交，模型轉到 quaternion，畫面半高 halfHeight 個單位。 */
export interface LabView {
  id: string;
  name: string;
  quaternion: [number, number, number, number];
  halfHeight: number;
  offset: [number, number];
  note?: string;
}

/** 對位參考幀：套用時一併切換視角、圖層與疊圖。 */
export interface LabRef {
  id: string;
  name: string;
  src: string;
  viewId: string;
  layers: Record<string, boolean>;
}

export interface LabModel {
  id: string;
  name: string;
  note: string;
  Component: ComponentType<LabModelProps>;
  layers?: LabLayer[];
  views?: LabView[];
  refs?: LabRef[];
}

/** 還沒有模型時的佔位標記。不是作品，只是告訴你舞台活著、燈打得到東西。 */
function EmptySlot({ wireframe }: LabModelProps) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.4;
  });
  return (
    <group ref={ref}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial color="#6b7a99" roughness={0.45} metalness={0.15} wireframe={wireframe} />
      </mesh>
    </group>
  );
}

/** 比例尺：1 單位 = 1 公尺，柱高 1.7m，用來對影片裡物件的相對大小。 */
function ScaleRuler({ wireframe }: LabModelProps) {
  return (
    <group>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 1.7, 16]} />
        <meshStandardMaterial color="#8fa3c4" roughness={0.6} wireframe={wireframe} />
      </mesh>
      <mesh position={[0, 1.78, 0]}>
        <sphereGeometry args={[0.12, 24, 16]} />
        <meshStandardMaterial color="#c3d0e6" roughness={0.5} wireframe={wireframe} />
      </mesh>
    </group>
  );
}

export const LAB_MODELS: LabModel[] = [
  {
    id: 'taiji',
    name: '立體太極球',
    note: '球被四個平面切出四個圓面，接縫中心對稱，兩點是圓面中心的正圓（半徑 0.2）。球半徑 1。',
    Component: TaijiModel,
    layers: TAIJI_LAYERS,
    views: TAIJI_VIEWS,
    refs: TAIJI_REFS,
  },
  {
    id: 'tesseract-equal',
    name: '四維單元・等長投影',
    note: '平行投影（方向 1,1,1,1）：32 條邊在畫面上長度完全相同（√3），外立方與內立方一樣大。太極裡用的是透視投影，看起來一大一小——那是眼睛被騙，四維裡本來就等長。外殼是菱形十二面體（對照 Wolfram MathWorld 與 Wikipedia）。',
    Component: EqualEdgeTesseract,
    layers: [{ id: 'spin', name: '自動旋轉', defaultOn: true }],
  },
  { id: 'empty', name: '空舞台（佔位）', note: '還沒放模型。燈光與相機在跑，代表舞台正常。', Component: EmptySlot },
  { id: 'ruler', name: '比例尺 1.7m', note: '1 單位 = 1 公尺。拿來對影片裡物件的相對大小。', Component: ScaleRuler },
];

export function defaultLayers(model: LabModel | undefined): Record<string, boolean> {
  return Object.fromEntries((model?.layers ?? []).map((l) => [l.id, l.defaultOn]));
}
