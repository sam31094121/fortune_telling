import {
  ANGULAR_VELOCITY_LOCK_THRESHOLD,
  ANGULAR_VELOCITY_SOFT_KNEE,
  APPROACHING_THRESHOLD_DEG,
  BALANCED_CONFIRM_MS,
  DAMPING,
  FLICK_ACCELERATION_THRESHOLD,
  FLICK_COAST_DAMPING,
  FLICK_RESPONSE_DAMPING,
  FLICK_ROTATION_THRESHOLD,
  FRAME_DELTA_CAP,
  LOCKED_DAMPING,
  LOCKED_HOLD_MS,
  LOW_PASS_FACTOR,
  MAX_SAFE_ROTATION_SPEED,
  MAX_FLICK_SPIN_SPEED,
  MAX_TILT_VISUAL_ANGLE_DEG,
  MOTION_ENERGY_WEIGHTS,
  ACCEL_NORMALIZE,
  ORIENTATION_NORMALIZE,
  REDUCED_MOTION_SPEED_SCALE,
  ROTATION_NORMALIZE,
  TILT_DAMPING,
  WAKE_THRESHOLD,
  VISUAL_BURST_COOLDOWN_MS,
} from './level01.constants';
import {
  level01BalanceProgress,
  level01HoldProgress,
  resolveLevel01BalanceState,
  type Level01BalanceState,
} from './Level01BalanceEngine';

export type BalanceState = Level01BalanceState;
export type Level01TiltDirection = 'N' | 'E' | 'S' | 'W';

export interface MotionSnapshot {
  alpha: number;
  beta: number;
  gamma: number;
  rotationRate: number;
  acceleration: number;
  motionEnergy: number;
  balanceState: BalanceState;
  balanceProgress: number;
  holdProgress: number;
}

export interface Level01VisualPose {
  driving: boolean;
  visualEuler: { x: number; y: number; z: number };
  visualOffset: { x: number; y: number; z: number };
  angularVelocity: number;
  spinAngle: number;
  motionEnergy: number;
  balanceState: BalanceState;
  balanceProgress: number;
  holdProgress: number;
  visualMomentum: number;
  visualBurstId: number;
  visualBurstTurns: number;
  visualBurstDuration: number;
}

export interface PhysicsState {
  alpha: number;
  beta: number;
  gamma: number;
  rotationRate: number;
  acceleration: number;
  motionEnergy: number;
  balanceState: BalanceState;
  balanceProgress: number;
  holdProgress: number;
  angularVelocity: number;
  spinAngle: number;
  dampedBeta: number;
  dampedGamma: number;
  axisAngleX: number;
  axisAngleY: number;
  axisAngleZ: number;
  axisVelocityX: number;
  axisVelocityY: number;
  axisVelocityZ: number;
  motionOffsetX: number;
  motionOffsetY: number;
  motionOffsetZ: number;
  balancedSince: number;
  lockChimePending: boolean;
  visualBurstStartedAt: number;
  visualBurstDuration: number;
  visualBurstTurns: number;
  visualBurstDirection: number;
  visualBurstAngle: number;
  visualBurstVelocity: number;
  lastVisualBurstAt: number;
  visualBurstId: number;
}

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const normalizeAngle = (degrees: number) => ((degrees % 360) + 360) % 360;

export function shortestAngleDelta(fromDeg: number, toDeg: number) {
  let delta = normalizeAngle(toDeg) - normalizeAngle(fromDeg);
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

/** Preserve heading continuity across the 359° → 0° boundary. */
export function unwrapAngle(previousUnwrapped: number, currentWrapped: number) {
  return previousUnwrapped + shortestAngleDelta(previousUnwrapped, currentWrapped);
}

export function lowPass(previous: number, current: number, factor = LOW_PASS_FACTOR) {
  return previous + (current - previous) * factor;
}

export function frameRateIndependentFactor(delta: number, baseFactor = LOW_PASS_FACTOR) {
  return 1 - Math.pow(1 - baseFactor, Math.max(0, delta) * 60);
}

export function level01BubbleOffset(degrees: number) {
  const deadZone = 1.2;
  const magnitude = Math.max(0, Math.abs(degrees) - deadZone);
  return Math.max(-18, Math.min(18, Math.sign(degrees) * magnitude * 1.45));
}

function resolveFlick(state: PhysicsState, previous: { alpha: number; beta: number; gamma: number }) {
  // Rotation-rate magnitude identifies a deliberate flick; the signed orientation
  // change supplies its spin direction. Tilt alone deliberately does not trigger it.
  const rotational = clamp01((state.rotationRate - FLICK_ROTATION_THRESHOLD) / 250);
  const acceleration = clamp01((state.acceleration - FLICK_ACCELERATION_THRESHOLD) / 12);
  const strength = Math.max(rotational, acceleration * 0.85);
  const heading = shortestAngleDelta(previous.alpha, state.alpha);
  const lateral = state.gamma - previous.gamma;
  const vertical = state.beta - previous.beta;
  const direction = Math.sign(heading) || Math.sign(lateral) || Math.sign(vertical);
  return { strength, direction };
}

export function lowPassAngle(previousDeg: number, currentDeg: number, factor = LOW_PASS_FACTOR) {
  return normalizeAngle(previousDeg + shortestAngleDelta(previousDeg, currentDeg) * factor);
}

export function calculateTilt(beta: number, gamma: number) {
  return Math.sqrt(beta * beta + gamma * gamma);
}

/** Four-way feedback only begins beyond the normal balancing range. */
export function resolveLevel01TiltDirection(beta: number, gamma: number): Level01TiltDirection | null {
  if (calculateTilt(beta, gamma) < APPROACHING_THRESHOLD_DEG) return null;
  if (Math.abs(gamma) >= Math.abs(beta)) return gamma >= 0 ? 'E' : 'W';
  return beta >= 0 ? 'S' : 'N';
}

export function resolveBalanceState(
  tilt: number,
  previousState: BalanceState = 'UNBALANCED',
): Exclude<BalanceState, 'HOLDING' | 'LOCKED'> {
  return resolveLevel01BalanceState(tilt, previousState);
}

export function calculateMotionEnergy(input: {
  orientationDelta: number;
  rotationRate: number;
  acceleration: number;
}) {
  const orientation = Math.min(input.orientationDelta / ORIENTATION_NORMALIZE, 1);
  const rotation = Math.min(input.rotationRate / ROTATION_NORMALIZE, 1);
  const acceleration = Math.min(input.acceleration / ACCEL_NORMALIZE, 1);
  return clamp01(
    orientation * MOTION_ENERGY_WEIGHTS.orientation
    + rotation * MOTION_ENERGY_WEIGHTS.rotation
    + acceleration * MOTION_ENERGY_WEIGHTS.acceleration,
  );
}

export function createPhysicsState(): PhysicsState {
  return {
    alpha: 0,
    beta: 0,
    gamma: 0,
    rotationRate: 0,
    acceleration: 0,
    motionEnergy: 0,
    balanceState: 'UNBALANCED',
    balanceProgress: 0,
    holdProgress: 0,
    angularVelocity: 0,
    spinAngle: 0,
    dampedBeta: 0,
    dampedGamma: 0,
    axisAngleX: 0,
    axisAngleY: 0,
    axisAngleZ: 0,
    axisVelocityX: 0,
    axisVelocityY: 0,
    axisVelocityZ: 0,
    motionOffsetX: 0,
    motionOffsetY: 0,
    motionOffsetZ: 0,
    balancedSince: -1,
    lockChimePending: false,
    visualBurstStartedAt: -1,
    visualBurstDuration: 0,
    visualBurstTurns: 0,
    visualBurstDirection: 0,
    visualBurstAngle: 0,
    visualBurstVelocity: 0,
    lastVisualBurstAt: -Infinity,
    visualBurstId: 0,
  };
}

function mapTiltAxis(degrees: number) {
  const normalized = Math.max(-1, Math.min(1, degrees / 90));
  return normalized * (MAX_TILT_VISUAL_ANGLE_DEG * Math.PI / 180);
}

/**
 * V3：角速度上限改軟限幅（tanh 漸近曲線），超過 knee 後越來越難再往上衝，
 * 但永遠不會像硬 clamp 那樣「撞牆」瞬間截斷。
 */
function softClampAngularVelocity(value: number) {
  const knee = ANGULAR_VELOCITY_SOFT_KNEE;
  const magnitude = Math.abs(value);
  if (magnitude <= knee) return value;
  const headroom = MAX_FLICK_SPIN_SPEED - knee;
  const eased = headroom * Math.tanh((magnitude - knee) / Math.max(headroom, 0.001));
  return Math.sign(value) * (knee + eased);
}

export function integrateLevel01Physics(
  state: PhysicsState,
  input: {
    alpha: number;
    beta: number;
    gamma: number;
    rotationRate: number;
    acceleration: number;
    accelerationX?: number;
    accelerationY?: number;
    accelerationZ?: number;
    rotationAlpha?: number;
    rotationBeta?: number;
    rotationGamma?: number;
    // Absolute device heading must never create idle spin. Only a deliberate
    // pointer-drag inertia window opts into Y-axis rotational drive.
    allowSpin?: boolean;
    now: number;
    delta: number;
    reducedMotion: boolean;
  },
) {
  const delta = Math.min(Math.max(input.delta, 0), FRAME_DELTA_CAP);
  const prevAlpha = state.alpha;
  const prevBeta = state.beta;
  const prevGamma = state.gamma;

  const smoothing = frameRateIndependentFactor(delta);
  state.alpha = lowPassAngle(state.alpha, input.alpha, smoothing);
  state.beta = lowPass(state.beta, input.beta, smoothing);
  state.gamma = lowPass(state.gamma, input.gamma, smoothing);
  state.rotationRate = lowPass(state.rotationRate, Math.abs(input.rotationRate), smoothing);
  state.acceleration = lowPass(state.acceleration, Math.abs(input.acceleration), smoothing);

  const orientationDelta = (
    Math.abs(shortestAngleDelta(prevAlpha, state.alpha))
    + Math.abs(state.beta - prevBeta)
    + Math.abs(state.gamma - prevGamma)
  ) / Math.max(delta, 1 / 120);

  let motionEnergy = calculateMotionEnergy({
    orientationDelta,
    rotationRate: state.rotationRate,
    acceleration: state.acceleration,
  });
  if (input.reducedMotion) motionEnergy *= REDUCED_MOTION_SPEED_SCALE;
  state.motionEnergy = clamp01(motionEnergy);

  const tilt = calculateTilt(state.beta, state.gamma);
  const candidate = resolveBalanceState(tilt, state.balanceState);
  state.balanceProgress = level01BalanceProgress(tilt);
  state.lockChimePending = false;

  // V3：LOCKED 除了角度小，角速度也要小，避免殘留自轉時被誤判「已經定住」。
  const spinSettled = Math.abs(state.angularVelocity) <= ANGULAR_VELOCITY_LOCK_THRESHOLD;
  if (state.balanceState === 'LOCKED') {
    if (state.motionEnergy > WAKE_THRESHOLD || candidate === 'UNBALANCED') {
      state.balanceState = 'UNBALANCED';
      state.balancedSince = -1;
    }
  } else if (candidate === 'BALANCED' && spinSettled) {
    if ((state.balanceState !== 'BALANCED' && state.balanceState !== 'HOLDING') || state.balancedSince < 0) {
      state.balancedSince = input.now;
    }
    state.balanceState = input.now - state.balancedSince >= BALANCED_CONFIRM_MS ? 'HOLDING' : 'BALANCED';
    if (state.balancedSince >= 0 && input.now - state.balancedSince >= LOCKED_HOLD_MS) {
      state.balanceState = 'LOCKED';
      state.lockChimePending = true;
    }
  } else if (candidate === 'BALANCED') {
    // 角度已經到位，但還在轉——維持 BALANCED 顯示，不開始倒數計時，等轉速沉澱下來。
    state.balanceState = 'BALANCED';
    state.balancedSince = -1;
  } else {
    state.balanceState = candidate;
    state.balancedSince = -1;
  }
  state.holdProgress = level01HoldProgress(state.balancedSince, input.now, state.balanceState);

  const maxSpeed = input.reducedMotion
    ? MAX_SAFE_ROTATION_SPEED * REDUCED_MOTION_SPEED_SCALE
    : MAX_SAFE_ROTATION_SPEED;
  const spinAllowed = input.allowSpin ?? true;
  const flick = input.reducedMotion || !spinAllowed ? { strength: 0, direction: 0 } : resolveFlick(state, {
    alpha: prevAlpha,
    beta: prevBeta,
    gamma: prevGamma,
  });
  // Gentle movement must feel gentle. A progressive curve keeps low-speed hand
  // motion precise, while still reaching the full safe speed when the customer
  // deliberately moves quickly.
  const proportionalEnergy = state.motionEnergy ** 1.45;
  const baseTarget = !spinAllowed || state.balanceState === 'LOCKED' ? 0 : proportionalEnergy * maxSpeed;
  const flickTarget = state.balanceState === 'LOCKED' || flick.direction === 0
    ? 0
    : flick.direction * (MAX_SAFE_ROTATION_SPEED + flick.strength * (MAX_FLICK_SPIN_SPEED - MAX_SAFE_ROTATION_SPEED));
  const targetOmega = flick.strength > 0 ? flickTarget : baseTarget;
  const damping = state.balanceState === 'LOCKED'
    ? LOCKED_DAMPING
    : flick.strength > 0
      ? FLICK_RESPONSE_DAMPING
      : Math.abs(state.angularVelocity) > maxSpeed ? FLICK_COAST_DAMPING : DAMPING;
  const settle = 1 - Math.exp(-damping * delta);
  state.angularVelocity += (targetOmega - state.angularVelocity) * settle;
  state.angularVelocity = softClampAngularVelocity(state.angularVelocity);
  if (state.balanceState === 'LOCKED' && Math.abs(state.angularVelocity) < 0.002) {
    state.angularVelocity = 0;
  }
  state.spinAngle += state.angularVelocity * delta;

  // V3：傾斜軸（beta/gamma）也走跟自轉一樣的阻尼追蹤，不是把濾波後的值直接畫出來，
  // 讓視覺讀起來像太極真的有重量，而不是跟著感測器雜訊硬跳。
  const tiltSettle = 1 - Math.exp(-TILT_DAMPING * delta);
  state.dampedBeta += (state.beta - state.dampedBeta) * tiltSettle;
  state.dampedGamma += (state.gamma - state.dampedGamma) * tiltSettle;

  // 三軸陀螺儀直接積分成連續角度，讓上下、左右與手腕轉向都能越過
  // 360°，而不是只有有限角度的左右傾斜。速度採軟壓縮並在停止後自然衰減。
  const axisResponse = 1 - Math.exp(-8.5 * delta);
  const axisDamping = Math.exp(-3.8 * delta);
  const axisLimit = input.reducedMotion ? 1.1 : 5.4;
  const axisTarget = (degreesPerSecond: number) => {
    const radians = degreesPerSecond * Math.PI / 180;
    return axisLimit * Math.tanh(radians / Math.max(axisLimit, 0.001));
  };
  const nextAxisVelocity = (current: number, raw: number) => {
    const target = axisTarget(raw);
    return Math.abs(raw) > 0.01
      ? current + (target - current) * axisResponse
      : current * axisDamping;
  };
  state.axisVelocityX = nextAxisVelocity(state.axisVelocityX, input.rotationBeta ?? 0);
  state.axisVelocityY = nextAxisVelocity(state.axisVelocityY, spinAllowed ? input.rotationAlpha ?? 0 : 0);
  state.axisVelocityZ = nextAxisVelocity(state.axisVelocityZ, input.rotationGamma ?? 0);
  state.axisAngleX += state.axisVelocityX * delta;
  state.axisAngleY += state.axisVelocityY * delta;
  state.axisAngleZ += state.axisVelocityZ * delta;

  // 線性加速度只負責很小的有重量位移／跳動；tanh 保證球不會被甩出卡片。
  const offsetResponse = 1 - Math.exp(-10 * delta);
  const offsetScale = input.reducedMotion ? 0.006 : 0.018;
  const targetOffset = (value: number) => Math.tanh(value / 5) * offsetScale;
  state.motionOffsetX += (targetOffset(input.accelerationX ?? 0) - state.motionOffsetX) * offsetResponse;
  state.motionOffsetY += (-targetOffset(input.accelerationY ?? 0) - state.motionOffsetY) * offsetResponse;
  state.motionOffsetZ += (targetOffset(input.accelerationZ ?? 0) - state.motionOffsetZ) * offsetResponse;

  // Visual burst is deliberately independent from balance classification: it
  // turns a clear small gesture into a short full-turn flourish while leaving
  // the real tilt/dead-zone calculations untouched.
  const burstElapsedSeconds = state.visualBurstStartedAt >= 0 ? (input.now - state.visualBurstStartedAt) / 1000 : Infinity;
  const burstActive = state.visualBurstStartedAt >= 0 && burstElapsedSeconds < state.visualBurstDuration;
  const burstDirection = Math.sign(state.gamma) || Math.sign(state.beta) || flick.direction;
  const canStartBurst = !input.reducedMotion && !burstActive && burstDirection !== 0
    && input.now - state.lastVisualBurstAt >= VISUAL_BURST_COOLDOWN_MS
    && flick.strength >= 0.1;
  if (canStartBurst) {
    const turns = flick.strength >= 0.62 ? 5 : flick.strength >= 0.32 ? 3 : 2;
    state.visualBurstStartedAt = input.now;
    state.visualBurstDuration = flick.strength >= 0.62 ? 0.9 : flick.strength >= 0.32 ? 0.72 : 0.58;
    state.visualBurstTurns = turns;
    state.visualBurstDirection = burstDirection;
    state.visualBurstAngle = 0;
    state.visualBurstVelocity = 0;
    state.lastVisualBurstAt = input.now;
    state.visualBurstId += 1;
  }
  if (state.visualBurstStartedAt >= 0) {
    const progress = Math.max(0, Math.min(1, (input.now - state.visualBurstStartedAt) / 1000 / state.visualBurstDuration));
    const eased = 1 - (1 - progress) ** 3;
    const total = state.visualBurstTurns * Math.PI * 2;
    state.visualBurstAngle = state.visualBurstDirection * total * eased;
    state.visualBurstVelocity = state.visualBurstDirection * total * 3 * (1 - progress) ** 2 / state.visualBurstDuration;
    if (progress >= 1) {
      // Whole turns finish visually aligned, so the physical spin can continue
      // without a snap or a residual orientation error.
      state.visualBurstStartedAt = -1;
      state.visualBurstAngle = 0;
      state.visualBurstVelocity = 0;
    }
  }

  return state;
}

export function visualPoseFromPhysics(state: PhysicsState, driving: boolean): Level01VisualPose {
  return {
    driving,
    visualEuler: {
      x: mapTiltAxis(state.dampedBeta) + state.axisAngleX,
      y: state.spinAngle + state.visualBurstAngle + state.axisAngleY,
      z: mapTiltAxis(state.dampedGamma) + state.axisAngleZ,
    },
    visualOffset: { x: state.motionOffsetX, y: state.motionOffsetY, z: state.motionOffsetZ },
    angularVelocity: state.angularVelocity + state.visualBurstVelocity,
    spinAngle: state.spinAngle,
    motionEnergy: state.motionEnergy,
    balanceState: state.balanceState,
    balanceProgress: state.balanceProgress,
    holdProgress: state.holdProgress,
    visualMomentum: Math.min(1, Math.abs(state.visualBurstVelocity) / 34),
    visualBurstId: state.visualBurstId,
    visualBurstTurns: state.visualBurstTurns,
    visualBurstDuration: state.visualBurstDuration,
  };
}

/**
 * A bounded, frame-clock-driven living scale for Level 01 only.
 * Motion changes the cadence, while a short double pulse gives touch/flick
 * feedback without starting another animation loop.
 */
export function level01LivingScale(
  elapsedSeconds: number,
  motionEnergy: number,
  pulseElapsedSeconds = Number.POSITIVE_INFINITY,
  reducedMotion = false,
) {
  const energy = clamp01(motionEnergy);
  const period = reducedMotion ? 4.2 : 3.5 - energy * 1.2;
  const phase = (Math.max(0, elapsedSeconds) / period) * Math.PI * 2;
  const midpoint = reducedMotion ? 1 : 1.005;
  const amplitude = reducedMotion ? 0.01 : 0.035;
  const breath = midpoint - Math.cos(phase) * amplitude;

  if (reducedMotion || !Number.isFinite(pulseElapsedSeconds)) {
    return Math.max(reducedMotion ? 0.99 : 0.97, Math.min(reducedMotion ? 1.01 : 1.04, breath));
  }
  const pulse = (center: number, width: number, height: number) => {
    const distance = Math.abs(pulseElapsedSeconds - center);
    return distance >= width ? 0 : (1 - distance / width) * height;
  };
  return Math.max(0.97, Math.min(1.04, breath + pulse(0.055, 0.055, 0.006) + pulse(0.19, 0.075, 0.0035)));
}

export function snapshotFromPhysics(state: PhysicsState): MotionSnapshot {
  return {
    alpha: state.alpha,
    beta: state.beta,
    gamma: state.gamma,
    rotationRate: state.rotationRate,
    acceleration: state.acceleration,
    motionEnergy: state.motionEnergy,
    balanceState: state.balanceState,
    balanceProgress: state.balanceProgress,
    holdProgress: state.holdProgress,
  };
}

export class Level01PhysicsEngine {
  readonly state = createPhysicsState();

  step(input: Parameters<typeof integrateLevel01Physics>[1]) {
    return integrateLevel01Physics(this.state, input);
  }

  pose(driving: boolean) {
    return visualPoseFromPhysics(this.state, driving);
  }

  snapshot() {
    return snapshotFromPhysics(this.state);
  }
}
