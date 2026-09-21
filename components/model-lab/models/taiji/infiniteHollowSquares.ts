/**
 * 立體太極・往內無限四方形（全壘打補強）
 *
 * 用戶：有分但未全壘打——外面看起來很簡單，一直伸展進去，還是都是四方形。
 *
 * - 外：基準十二線空核（看起來單純）
 * - 往內：立方十二線一層層縮小（仍是四角形）
 * - 六面：每面同心鏤空四方形往面心鑽（伸展進去仍是方）
 * - 往外／死角：保留但降權，不搶「往內仍是方」的主讀
 */

import { HOLLOW_RADIUS, INSCRIBED_HALF } from '../../taijiCells';

/** 夾邊半徑＝殼內壁（空心的邊界）。原本用外表面 1，線會畫進殼的厚度裡。 */
export const SPHERE_R = HOLLOW_RADIUS;
export const CORE_HALF = INSCRIBED_HALF;

/** 往內層數：越多越像無限伸展進去 */
export const IN_DEPTH = 10;
export const IN_RATIO = 0.78;
/** 每面同心四角框層數 */
export const FACE_DEPTH = 8;
export const FACE_RATIO = 0.82;

export const OUT_DEPTH = 0; // 業主：不往外冒；方只在圓內緊貼
export const OUT_RATIO = 0.72;
export const SPIN_STEPS = 4;

export type V3 = [number, number, number];

export type HollowSegment = {
  nest: number;
  dir: 'core' | 'in' | 'out' | 'face';
  edgeId: number;
  a: V3;
  b: V3;
  kind: 'core' | 'nested' | 'spin' | 'face';
  spin: number;
};

const SIGNS = [-1, 1] as const;

function len(p: V3): number {
  return Math.hypot(p[0], p[1], p[2]);
}

export function cubeTwelveEdges(half: number): [V3, V3][] {
  const edges: [V3, V3][] = [];
  for (const a of SIGNS) {
    for (const b of SIGNS) {
      edges.push([
        [-half, a * half, b * half],
        [half, a * half, b * half],
      ]);
      edges.push([
        [a * half, -half, b * half],
        [a * half, half, b * half],
      ]);
      edges.push([
        [a * half, b * half, -half],
        [a * half, b * half, half],
      ]);
    }
  }
  return edges;
}

export function assertTwelveEdges(half = CORE_HALF): number {
  const n = cubeTwelveEdges(half).length;
  if (n !== 12) throw new Error(`core must have 12 edges, got ${n}`);
  return n;
}

function clampSphere(p: V3): V3 {
  const d = len(p);
  if (d <= SPHERE_R || d === 0) return p;
  const s = (SPHERE_R * (1 - 1e-9)) / d;
  return [p[0] * s, p[1] * s, p[2] * s];
}

function projectInfiniteOut(p: V3): V3 {
  const d = len(p);
  if (d < 1e-12) return p;
  const cornerRef = CORE_HALF * Math.sqrt(3);
  const u = d / cornerRef;
  const vis = SPHERE_R * (1 - 1e-4) * (u <= 1 ? u : 1 - 0.5 / u);
  return [p[0] * (vis / d), p[1] * (vis / d), p[2] * (vis / d)];
}

function rotateY(p: V3, ang: number): V3 {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
}

function fitFlush(p: V3, half: number): V3 {
  const m = Math.max(Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2]), 1e-12);
  if (m <= half) return p;
  const s = half / m;
  return [p[0] * s, p[1] * s, p[2] * s];
}

/**
 * 六面・同心鏤空四方形：從空核面往面心一直鑽，每一圈仍是四方形。
 * 這是「外面簡單、伸展進去還是方」的主視覺。
 */
function faceInwardSquares(half: number, depth: number, ratio: number): HollowSegment[] {
  const out: HollowSegment[] = [];
  let id = 1000;
  const faces: { axis: 0 | 1 | 2; sign: -1 | 1 }[] = [
    { axis: 0, sign: -1 },
    { axis: 0, sign: 1 },
    { axis: 1, sign: -1 },
    { axis: 1, sign: 1 },
    { axis: 2, sign: -1 },
    { axis: 2, sign: 1 },
  ];
  for (const face of faces) {
    const a1 = ((face.axis + 1) % 3) as 0 | 1 | 2;
    const a2 = ((face.axis + 2) % 3) as 0 | 1 | 2;
    // 最外圈貼齊該面的四角邊（略內縮避免與十二稜完全重疊）
    let s = half * 0.96;
    for (let nest = 0; nest < depth; nest++) {
      const mk = (u: number, v: number): V3 => {
        const p: V3 = [0, 0, 0];
        p[face.axis] = face.sign * half;
        p[a1] = u * s;
        p[a2] = v * s;
        return clampSphere(p);
      };
      const ring = [mk(-1, -1), mk(1, -1), mk(1, 1), mk(-1, 1)];
      for (let i = 0; i < 4; i++) {
        out.push({
          nest,
          dir: 'face',
          edgeId: id++,
          a: ring[i],
          b: ring[(i + 1) % 4],
          kind: 'face',
          spin: 0,
        });
      }
      s *= ratio;
    }
  }
  return out;
}

function pushCube(
  segs: HollowSegment[],
  half: number,
  nest: number,
  dir: 'core' | 'in' | 'out',
  kind: HollowSegment['kind'],
  spin: number,
  map: (p: V3) => V3,
): void {
  cubeTwelveEdges(half).forEach(([a0, b0], edgeId) => {
    segs.push({
      nest,
      dir,
      edgeId: edgeId + spin * 12,
      a: map(a0),
      b: map(b0),
      kind,
      spin,
    });
  });
}

/**
 * 全壘打主輸出：外簡（十二線）→ 往內無限四方形（立方套立方＋六面同心方）。
 */
export function buildInfiniteHollowSquareSegments(options?: {
  inDepth?: number;
  inRatio?: number;
  faceDepth?: number;
  faceRatio?: number;
  outDepth?: number;
  outRatio?: number;
  withSpin?: boolean;
}): HollowSegment[] {
  const inDepth = options?.inDepth ?? IN_DEPTH;
  const inRatio = options?.inRatio ?? IN_RATIO;
  const faceDepth = options?.faceDepth ?? FACE_DEPTH;
  const faceRatio = options?.faceRatio ?? FACE_RATIO;
  const outDepth = options?.outDepth ?? OUT_DEPTH;
  const outRatio = options?.outRatio ?? OUT_RATIO;
  const withSpin = options?.withSpin === true;

  assertTwelveEdges(CORE_HALF);
  const segs: HollowSegment[] = [];

  // 1) 外觀單純：基準十二線
  pushCube(segs, CORE_HALF, 0, 'core', 'core', 0, clampSphere);

  // 2) 往內：一層層更小的四角十二線（伸展進去仍是方）
  let half = CORE_HALF * inRatio;
  for (let nest = 1; nest <= inDepth; nest++) {
    pushCube(segs, half, nest, 'in', 'nested', 0, clampSphere);
    half *= inRatio;
  }

  // 3) 六面同心四方形：鑽進去每一圈還是方
  segs.push(...faceInwardSquares(CORE_HALF, faceDepth, faceRatio));
  // 內層立方的面上也鑽（較深幾層，強化無限感）
  half = CORE_HALF * inRatio;
  for (let nest = 1; nest <= Math.min(4, inDepth); nest++) {
    const faceSegs = faceInwardSquares(half, Math.max(3, faceDepth - nest), faceRatio);
    for (const s of faceSegs) {
      segs.push({ ...s, nest: nest + s.nest, edgeId: s.edgeId + nest * 10000 });
    }
    half *= inRatio;
  }

  // 4) 往外：輕量保留（不搶主讀）
  half = CORE_HALF / outRatio;
  for (let nest = 1; nest <= outDepth; nest++) {
    pushCube(segs, half, nest, 'out', 'nested', 0, (p) => projectInfiniteOut(fitFlush(p, half)));
    half /= outRatio;
  }

  // 5) 死角循環：預設關，避免蓋住「往內仍是方」；需要時開啟
  if (withSpin) {
    half = CORE_HALF * inRatio;
    for (let nest = 1; nest <= 3; nest++) {
      for (let s = 0; s < SPIN_STEPS; s++) {
        const ang = (Math.PI * 2 * s) / SPIN_STEPS;
        pushCube(segs, half, nest, 'in', 'spin', s, (p) => clampSphere(fitFlush(rotateY(p, ang), half)));
      }
      half *= inRatio;
    }
  }

  return segs;
}
