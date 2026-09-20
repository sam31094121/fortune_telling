import { EDGES_4D, VERTICES_4D, type Point4 } from './projectionMath';

/**
 * 等長投影：證明「其實全部都是四方形，是眼睛被騙了」。
 *
 * 太極裡那顆四維單元用的是透視投影（scale = 2 ÷ (3 − w)），所以外立方看起來大、
 * 內立方看起來小、連接邊看起來是斜的——那是投影造成的錯覺，不是形狀真的不一樣。
 * 四維裡這 32 條邊本來全部等長、24 個面本來全部是正方形。
 *
 * 這裡改用平行投影，而且投影方向取 (1,1,1,1)：把四維沿著這個方向壓到垂直於它的三維空間。
 * 壓完之後 32 條邊的長度完全相同（都是 √3），外立方與內立方一樣大——
 * 眼睛看到的差別消失，剩下的就是真正的形狀。
 *
 * 誠實話：邊長全部相同，但四維的直角壓到三維會變成菱形的角（這是任何三維投影都躲不掉的）。
 * 想同時看到「邊等長」與「角是直角」，只能分兩次看：一次看長度、一次看單一個立方單元。
 */

/** 垂直於 (1,1,1,1) 的三個單位向量，彼此正交。 */
const BASIS: Point4[] = [
  [1 / Math.SQRT2, -1 / Math.SQRT2, 0, 0],
  [1 / Math.sqrt(6), 1 / Math.sqrt(6), -2 / Math.sqrt(6), 0],
  [1 / Math.sqrt(12), 1 / Math.sqrt(12), 1 / Math.sqrt(12), -3 / Math.sqrt(12)],
];

/** 這個投影下每一條邊的長度：邊向量長 2，投影後固定是 √3。 */
export const EQUAL_EDGE_LENGTH = Math.sqrt(3);

export function parallelProject4D(point: Point4): [number, number, number] {
  return BASIS.map((axis) => axis.reduce((sum, value, index) => sum + value * point[index], 0)) as [number, number, number];
}

export type EqualEdgeRod = { a: [number, number, number]; b: [number, number, number]; axis: number };

/** 32 條邊，投影後長度全部相同。axis 3 是原本的「連接邊」，這裡跟其他邊一樣長。 */
export function equalEdgeRods(): EqualEdgeRod[] {
  const projected = VERTICES_4D.map(parallelProject4D);
  return EDGES_4D.map(({ from, to, axis }) => ({ a: projected[from], b: projected[to], axis }));
}
