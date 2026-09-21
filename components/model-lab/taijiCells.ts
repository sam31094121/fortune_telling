import { entrancePoint, type Point } from './latticeMath';
import { PROJECTION } from './projectionMath';
import { CELL_SPACING, cellRods, type Rod } from './multiverseMath';
import { INNER_RADIUS } from './models/taiji/squareCavity';

/**
 * 太極裡面的每一格，都放一個四維單元。
 *
 * 太極方形內壁本身就是一個 0.6 的立方格網（同事的 squareCavity）。球內裝得下的完整格子
 * 正好 7 個：中心一個，六面各一個。把同一個四維投影單元（內外立方＋連接邊）放進每一格，
 * 外立方就跟內壁格線完全重合——線接得起來、沒有縫，每一面都是四角形。
 *
 * 判定「裝得下」的規則與內壁一致：八個角都要落在半徑 INNER_RADIUS 以內，不留半截格子。
 */
/**
 * 業主（2026-09-21）：內核「方形空心」置中；與外圓太極殼一比一緊貼。
 * 八角到球心＝外殼半徑 1（無縫、不冒出、殼核不留空帶）。
 * squareCavity.INNER_RADIUS 仍供格網裝填用；視覺貼合只認 FIT_RADIUS。
 */
export const FIT_RADIUS = 1;
export const HOLLOW_RADIUS = FIT_RADIUS;
export const SHELL_THICKNESS = 0;

/** 放進太極後的縮放：外立方邊長 = taijiScale × CELL_SPACING = 內壁格距 0.6。 */
export const TAIJI_UNIT_SCALE = PROJECTION.taijiScale;

/**
 * 太極裡面「剛好一顆」的四角形空間：內接正立方。
 *
 * 外圍是球（視覺是圓），內核是置中的正立方空心。邊長 2/√3，八角剛好頂在外圓半徑 1 上——殼核一比一緊貼。
 * 半邊 1/√3 ≈ 0.577 小於切面 A=√2/2，四個切口切不到它。
 */
// 八個角到球心剛好＝殼內壁半徑：角貼著內壁，不伸進殼的厚度
export const INSCRIBED_HALF = HOLLOW_RADIUS / Math.sqrt(3);
export const INSCRIBED_EDGE = 2 * INSCRIBED_HALF;
export const INSCRIBED_SCALE = INSCRIBED_EDGE / CELL_SPACING;

/**
 * 一顆四角空間：只留外立方 12 邊（八角貼球面）。
 * 內立方＋橋接會在核心畫出「標準十字」，業主定調很難看——預設不畫。
 */
export function inscribedUnitRods(options: { includeInner?: boolean } = {}): Rod[] {
  const includeInner = options.includeInner === true;
  return cellRods()
    .filter((rod) => includeInner || rod.kind === 'outer')
    .map((rod) => ({
      kind: rod.kind,
      color: rod.color,
      a: rod.a.map((v) => v * INSCRIBED_SCALE) as Point,
      b: rod.b.map((v) => v * INSCRIBED_SCALE) as Point,
    }));
}

/**
 * 空心太極的核心：把內接正立方切成 n×n×n 個小格，每一格放一個四維單元。
 *
 * 太極當成空心殼，殼把核心包起來；核心就是那顆內接正立方（八角貼外圓，置中空心）。
 * 核心裡面全部是四角形：每一小格邊長 INSCRIBED_EDGE / n，面貼面、不留縫，
 * 而且整個核心都在球內，所以殼一定包得住。
 *
 * 數量對答案（閉合公式，scripts/model-lab-4d-audit.mjs 會一路算到很大去驗）：
 *   格 n³、頂點 (n+1)³、邊 3n(n+1)²、面 3n²(n+1)，且 V − E + F − C 恆等於 1。
 */
export function hollowCoreCellCenters(subdivisions: number): Point[] {
  const n = Math.max(1, Math.floor(subdivisions));
  const step = INSCRIBED_EDGE / n;
  const start = -INSCRIBED_EDGE / 2 + step / 2;
  const centers: Point[] = [];
  for (let x = 0; x < n; x += 1) {
    for (let y = 0; y < n; y += 1) {
      for (let z = 0; z < n; z += 1) {
        centers.push([start + x * step, start + y * step, start + z * step]);
      }
    }
  }
  return centers;
}

/** 核心裡的所有線：n³ 格 × 32 條，每格都是完整的四維單元。 */
export function hollowCoreRods(subdivisions: number): Rod[] {
  const n = Math.max(1, Math.floor(subdivisions));
  const scale = INSCRIBED_SCALE / n;
  const unit = cellRods();
  const rods: Rod[] = [];
  for (const center of hollowCoreCellCenters(n)) {
    for (const rod of unit) {
      rods.push({
        kind: rod.kind,
        color: rod.color,
        a: rod.a.map((v, i) => v * scale + center[i]) as Point,
        b: rod.b.map((v, i) => v * scale + center[i]) as Point,
      });
    }
  }
  return rods;
}

/** 球內完整格子的中心（世界座標）。 */
export function taijiCellCenters(): Point[] {
  const centers: Point[] = [];
  for (let x = -3; x <= 3; x += 1) {
    for (let y = -3; y <= 3; y += 1) {
      for (let z = -4; z <= 2; z += 1) {
        const corners = Array.from({ length: 8 }, (_, n) => [x + (n & 1), y + ((n >> 1) & 1), z + ((n >> 2) & 1)] as Point);
        const points = corners.map(entrancePoint);
        if (points.some((p) => Math.hypot(...p) > HOLLOW_RADIUS)) continue;
        centers.push([0, 1, 2].map((axis) => points.reduce((sum, p) => sum + p[axis], 0) / 8) as Point);
      }
    }
  }
  return centers;
}

/** 每一格一個四維單元，已縮放並移到該格中心；外立方邊長正好等於內壁格距。 */
export function taijiCellRods(): Rod[] {
  const unit = cellRods();
  const rods: Rod[] = [];
  for (const center of taijiCellCenters()) {
    for (const rod of unit) {
      rods.push({
        kind: rod.kind,
        color: rod.color,
        a: rod.a.map((v, i) => v * TAIJI_UNIT_SCALE + center[i]) as Point,
        b: rod.b.map((v, i) => v * TAIJI_UNIT_SCALE + center[i]) as Point,
      });
    }
  }
  return rods;
}

/** 放進太極後的實際尺寸，供守門比對：格距與線寬都要等於內壁。 */
export const TAIJI_CELL_SIZE = TAIJI_UNIT_SCALE * CELL_SPACING;
