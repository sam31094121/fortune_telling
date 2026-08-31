import {
  APPROACHING_THRESHOLD_DEG,
  DAMPING,
  FLICK_ACCELERATION_THRESHOLD,
  FLICK_COAST_DAMPING,
  FLICK_RESPONSE_DAMPING,
  FLICK_ROTATION_THRESHOLD,
  FRAME_DELTA_CAP,
  LEVEL_THRESHOLD_DEG,
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
  WAKE_THRESHOLD,
  VISUAL_BURST_COOLDOWN_MS,
  VISUAL_BURST_MIN_TILT_DEG,
} from './level01.constants';

export type BalanceState = 'UNBALANCED' | 'APPROACHING' | 'BALANCED' | 'LOCKED';
export type Level01TiltDirection = 'N' | 'E' | 'S' | 'W';

export interface MotionSnapshot {
  alpha: number;
  beta: number;
  gamma: number;
  rotationRate: number;
  acceleration: number;
  motionEnergy: number;
  balanceState: BalanceState;
}

export interface Level01VisualPose {
  driving: boolean;
  visualEuler: { x: number; y: number; z: number };
  angularVelocity: number;
  spinAngle: number;
  motionEnergy: number;
  balanceState: BalanceState;
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
  angularVelocity: number;
  spinAngle: number;
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

export function resolveBalanceState(tilt: number): Exclude<BalanceState, 'LOCKED'> {
  if (tilt <= LEVEL_THRESHOLD_DEG) return 'BALANCED';
  if (tilt <= APPROACHING_THRESHOLD_DEG) return 'APPROACHING';
  return 'UNBALANCED';
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
    angularVelocity: 0,
    spinAngle: 0,
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

export function integrateLevel01Physics(
  state: PhysicsState,
  input: {
    alpha: number;
    beta: number;
    gamma: number;
    rotationRate: number;
    acceleration: number;
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
  const candidate = resolveBalanceState(tilt);
  state.lockChimePending = false;

  if (state.balanceState === 'LOCKED') {
    if (state.motionEnergy > WAKE_THRESHOLD || candidate === 'UNBALANCED') {
      state.balanceState = 'UNBALANCED';
      state.balancedSince = -1;
    }
  } else if (candidate === 'BALANCED') {
    if (state.balanceState !== 'BALANCED' || state.balancedSince < 0) {
      state.balancedSince = input.now;
    }
    state.balanceState = 'BALANCED';
    if (state.balancedSince >= 0 && input.now - state.balancedSince >= LOCKED_HOLD_MS) {
      state.balanceState = 'LOCKED';
      state.lockChimePending = true;
    }
  } else {
    state.balanceState = candidate;
    state.balancedSince = -1;
  }

  const maxSpeed = input.reducedMotion
    ? MAX_SAFE_ROTATION_SPEED * REDUCED_MOTION_SPEED_SCALE
    : MAX_SAFE_ROTATION_SPEED;
  const flick = input.reducedMotion ? { strength: 0, direction: 0 } : resolveFlick(state, {
    alpha: prevAlpha,
    beta: prevBeta,
    gamma: prevGamma,
  });
  const baseTarget = state.balanceState === 'LOCKED' ? 0 : state.motionEnergy * maxSpeed;
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
  state.angularVelocity = Math.max(-MAX_FLICK_SPIN_SPEED, Math.min(MAX_FLICK_SPIN_SPEED, state.angularVelocity));
  if (state.balanceState === 'LOCKED' && Math.abs(state.angularVelocity) < 0.002) {
    state.angularVelocity = 0;
  }
  state.spinAngle += state.angularVelocity * delta;

  // Visual burst is deliberately independent from balance classification: it
  // turns a clear small gesture into a short full-turn flourish while leaving
  // the real tilt/dead-zone calculations untouched.
  const burstElapsedSeconds = state.visualBurstStartedAt >= 0 ? (input.now - state.visualBurstStartedAt) / 1000 : Infinity;
  const burstActive = state.visualBurstStartedAt >= 0 && burstElapsedSeconds < state.visualBurstDuration;
  const burstDirection = Math.sign(state.gamma) || Math.sign(state.beta) || flick.direction;
  const canStartBurst = !input.reducedMotion && !burstActive && burstDirection !== 0
    && input.now - state.lastVisualBurstAt >= VISUAL_BURST_COOLDOWN_MS
    && (flick.strength > 0 || (tilt >= VISUAL_BURST_MIN_TILT_DEG && state.motionEnergy >= 0.14));
  if (canStartBurst) {
    const turns = flick.strength > 0 ? 5 : tilt >= APPROACHING_THRESHOLD_DEG ? 3 : 2;
    state.visualBurstStartedAt = input.now;
    state.visualBurstDuration = flick.strength > 0 ? 0.9 : 0.58;
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
  const heading = (normalizeAngle(state.alpha) * Math.PI) / 180;
  return {
    driving,
    visualEuler: {
      x: mapTiltAxis(state.beta),
      y: heading + state.spinAngle + state.visualBurstAngle,
      z: mapTiltAxis(state.gamma),
    },
    angularVelocity: state.angularVelocity + state.visualBurstVelocity,
    spinAngle: state.spinAngle,
    motionEnergy: state.motionEnergy,
    balanceState: state.balanceState,
    visualMomentum: Math.min(1, Math.abs(state.visualBurstVelocity) / 34),
    visualBurstId: state.visualBurstId,
    visualBurstTurns: state.visualBurstTurns,
    visualBurstDuration: state.visualBurstDuration,
  };
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
  };
}
