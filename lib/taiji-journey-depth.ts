/**
 * 太極 24 層唯一進度。
 * 放大、點層、鏡頭、畫面、下方階層列都只讀這一個連續數字。
 * depth ∈ [1, 24]；到 24 停住，縮小可回到較淺層，不循環。
 */

export const TAIJI_DEPTH_MIN = 1;
export const TAIJI_DEPTH_MAX = 24;

export const CAMERA_FAR_DISTANCE = 5.1;
export const CAMERA_NEAR_DISTANCE = 1.35;
export const CAMERA_FAR_FOV = 42;
export const CAMERA_NEAR_FOV = 30;
export const CAMERA_DOLLY_END_DEPTH = 5;
/** 滾輪／觸控板：單次事件最多推進一點點，避免一下跳過多層。 */
export const TAIJI_WHEEL_DEPTH_GAIN = 0.0035;
export const TAIJI_WHEEL_DEPTH_CAP = 0.22;
/** 兩指撐開距離每翻一倍，約前進 1.35 層。 */
export const TAIJI_PINCH_DEPTH_GAIN = 1.35;

export type TaijiMacroStage = 'TAIJI' | 'LIANGYI' | 'SIXIANG' | 'BAGUA';

export type TaijiJourneyState = {
  target: number;
  current: number;
};

export type TaijiJourneyRef = { current: TaijiJourneyState };

export type NumericKeyframe = Record<string, number>;

export const TAIJI_MACRO = {
  fadeStart: 4.05,
  fadeEnd: 5,
  liangyiStart: 1.12,
  liangyiFull: 2.2,
  sixiangStart: 2.15,
  sixiangFull: 3.2,
  baguaStart: 3.15,
  baguaFull: 4.2,
} as const;

export const TAIJI_BANDS = {
  quantum: { enter: 3.9, full: 4.95, exitStart: 10.65, exitEnd: 12.05 },
  cellular: { enter: 10.55, full: 11.65, exitStart: 15.55, exitEnd: 16.85 },
  entanglement: { enter: 16.15, full: 17.15, exitStart: 19.75, exitEnd: 20.85 },
  abyss: { enter: 20.15, full: 21.15, exitStart: 24.6, exitEnd: 25 },
} as const;

export function clamp01(value: number) {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function lerpNumber(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function clampDepth(value: number) {
  if (!Number.isFinite(value)) return TAIJI_DEPTH_MIN;
  if (value < TAIJI_DEPTH_MIN) return TAIJI_DEPTH_MIN;
  if (value > TAIJI_DEPTH_MAX) return TAIJI_DEPTH_MAX;
  return value;
}

export function createTaijiJourneyState(depth = TAIJI_DEPTH_MIN): TaijiJourneyState {
  const value = clampDepth(depth);
  return { target: value, current: value };
}

export function layerFromDepth(depth: number) {
  return Math.round(clampDepth(depth));
}

export function progressFromDepth(depth: number) {
  return (clampDepth(depth) - TAIJI_DEPTH_MIN) / (TAIJI_DEPTH_MAX - TAIJI_DEPTH_MIN);
}

export function setJourneyTarget(state: TaijiJourneyState, depth: number) {
  state.target = clampDepth(depth);
  return state.target;
}

export function nudgeJourneyTarget(state: TaijiJourneyState, delta: number) {
  state.target = clampDepth(state.target + delta);
  return state.target;
}

export function jumpJourney(state: TaijiJourneyState, depth: number) {
  const value = clampDepth(depth);
  state.target = value;
  state.current = value;
  return value;
}

export function integrateJourney(state: TaijiJourneyState, delta: number, rate = 3.8) {
  const frame = Math.min(Math.max(delta, 0), 1 / 45);
  state.current += (state.target - state.current) * Math.min(1, frame * rate);
  if (Math.abs(state.target - state.current) < 0.0008) state.current = state.target;
  return state.current;
}

export function readJourneyDepth(journeyRef: TaijiJourneyRef) {
  return journeyRef.current.current;
}

export function stageFromDepth(depth: number): TaijiMacroStage {
  if (depth < 1.75) return 'TAIJI';
  if (depth < 2.75) return 'LIANGYI';
  if (depth < 3.75) return 'SIXIANG';
  return 'BAGUA';
}

export function bandWeight(
  depth: number,
  enter: number,
  full: number,
  exitStart: number,
  exitEnd: number,
) {
  if (depth <= enter || depth >= exitEnd) return 0;
  if (depth >= full && depth <= exitStart) return 1;
  if (depth < full) return smoothstep(enter, full, depth);
  return 1 - smoothstep(exitStart, exitEnd, depth);
}

export function macroPresence(depth: number) {
  return 1 - smoothstep(TAIJI_MACRO.fadeStart, TAIJI_MACRO.fadeEnd, depth);
}

export function liangyiAmount(depth: number) {
  return smoothstep(TAIJI_MACRO.liangyiStart, TAIJI_MACRO.liangyiFull, depth) * macroPresence(depth);
}

export function sixiangPresence(depth: number) {
  return smoothstep(TAIJI_MACRO.sixiangStart, TAIJI_MACRO.sixiangFull, depth) * macroPresence(depth);
}

export function baguaPresence(depth: number) {
  return smoothstep(TAIJI_MACRO.baguaStart, TAIJI_MACRO.baguaFull, depth) * macroPresence(depth);
}

export function cameraDistanceFromDepth(depth: number) {
  const t = smoothstep(TAIJI_DEPTH_MIN, CAMERA_DOLLY_END_DEPTH, depth);
  return lerpNumber(CAMERA_FAR_DISTANCE, CAMERA_NEAR_DISTANCE, t);
}

export function cameraFovFromDepth(depth: number) {
  const t = smoothstep(TAIJI_DEPTH_MIN, CAMERA_DOLLY_END_DEPTH, depth);
  return lerpNumber(CAMERA_FAR_FOV, CAMERA_NEAR_FOV, t);
}

export function sampleNumericKeyframes(depth: number, frames: Record<number, NumericKeyframe>): NumericKeyframe {
  const keys = Object.keys(frames).map(Number).sort((a, b) => a - b);
  if (keys.length === 0) return {};
  const d = clampDepth(depth);
  if (d <= keys[0]) return { ...frames[keys[0]] };
  const last = keys[keys.length - 1];
  if (d >= last) return { ...frames[last] };
  let index = 0;
  while (index < keys.length - 1 && keys[index + 1] < d) index += 1;
  const fromKey = keys[index];
  const toKey = keys[index + 1];
  const mix = (d - fromKey) / (toKey - fromKey);
  const from = frames[fromKey];
  const to = frames[toKey];
  const out: NumericKeyframe = {};
  const names = new Set([...Object.keys(from), ...Object.keys(to)]);
  names.forEach((name) => {
    out[name] = lerpNumber(from[name] ?? 0, to[name] ?? 0, mix);
  });
  return out;
}
