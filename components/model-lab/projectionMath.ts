/** Parameters of the visually approved 8897 B preview. Projection is 4D -> 3D,
 * not a claim that the projected bridge faces remain Euclidean squares. */
export const PROJECTION = {
  distance4D: 3, numerator: 2, lineRadius: .008, glowScale: 2.8, glowOpacity: .09,
  outer: '#55dcff', bridge: '#ffc768', inner: '#c891fa', background: '#061321',
  camera: [3.7, 2.6, 5.3] as [number, number, number], cameraScale: 1.16,
  taijiScale: .3,
};
export type Point4 = [number, number, number, number];
export const VERTICES_4D: Point4[] = Array.from({ length: 16 }, (_, i) =>
  Array.from({ length: 4 }, (_, axis) => i & (1 << axis) ? 1 : -1) as Point4);
export const EDGES_4D: { from: number; to: number; axis: number }[] = [];
for (let i = 0; i < 16; i++) for (let axis = 0; axis < 4; axis++) {
  if (!(i & (1 << axis))) EDGES_4D.push({ from: i, to: i | (1 << axis), axis });
}
export function project4D([x, y, z, w]: Point4): [number, number, number] {
  const scale = PROJECTION.numerator / (PROJECTION.distance4D - w);
  return [x * scale, y * scale, z * scale];
}

/** Orthogonal rotations before perspective projection; never stretch the 3D image. */
export function rotate4D([x, y, z, w]: Point4, xw = 0, yw = 0): Point4 {
  const X = x * Math.cos(xw) - w * Math.sin(xw);
  const W = x * Math.sin(xw) + w * Math.cos(xw);
  return [X, y * Math.cos(yw) - W * Math.sin(yw), z, y * Math.sin(yw) + W * Math.cos(yw)];
}

/** The same source x=+1 cell throughout: six faces, stable source vertex IDs. */
export const CONTACT_CELL_FACES = [
  { name: '黃面', ids: [3, 7, 15, 11] },
  { name: '對面', ids: [1, 5, 13, 9] },
  { name: '左面', ids: [1, 3, 11, 9] },
  { name: '右面', ids: [5, 7, 15, 13] },
  { name: '前面', ids: [1, 3, 7, 5] },
  { name: '後面', ids: [9, 11, 15, 13] },
] as const;
