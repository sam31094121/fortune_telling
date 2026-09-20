'use client';

import { useEffect, useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { LabModelProps } from '../registry';
import TesseractModel from '../../TesseractModel';
import TaijiTesseractField from '../../TaijiTesseractField';
import { PROJECTION } from '../../projectionMath';
import { createContactRibs } from './contactRibs';
import {
  arcDotGeometry,
  bandGeometry,
  capGeometry,
  discGeometry,
  dotGeometry,
  meridianGeometry,
  rimPoints,
  seamPoints,
  PIECES,
  type DiscId,
  type PieceId,
} from './geometry';

export const TAIJI_LAYERS = [
  { id: 'squareCavity', name: '內外立方連接投影', defaultOn: true },
  { id: 'cellField', name: '每一格都是四維格子（貼住內壁）', defaultOn: false },
  { id: 'ghost', name: '粉紅線框球', defaultOn: false },
  { id: 'seam', name: '金色接縫', defaultOn: true },
  { id: 'rim', name: '外圈大圓', defaultOn: true },
  { id: 'flatStyle', name: '平面畫法（圓面＋平貼魚眼）', defaultOn: true },
  { id: 'arcStyle', name: '弧形畫法（球冠＋球面魚眼）', defaultOn: true },
  { id: 'black', name: '陰片（黑）全部', defaultOn: true },
  { id: 'white', name: '陽片（白）全部', defaultOn: true },
  { id: 'yin1', name: '陰片 1 號（前・+y）', defaultOn: false },
  { id: 'yin2', name: '陰片 2 號（後・−z）', defaultOn: true },
  { id: 'yang1', name: '陽片 1 號（前・+z）', defaultOn: true },
  { id: 'yang2', name: '陽片 2 號（後・−y）', defaultOn: false },
  { id: 'dotWhite', name: '白點・+y 圓面（實測）', defaultOn: true },
  { id: 'dotBlack', name: '黑點・+z 圓面（實測）', defaultOn: true },
  { id: 'dotsBack', name: '背面兩點（推論，未驗證）', defaultOn: true },
  { id: 'dotFrontRound', name: '平面魚眼改成正面看起來圓（35s 後畫面）', defaultOn: true },
];

const GOLD = '#d9b23d';
const PIECE_IDS: PieceId[] = ['yin1', 'yin2', 'yang1', 'yang2'];
const DOT_LAYER: Record<DiscId, string> = { '+y': 'dotWhite', '+z': 'dotBlack', '-y': 'dotsBack', '-z': 'dotsBack' };

type GeoMap = Record<DiscId, THREE.BufferGeometry>;
const byDisc = (make: (d: DiscId) => THREE.BufferGeometry) =>
  Object.fromEntries((['+y', '-y', '+z', '-z'] as DiscId[]).map((d) => [d, make(d)])) as GeoMap;

export default function TaijiModel({ wireframe, layers }: LabModelProps) {
  const geo = useMemo(
    () => ({
      band: Object.fromEntries(PIECE_IDS.map((p) => [p, bandGeometry(PIECES[p].side, PIECES[p].hemi)])) as Record<PieceId, THREE.BufferGeometry>,
      disc: byDisc(discGeometry),
      cap: byDisc(capGeometry),
      dot: byDisc((d) => dotGeometry(d, 'circle')),
      dotFrontRound: byDisc((d) => dotGeometry(d, 'frontRound')),
      arcDot: byDisc(arcDotGeometry),
      meridians: meridianGeometry(),
      seam: seamPoints(),
      rim: rimPoints(),
    }),
    [],
  );

  const mat = useMemo(
    () => ({
      black: new THREE.MeshStandardMaterial({ color: '#070707', roughness: 0.6, metalness: 0, side: THREE.DoubleSide }),
      white: new THREE.MeshStandardMaterial({ color: '#dfe5f0', roughness: 0.32, metalness: 0.25, side: THREE.DoubleSide }),
      blackDot: new THREE.MeshStandardMaterial({ color: '#070707', roughness: 0.6, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
      whiteDot: new THREE.MeshStandardMaterial({ color: '#dfe5f0', roughness: 0.32, metalness: 0.25, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
      ghost: new THREE.MeshBasicMaterial({ color: '#b56d93', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
      meridian: new THREE.LineBasicMaterial({ color: '#f2c9df', transparent: true, opacity: 0.75, depthWrite: false }),
    }),
    [],
  );

  const contacts = useMemo(() => createContactRibs([
    geo.band.yin2, geo.band.yang1, geo.disc['-z'], geo.disc['+z'], geo.cap['-z'], geo.cap['+z'],
  ]), [geo]);
  useEffect(() => () => contacts.forEach(rib => { rib.geometry.dispose(); rib.pad.dispose(); }), [contacts]);

  useEffect(() => {
    [mat.black, mat.white, mat.blackDot, mat.whiteDot].forEach((m) => {
      m.wireframe = wireframe;
      m.needsUpdate = true;
    });
  }, [wireframe, mat]);

  useEffect(
    () => () => {
      [geo.band, geo.disc, geo.cap, geo.dot, geo.dotFrontRound, geo.arcDot].forEach((group) =>
        Object.values(group).forEach((g) => g.dispose()),
      );
      geo.meridians.dispose();
      Object.values(mat).forEach((m) => m.dispose());
    },
    [geo, mat],
  );

  const on = (id: string) => layers[id] !== false;

  return (
    <group>
      {on('squareCavity') && on('flatStyle') && on('black') && on('white') && on('yin2') && on('yang1') ? <>
        <TesseractModel scale={PROJECTION.taijiScale} />
        {on('cellField') ? <TaijiTesseractField /> : null}
        {contacts.map(rib => <group key={rib.edge.join('-')}>
          <mesh geometry={rib.geometry}><meshStandardMaterial color="#426d79" transparent opacity={.08} roughness={.7} side={THREE.DoubleSide} depthWrite={false} /></mesh>
          <mesh geometry={rib.pad}><meshStandardMaterial color="#20323a" roughness={.8} side={THREE.DoubleSide} /></mesh>
        </group>)}
      </> : null}
      {PIECE_IDS.map((id) => {
        const { side, disc } = PIECES[id];
        if (!on(side) || !on(id)) return null;
        const surface = mat[side];
        const dotMat = side === 'black' ? mat.whiteDot : mat.blackDot;
        const showDot = on(DOT_LAYER[disc]);
        return (
          <group key={id}>
            <mesh geometry={geo.band[id]} material={surface} />
            {on('flatStyle') ? (
              <>
                <mesh geometry={geo.disc[disc]} material={surface} />
                {showDot ? <mesh geometry={on('dotFrontRound') ? geo.dotFrontRound[disc] : geo.dot[disc]} material={dotMat} /> : null}
              </>
            ) : null}
            {on('arcStyle') ? (
              <>
                <mesh geometry={geo.cap[disc]} material={surface} />
                {showDot ? <mesh geometry={geo.arcDot[disc]} material={dotMat} /> : null}
              </>
            ) : null}
          </group>
        );
      })}

      {on('ghost') ? (
        <>
          <mesh material={mat.ghost}>
            <sphereGeometry args={[0.998, 64, 48]} />
          </mesh>
          <lineSegments geometry={geo.meridians} material={mat.meridian} />
        </>
      ) : null}

      {on('seam') ? <Line points={geo.seam} color={GOLD} lineWidth={2.5} /> : null}
      {on('rim') ? <Line points={geo.rim} color={GOLD} lineWidth={2.5} /> : null}
    </group>
  );
}
