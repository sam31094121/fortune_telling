import { BEAM } from './latticeMath';
import { EDGES_4D, PROJECTION, VERTICES_4D, project4D } from './projectionMath';

/**
 * 四角形多重宇宙：同一個四維投影單元（內外立方＋連接邊）往六個方向重複排到看不到盡頭。
 *
 * 老實話：重複排列是視覺概念，不是數學上的四維空間填充。真正的四維在單元內部——
 * 一個正八胞體有 16 頂點、32 邊、24 個正方形面、8 個立方單元（見 tests/model-lab-projection.test.cjs）；
 * 這裡只是把那個單元當成一塊磚，沿三個方向鋪開。
 *
 * 外立方投影後邊長剛好 2（w=+1 時 scale = 2/(3-1) = 1，頂點落在 ±1），
 * 所以間距取 2 就是面貼面：相鄰單元共用那一面的四條邊，不會有縫，也不會互相穿插。
 */
export const CELL_SPACING = 2 * (PROJECTION.numerator / (PROJECTION.distance4D - 1));

/**
 * 線寬借太極方形內壁的同一個比例：內壁的格距是 ENTRANCE_SCALE、線寬是 BEAM × ENTRANCE_SCALE，
 * 也就是線寬占格距 BEAM。多重宇宙的格距是 CELL_SPACING，就照同一個比例換算，
 * 貼面時看到的線粗細與格子大小的關係，跟太極內壁完全是 1:1。
 */
export const ROD_WIDTH = BEAM * CELL_SPACING;
export const ROD_RADIUS = ROD_WIDTH / 2;

export type RodKind = 'outer' | 'inner' | 'bridge';

export type Rod = {
  a: [number, number, number];
  b: [number, number, number];
  kind: RodKind;
  color: string;
};

const COLOR: Record<RodKind, string> = {
  outer: PROJECTION.outer,
  bridge: PROJECTION.bridge,
  inner: PROJECTION.inner,
};

/** 一個單元的 32 根邊：12 根外立方、12 根內立方、8 根連接邊。 */
export function cellRods(): Rod[] {
  const projected = VERTICES_4D.map(project4D);
  return EDGES_4D.map(({ from, to, axis }) => {
    const kind: RodKind = axis === 3 ? 'bridge' : VERTICES_4D[from][3] === 1 ? 'outer' : 'inner';
    return { a: projected[from], b: projected[to], kind, color: COLOR[kind] };
  });
}

/** 以原點單元為中心，往三個方向各鋪 radius 層；radius 0 就是單獨一個單元。 */
export function multiverseCells(radius: number): Array<[number, number, number]> {
  const cells: Array<[number, number, number]> = [];
  for (let x = -radius; x <= radius; x += 1) {
    for (let y = -radius; y <= radius; y += 1) {
      for (let z = -radius; z <= radius; z += 1) {
        cells.push([x * CELL_SPACING, y * CELL_SPACING, z * CELL_SPACING]);
      }
    }
  }
  return cells;
}

/** 整個多重宇宙的邊：單元數 × 32。呈現層用一個 InstancedMesh 畫完，不逐根建物件。 */
export function multiverseRods(radius: number): Rod[] {
  const base = cellRods();
  const rods: Rod[] = [];
  for (const [ox, oy, oz] of multiverseCells(radius)) {
    for (const rod of base) {
      rods.push({
        a: [rod.a[0] + ox, rod.a[1] + oy, rod.a[2] + oz],
        b: [rod.b[0] + ox, rod.b[1] + oy, rod.b[2] + oz],
        kind: rod.kind,
        color: rod.color,
      });
    }
  }
  return rods;
}
