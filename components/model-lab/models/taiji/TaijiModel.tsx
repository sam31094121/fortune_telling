'use client';

import { useEffect, useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { LabModelProps } from '../registry';
import TesseractModel from '../../TesseractModel';
import TaijiTesseractField from '../../TaijiTesseractField';
import { PROJECTION } from '../../projectionMath';
import { INSCRIBED_HALF } from '../../taijiCells';
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
import { assertTwelveEdges, buildInfiniteHollowSquareSegments } from './infiniteHollowSquares';

export const TAIJI_LAYERS = [
  { id: 'twelveHollowSquares', name: '十二線・往內無限四方形', defaultOn: true },
  { id: 'squareCavity', name: '內圍厚度・四角空腔', defaultOn: true },
  { id: 'cellField', name: '每一格一顆四維單元（七格網）', defaultOn: false },
  { id: 'cellCube', name: '一顆四角空間（內接正立方）', defaultOn: true },
  { id: 'coreUnit', name: '核心四維單元（含內核，易顯十字）', defaultOn: false },
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


/** 內接正立方外框：外圍太極是球會騙眼；內圍厚度剛好是這顆四角形空間。 */
function InscribedSquareOutline() {
  const h = INSCRIBED_HALF;
  const edges: Array<[[number, number, number], [number, number, number]]> = [];
  const signs = [-1, 1] as const;
  for (const a of signs) for (const b of signs) {
    edges.push([[-h, a * h, b * h], [h, a * h, b * h]]);
    edges.push([[a * h, -h, b * h], [a * h, h, b * h]]);
    edges.push([[a * h, b * h, -h], [a * h, b * h, h]]);
  }
  return (
    <group name="inscribed-square-outline">
      {edges.map(([p, q], i) => (
        <Line key={i} points={[p, q]} color="#f5d76e" lineWidth={2.2} transparent opacity={0.92} depthWrite={false} />
      ))}
    </group>
  );
}

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

  const hollowSegs = useMemo(() => {
    assertTwelveEdges();
    return buildInfiniteHollowSquareSegments();
  }, []);

  const on = (id: string) => layers[id] !== false;

  return (
    <group>
      {on('squareCavity') && on('flatStyle') && on('black') && on('white') && on('yin2') && on('yang1') ? <>
        <InscribedSquareOutline />
        {on('cellCube') ? <TaijiTesseractField mode="inscribed" opacity={1} /> : null}
        {on('coreUnit') ? <TesseractModel scale={PROJECTION.taijiScale} /> : null}
        {on('cellField') ? <TaijiTesseractField opacity={0.72} /> : null}
        {contacts.map(rib => <group key={rib.edge.join('-')}>
          <mesh geometry={rib.geometry}><meshStandardMaterial color="#426d79" transparent opacity={.04} roughness={.7} side={THREE.DoubleSide} depthWrite={false} /></mesh>
          {null}
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

            {on('twelveHollowSquares') ? hollowSegs.map((seg, i) => (
        <Line key={`hollow-${seg.dir}-${seg.kind}-${seg.edgeId}-${seg.nest}-${i}`} points={[seg.a, seg.b]} color={seg.kind === 'core' ? '#6ef0ff' : seg.dir === 'face' ? '#ffe6a0' : seg.dir === 'in' ? '#ffd06b' : seg.dir === 'out' ? '#ff9f4388' : '#c891fa'} lineWidth={seg.kind === 'core' ? 2.8 : seg.dir === 'face' ? Math.max(0.8, 1.8 - seg.nest * 0.12) : seg.dir === 'in' ? Math.max(1.0, 2.2 - seg.nest * 0.12) : 1.0} transparent opacity={seg.dir === 'out' ? 0.28 : seg.kind === 'spin' ? 0.3 : seg.dir === 'face' ? Math.max(0.35, 0.9 - seg.nest * 0.07) : Math.max(0.4, 0.95 - seg.nest * 0.06)} depthWrite={false} />
      )) : null}
      {on('seam') ? <Line points={geo.seam} color={GOLD} lineWidth={2.5} /> : null}
      {on('rim') ? <Line points={geo.rim} color={GOLD} lineWidth={2.5} /> : null}
    </group>
  );
}
