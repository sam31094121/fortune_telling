import * as THREE from 'three';

/* 【轉場｜2026-11-25 第四輪】深層（量子／細胞／糾纏／深淵）出現量限速跟隨。
   TAIJI_BANDS 的 smoothstep 由旅程深度直接驅動時，旅程起步那幾幀深度每幀走 0.06，
   出現量每幀可變 0.04～0.085（第 4→5、11→12、16→17、17→18、20→21、21→22 段）。
   這裡讓「實際使用的出現量」每幀（60 fps 計）最多變 0.018 去追 bandWeight 的值：
   - 停在整數段時收斂到與原本完全相同的值（段落畫面不變）；
   - 原子跳轉（jumpJourney：一幀內深度跳超過半段且已等於目標，例如 24→1 重置、網址直達）直接對齊，不補間；
   - 各元件與 TaijiSystem 用同一個函式、同一組輸入，同一幀算出的值相同，群組顯示與材質淡出一致。
   不改 TAIJI_BANDS、不改旅程速度 rate 3.8。 */
export const TAIJI_BAND_MAX_STEP_PER_60FPS_FRAME = 0.018;

export type TaijiBandFollowerState = { value: number; depth: number };

export function createBandFollower(): TaijiBandFollowerState {
  return { value: Number.NaN, depth: Number.NaN };
}

export function followBandPresence(
  state: TaijiBandFollowerState,
  target: number,
  depth: number,
  journeyTarget: number,
  delta: number,
) {
  const frame = Math.min(Math.max(delta, 0), 1 / 45);
  const atomicJump = Math.abs(depth - state.depth) > 0.5 && Math.abs(depth - journeyTarget) < 1e-6;
  if (!Number.isFinite(state.value) || !Number.isFinite(state.depth) || atomicJump) {
    state.value = target;
  } else {
    const step = TAIJI_BAND_MAX_STEP_PER_60FPS_FRAME * frame * 60;
    state.value += Math.max(-step, Math.min(step, target - state.value));
    if (Math.abs(target - state.value) < 1e-6) state.value = target;
  }
  state.depth = depth;
  return state.value;
}

/* 各材質「實際淡入淡出量」（keyframe 值 × 出現量）也要限速：
   深層內部的子段 keyframe（例如量子連線、細胞絲、糾纏橋）在相鄰段之間差很大，
   旅程起步時每幀可變 0.03～0.17。這裡對最終乘積逐項限速（每幀最多 0.018），
   停在整數段時收斂到原值；原子跳轉、第一次出現時直接對齊。 */
export type TaijiRevealLimiter = { values: Record<string, number>; depth: number; snap: boolean; step: number };

export function createRevealLimiter(): TaijiRevealLimiter {
  return { values: {}, depth: Number.NaN, snap: true, step: 0 };
}

export function beginRevealFrame(limiter: TaijiRevealLimiter, depth: number, journeyTarget: number, delta: number) {
  const frame = Math.min(Math.max(delta, 0), 1 / 45);
  limiter.snap = !Number.isFinite(limiter.depth) || (Math.abs(depth - limiter.depth) > 0.5 && Math.abs(depth - journeyTarget) < 1e-6);
  limiter.step = TAIJI_BAND_MAX_STEP_PER_60FPS_FRAME * frame * 60;
  limiter.depth = depth;
}

export function limitReveal(limiter: TaijiRevealLimiter, key: string, target: number) {
  const current = limiter.values[key];
  let next = target;
  if (!limiter.snap && current !== undefined && Number.isFinite(current)) {
    next = current + Math.max(-limiter.step, Math.min(limiter.step, target - current));
    if (Math.abs(target - next) < 1e-6) next = target;
  }
  limiter.values[key] = next;
  return next;
}

/* keyframe 形狀參數（間距、填滿、扭轉、自轉倍率、吸力…）也逐項限速：每幀（60 fps 計）最多變 0.04，
   尺寸類每幀遠低於 0.12，自轉倍率 × 0.22 rad/s 換算後每幀角速度變化 ≤0.009。停在整數段時與原值相同。 */
export const TAIJI_KEYFRAME_MAX_STEP_PER_60FPS_FRAME = 0.04;

export function limitKeyframes<T extends Record<string, number | undefined>>(limiter: TaijiRevealLimiter, cut: T): T {
  const out: Record<string, number | undefined> = { ...cut };
  const step = (limiter.step / TAIJI_BAND_MAX_STEP_PER_60FPS_FRAME) * TAIJI_KEYFRAME_MAX_STEP_PER_60FPS_FRAME;
  for (const name of Object.keys(cut)) {
    const target = cut[name];
    if (target === undefined || !Number.isFinite(target)) continue;
    const key = `kf:${name}`;
    const current = limiter.values[key];
    let next = target;
    if (!limiter.snap && current !== undefined && Number.isFinite(current)) {
      next = current + Math.max(-step, Math.min(step, target - current));
      if (Math.abs(target - next) < 1e-6) next = target;
    }
    limiter.values[key] = next;
    out[name] = next;
  }
  return out as T;
}

/* 顏色限速（Lab 空間）：深淵層的層級色（TIER_TINT）依深度在 8 色間插值，旅程起步時每幀色差可到 5～9。
   這裡讓實際色每幀（60 fps 計）最多走 ΔE 0.8；停住時收斂到原色；原子跳轉直接對齊。 */
function linearToLab(c: THREE.Color): [number, number, number] {
  const x = (0.4124 * c.r + 0.3576 * c.g + 0.1805 * c.b) / 0.95047;
  const y = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const z = (0.0193 * c.r + 0.1192 * c.g + 0.9505 * c.b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function labToLinear(lab: [number, number, number], out: THREE.Color) {
  const fy = (lab[0] + 16) / 116, fx = fy + lab[1] / 500, fz = fy - lab[2] / 200;
  const inv = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  const x = inv(fx) * 0.95047, y = inv(fy), z = inv(fz) * 1.08883;
  out.setRGB(
    Math.max(0, 3.2406 * x - 1.5372 * y - 0.4986 * z),
    Math.max(0, -0.9689 * x + 1.8758 * y + 0.0415 * z),
    Math.max(0, 0.0557 * x - 0.204 * y + 1.057 * z),
  );
}
export const TAIJI_COLOR_MAX_DELTA_E_PER_60FPS_FRAME = 0.78; // 第六輪：0.8→0.78，扣掉 Lab↔線性來回的非線性誤差後實測每幀 ≤0.80
export function followColorLab(limiter: TaijiRevealLimiter, current: THREE.Color, target: THREE.Color, initialized: boolean) {
  if (limiter.snap || !initialized) {
    current.copy(target);
    return current;
  }
  const a = linearToLab(current), b = linearToLab(target);
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const budget = (limiter.step / TAIJI_BAND_MAX_STEP_PER_60FPS_FRAME) * TAIJI_COLOR_MAX_DELTA_E_PER_60FPS_FRAME;
  if (dist <= budget) current.copy(target);
  else {
    const k = budget / dist;
    labToLinear([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k], current);
  }
  return current;
}
