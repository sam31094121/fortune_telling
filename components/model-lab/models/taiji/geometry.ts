import * as THREE from 'three';

/**
 * 立體太極球的幾何（半徑 R = 1，座標系以內接正立方體為準）。
 *
 * 球被 y = ±A、z = ±A 四個平面切掉四頂，切口是四個半徑 A 的平面圓，兩兩相切於稜中點。
 * 陰片（黑）＝ x < 0 的球面帶 ＋ +y 圓面 ＋ −z 圓面
 * 陽片（白）＝ x > 0 的球面帶 ＋ −y 圓面 ＋ +z 圓面
 * 兩片以球心中心對稱互換，接縫是四個平面圓各取半圈接成的閉合曲線。
 * 從 (0, 1, 1) 方向正看，就是平面太極圖。
 */
export const A = Math.SQRT1_2;
export const DOT_RADIUS = 0.2;

export type Side = 'black' | 'white';
export type DiscId = '+y' | '-y' | '+z' | '-z';

/**
 * 外圈大圓（平面 y + z = 0）把球分成前、後兩半，黑白各分前後共四片，每片＝一個圓面＋半條球面帶：
 * 陰片 1 號＝前黑（+y）、陰片 2 號＝後黑（−z）、陽片 1 號＝前白（+z）、陽片 2 號＝後白（−y）。
 * 從正面看，後黑的投影恰好補滿前白以外的區域，兩片錯位重疊成一個完整的圓。
 */
export type Hemi = 'front' | 'back';
export type PieceId = 'yin1' | 'yin2' | 'yang1' | 'yang2';

export const PIECES: Record<PieceId, { side: Side; hemi: Hemi; disc: DiscId }> = {
  yin1: { side: 'black', hemi: 'front', disc: '+y' },
  yin2: { side: 'black', hemi: 'back', disc: '-z' },
  yang1: { side: 'white', hemi: 'front', disc: '+z' },
  yang2: { side: 'white', hemi: 'back', disc: '-y' },
};

export function bandGeometry(side: Side, hemi: Hemi, n = 128): THREE.BufferGeometry {
  const sign = side === 'white' ? 1 : -1;
  const positions: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= n; i++) {
    // 靠近切口處加密取樣，切口邊緣的曲率最大
    const y = A * Math.sin((Math.PI / 2) * (-1 + (2 * i) / n));
    for (let j = 0; j <= n; j++) {
      const z = A * Math.sin((Math.PI / 2) * (-1 + (2 * j) / n));
      positions.push(sign * Math.sqrt(Math.max(0, 1 - y * y - z * z)), y, z);
    }
  }
  // y、z 取樣對稱，所以 y + z > 0 ⇔ i + j > n；網格對角線正好落在分界上，三角形不會跨兩半
  const front = hemi === 'front';
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const a = i * (n + 1) + j;
      const b = a + n + 1;
      const s = i + j;
      if ((s >= n) === front) {
        if (sign > 0) index.push(a, b, a + 1);
        else index.push(a, a + 1, b);
      }
      if ((s + 1 >= n) === front) {
        if (sign > 0) index.push(b, b + 1, a + 1);
        else index.push(b, a + 1, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  return geometry;
}

export function discGeometry(disc: DiscId, segments = 160): THREE.BufferGeometry {
  const geometry = new THREE.CircleGeometry(A, segments);
  if (disc === '+y') geometry.rotateX(-Math.PI / 2).translate(0, A, 0);
  if (disc === '-y') geometry.rotateX(Math.PI / 2).translate(0, -A, 0);
  if (disc === '+z') geometry.translate(0, 0, A);
  if (disc === '-z') geometry.rotateY(Math.PI).translate(0, 0, -A);
  return geometry;
}

/**
 * 點的兩種形狀，都以圓面中心為圓心、半徑 DOT_RADIUS：
 * - 'circle'：圓面上的正圓。影片 22.5–25.8s 共 41 幀實測長寬比，與此預測平均誤差 0.012。
 * - 'frontRound'：沿 x 半軸 r、沿圓面內另一軸 r·√2 的橢圓，從正面 (0,1,1) 看是正圓。
 *   對應影片 35–39.5s 最終畫面（正面實測長寬比 0.955／0.957）；兩者無法由同一剛體同時滿足。
 */
export type DotShape = 'circle' | 'frontRound';

function dotRimPoint(disc: DiscId, theta: number, shape: DotShape, r = DOT_RADIUS): THREE.Vector3 {
  const c = r * Math.cos(theta);
  const s = r * (shape === 'frontRound' ? Math.SQRT2 : 1) * Math.sin(theta);
  switch (disc) {
    case '+y': return new THREE.Vector3(c, A, -s);
    case '-z': return new THREE.Vector3(c, s, -A);
    case '-y': return new THREE.Vector3(c, -A, s);
    case '+z': return new THREE.Vector3(c, -s, A);
  }
}

const DISC_NORMAL: Record<DiscId, THREE.Vector3> = {
  '+y': new THREE.Vector3(0, 1, 0),
  '-y': new THREE.Vector3(0, -1, 0),
  '+z': new THREE.Vector3(0, 0, 1),
  '-z': new THREE.Vector3(0, 0, -1),
};

export function dotGeometry(disc: DiscId, shape: DotShape, segments = 96): THREE.BufferGeometry {
  const n = DISC_NORMAL[disc];
  const lift = n.clone().multiplyScalar(0.002);
  const center = dotRimPoint(disc, 0, shape, 0).add(lift);
  const positions: number[] = [];
  const normals: number[] = [];
  for (let k = 0; k < segments; k++) {
    const p0 = dotRimPoint(disc, (2 * Math.PI * k) / segments, shape).add(lift);
    const p1 = dotRimPoint(disc, (2 * Math.PI * (k + 1)) / segments, shape).add(lift);
    positions.push(center.x, center.y, center.z, p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
    for (let v = 0; v < 3; v++) normals.push(n.x, n.y, n.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}

function orientToDisc(geometry: THREE.BufferGeometry, disc: DiscId): THREE.BufferGeometry {
  if (disc === '-y') geometry.rotateX(Math.PI);
  if (disc === '+z') geometry.rotateX(Math.PI / 2);
  if (disc === '-z') geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** 弧形畫法：圓面換回球冠（極角 0–45°，邊緣正好是接縫圓），顏色畫在球面上。 */
export function capGeometry(disc: DiscId): THREE.BufferGeometry {
  return orientToDisc(new THREE.SphereGeometry(1, 160, 40, 0, Math.PI * 2, 0, Math.PI / 4), disc);
}

/** 弧形畫法的魚眼：把平面魚眼從球心投到球面，成為以球冠頂點為中心、角半徑 atan(0.2/A) 的球面圓。 */
export const ARC_DOT_ANGLE = Math.atan(DOT_RADIUS / A);

export function arcDotGeometry(disc: DiscId): THREE.BufferGeometry {
  return orientToDisc(new THREE.SphereGeometry(1.002, 96, 12, 0, Math.PI * 2, 0, ARC_DOT_ANGLE), disc);
}

/** 金色接縫：+y(x≥0) → +z(x≤0) → −y(x≤0) → −z(x≥0)，閉合、中心對稱。 */
export function seamPoints(perArc = 128, lift = 1.004): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const arc = (fn: (p: number) => [number, number, number], from: number, to: number) => {
    for (let i = 0; i < perArc; i++) {
      const p = from + ((to - from) * i) / perArc;
      pts.push(new THREE.Vector3(...fn(p)).multiplyScalar(lift));
    }
  };
  const h = Math.PI / 2;
  arc((p) => [A * Math.cos(p), A, A * Math.sin(p)], -h, h);
  arc((p) => [-A * Math.cos(p), A * Math.sin(p), A], h, -h);
  arc((p) => [-A * Math.cos(p), -A, A * Math.sin(p)], h, -h);
  arc((p) => [A * Math.cos(p), A * Math.sin(p), -A], -h, h);
  pts.push(pts[0].clone());
  return pts;
}

/** 外圈大圓：垂直於正面視線的大圓，正面看就是太極圖的外輪廓。 */
export function rimPoints(segments = 512, lift = 1.004): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = (2 * Math.PI * i) / segments;
    pts.push(new THREE.Vector3(Math.cos(t), Math.sin(t) * A, -Math.sin(t) * A).multiplyScalar(lift));
  }
  return pts;
}

/** 粉紅線框球的經線，南北極在 z 軸（20.2 秒實測極點匯聚位置吻合）。 */
export function meridianGeometry(count = 36, segments = 96): THREE.BufferGeometry {
  const positions: number[] = [];
  for (let m = 0; m < count; m++) {
    const phi = (2 * Math.PI * m) / count;
    for (let i = 0; i < segments; i++) {
      const t0 = (Math.PI * i) / segments;
      const t1 = (Math.PI * (i + 1)) / segments;
      positions.push(
        Math.sin(t0) * Math.cos(phi), Math.sin(t0) * Math.sin(phi), Math.cos(t0),
        Math.sin(t1) * Math.cos(phi), Math.sin(t1) * Math.sin(phi), Math.cos(t1),
      );
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}
