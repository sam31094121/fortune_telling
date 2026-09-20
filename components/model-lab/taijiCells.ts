import { entrancePoint, type Point } from './latticeMath';
import { PROJECTION } from './projectionMath';
import { CELL_SPACING, cellRods, type Rod } from './multiverseMath';

/**
 * 太極裡面的每一格，都放一個四維單元。
 *
 * 太極方形內壁本身就是一個 0.6 的立方格網（同事的 squareCavity）。球內裝得下的完整格子
 * 正好 7 個：中心一個，六面各一個。把同一個四維投影單元（內外立方＋連接邊）放進每一格，
 * 外立方就跟內壁格線完全重合——線接得起來、沒有縫，每一面都是四角形。
 *
 * 判定「裝得下」的規則與內壁一致：八個角都要落在半徑 INNER_RADIUS 以內，不留半截格子。
 */
const INNER_RADIUS = 0.995;

/** 放進太極後的縮放：外立方邊長 = taijiScale × CELL_SPACING = 內壁格距 0.6。 */
export const TAIJI_UNIT_SCALE = PROJECTION.taijiScale;

/** 球內完整格子的中心（世界座標）。 */
export function taijiCellCenters(): Point[] {
  const centers: Point[] = [];
  for (let x = -3; x <= 3; x += 1) {
    for (let y = -3; y <= 3; y += 1) {
      for (let z = -4; z <= 2; z += 1) {
        const corners = Array.from({ length: 8 }, (_, n) => [x + (n & 1), y + ((n >> 1) & 1), z + ((n >> 2) & 1)] as Point);
        const points = corners.map(entrancePoint);
        if (points.some((p) => Math.hypot(...p) > INNER_RADIUS)) continue;
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
