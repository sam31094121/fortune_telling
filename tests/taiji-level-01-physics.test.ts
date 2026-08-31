import {
  calculateMotionEnergy,
  calculateTilt,
  clamp01,
  createPhysicsState,
  integrateLevel01Physics,
  frameRateIndependentFactor,
  level01BubbleOffset,
  lowPass,
  lowPassAngle,
  normalizeAngle,
  resolveBalanceState,
  shortestAngleDelta,
} from '../components/taiji/level-01/Level01Physics';
import { resolveEffectivePermission, resolveLevel01Mode } from '../components/taiji/level-01/Level01Fallback';
import { canAutoStartLevel01Sensors, createGravityEstimate, readMotionEvent } from '../components/taiji/level-01/Level01Orientation';
import { level01ReentryPose, shouldTriggerLevel01Reentry } from '../components/taiji/level-01/Level01Reentry';
import { MAX_FLICK_SPIN_SPEED, MAX_SAFE_ROTATION_SPEED, WAKE_THRESHOLD } from '../components/taiji/level-01/level01.constants';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(normalizeAngle(365) === 5, '365 wraps onto the 360 cycle');
assert(normalizeAngle(-90) === 270, 'negative angle wraps');
assert(Math.abs(shortestAngleDelta(359, 1) - 2) < 1e-9, '359→1 must be +2 not -358');
assert(Math.abs(shortestAngleDelta(10, 350) + 20) < 1e-9, '10→350 must be -20');
assert(Math.abs(lowPassAngle(359, 1) - 359.24) < 1e-6, 'circular low-pass must not jump across 0/360');
assert(Math.abs(frameRateIndependentFactor(1 / 60) - 0.12) < 1e-9, '60fps smoothing preserves the calibrated response');
assert(level01BubbleOffset(0.8) === 0 && level01BubbleOffset(30) === 18, 'bubble applies a dead zone and safe clamp from shared tilt state');
assert(shouldTriggerLevel01Reentry(2, 1), 'only the layer 2→1 path starts the level 1 re-entry');
assert(!shouldTriggerLevel01Reentry(3, 1), 'other layers cannot start the level 1 re-entry');
const reentry = level01ReentryPose(0.12, false);
assert(reentry.active && reentry.spin > 0 && Math.abs(reentry.x) > 0, 're-entry has one bounded spin-and-drift pose');
assert(!level01ReentryPose(0.12, true).active && !level01ReentryPose(1, false).active, 're-entry settles immediately for reduced motion and ends once');

assert(Math.abs(calculateTilt(3, 4) - 5) < 1e-9, 'tilt uses hypot');
assert(resolveBalanceState(1.2) === 'BALANCED', 'inside 2.5° is balanced');
assert(resolveBalanceState(5) === 'APPROACHING', 'inside 8° is approaching');
assert(resolveBalanceState(12) === 'UNBALANCED', 'beyond 8° is unbalanced');

assert(clamp01(1.8) === 1, 'energy clamp high');
assert(clamp01(-0.2) === 0, 'energy clamp low');
assert(calculateMotionEnergy({ orientationDelta: 250, rotationRate: 900, acceleration: 80 }) === 1, 'motion energy cannot exceed 1');
assert(calculateMotionEnergy({ orientationDelta: 0, rotationRate: 0, acceleration: 0 }) === 0, 'still phone is 0 energy');

// A browser that exposes an iOS-style requestPermission must wait for a real
// tap. We never auto-open that permission dialog on first render.
const originalOrientation = (globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent;
const originalMotion = (globalThis as { DeviceMotionEvent?: unknown }).DeviceMotionEvent;
const originalWindow = (globalThis as { window?: unknown }).window;
(globalThis as { window?: unknown }).window = globalThis;
(globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent = Object.assign(class {}, { requestPermission: async () => 'granted' });
(globalThis as { DeviceMotionEvent?: unknown }).DeviceMotionEvent = class {};
assert(!canAutoStartLevel01Sensors(), 'gesture-only sensor permission must not auto-start');
(globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent = class {};
assert(canAutoStartLevel01Sensors(), 'gesture-free sensor browsers may start when the first layer opens');
(globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent = originalOrientation;
(globalThis as { DeviceMotionEvent?: unknown }).DeviceMotionEvent = originalMotion;
(globalThis as { window?: unknown }).window = originalWindow;

const state = createPhysicsState();
integrateLevel01Physics(state, {
  alpha: 20,
  beta: 1,
  gamma: 1,
  rotationRate: 40,
  acceleration: 2,
  now: 0,
  delta: 1 / 60,
  reducedMotion: false,
});
assert(state.angularVelocity <= MAX_SAFE_ROTATION_SPEED, 'rotation must respect max safe speed');
assert(state.balanceState === 'BALANCED' || state.balanceState === 'UNBALANCED' || state.balanceState === 'APPROACHING', 'valid state');

const flicked = createPhysicsState();
for (let i = 0; i < 8; i += 1) {
  integrateLevel01Physics(flicked, {
    alpha: 0,
    beta: 11,
    gamma: (i + 1) * 8,
    rotationRate: 780,
    acceleration: 15,
    now: i * 16,
    delta: 1 / 60,
    reducedMotion: false,
  });
}
assert(flicked.angularVelocity > MAX_SAFE_ROTATION_SPEED, 'a deliberate fast flick earns a short inertial spin above normal tilt speed');
assert(flicked.angularVelocity <= MAX_FLICK_SPIN_SPEED, 'fast flick spin has a hard safe cap');
const flickSpeed = flicked.angularVelocity;
for (let i = 0; i < 90; i += 1) {
  integrateLevel01Physics(flicked, {
    alpha: 0,
    beta: 11,
    gamma: 56,
    rotationRate: 0,
    acceleration: 0,
    now: 176 + i * 16,
    delta: 1 / 60,
    reducedMotion: false,
  });
}
assert(flicked.angularVelocity < flickSpeed, 'inertial flick spin decays with friction after the motion ends');

let locked = createPhysicsState();
let sawLockChime = false;
for (let i = 0; i < 50; i += 1) {
  integrateLevel01Physics(locked, {
    alpha: 0,
    beta: 0.2,
    gamma: 0.2,
    rotationRate: 0,
    acceleration: 0,
    now: i * 20,
    delta: 1 / 60,
    reducedMotion: false,
  });
  if (locked.lockChimePending) sawLockChime = true;
}
assert(locked.balanceState === 'LOCKED', `expected LOCKED after stable hold, got ${locked.balanceState}`);
assert(sawLockChime, 'lock must emit one confirm cue');

const velocityBefore = 2.4;
locked.angularVelocity = velocityBefore;
integrateLevel01Physics(locked, {
  alpha: 0,
  beta: 0.2,
  gamma: 0.2,
  rotationRate: 0,
  acceleration: 0,
  now: 2000,
  delta: 1 / 60,
  reducedMotion: false,
});
assert(locked.angularVelocity < velocityBefore, 'LOCKED must damp, not freeze instantly');
assert(locked.angularVelocity >= 0, 'damped velocity stays non-negative in this setup');

integrateLevel01Physics(locked, {
  alpha: 40,
  beta: 18,
  gamma: 12,
  rotationRate: 200,
  acceleration: 12,
  now: 2200,
  delta: 1 / 60,
  reducedMotion: false,
});
assert(locked.motionEnergy > WAKE_THRESHOLD, 'wake uses motion energy');
assert(locked.balanceState === 'UNBALANCED', 'LOCKED must wake without reload');

assert(resolveLevel01Mode({ permission: 'denied', hasSensorData: false, layerEnabled: true }) === 'FALLBACK_MODE', 'denied stays visible via fallback');
assert(resolveLevel01Mode({ permission: 'granted', hasSensorData: true, layerEnabled: true }) === 'LIVE', 'granted live mode');
assert(resolveLevel01Mode({ permission: 'granted', hasSensorData: true, layerEnabled: false }) === 'FALLBACK_MODE', 'layers 2-24 must not keep level 01 live');

function motionEvent(includingGravity: { x: number; y: number; z: number }, linear?: { x: number; y: number; z: number }) {
  return {
    rotationRate: null,
    acceleration: linear ?? null,
    accelerationIncludingGravity: includingGravity,
  } as unknown as DeviceMotionEvent;
}

// 重力不得污染 motionEnergy：只有 accelerationIncludingGravity 的裝置，靜止時必須趨近 0。
const gravity = createGravityEstimate();
const resting = motionEvent({ x: 0, y: 0, z: -9.81 });
let restSample = readMotionEvent(resting, 0, gravity);
for (let i = 1; i <= 40; i += 1) restSample = readMotionEvent(resting, i * 16, gravity);
assert(restSample.acceleration < 0.05, '靜止手機殘餘加速度必須趨近 0');
assert(
  calculateMotionEnergy({ orientationDelta: 0, rotationRate: 0, acceleration: restSample.acceleration }) < 0.01,
  '靜止手機不得有假能量底值',
);

const shaken = readMotionEvent(motionEvent({ x: 6, y: 0, z: -9.81 }), 700, gravity);
assert(shaken.acceleration > 3, '甩動時仍必須讀得到真實加速度');

const scalarOnly = readMotionEvent(resting, 0);
assert(scalarOnly.acceleration < 0.05, '無重力估計器時也要扣掉重力基準');

const linearFirst = readMotionEvent(motionEvent({ x: 0, y: 0, z: -9.81 }, { x: 1, y: 2, z: 2 }), 0, createGravityEstimate());
assert(Math.abs(linearFirst.acceleration - 3) < 1e-9, '有線性加速度時必須優先採用');

// 感測器暖機逾時必須可復原，不得寫死 unsupported。
assert(
  resolveEffectivePermission({ permission: 'granted', sensorTimedOut: true, hasSensorData: false }) === 'unsupported',
  '逾時且無資料時降級為觀賞模式',
);
assert(
  resolveEffectivePermission({ permission: 'granted', sensorTimedOut: true, hasSensorData: true }) === 'granted',
  '事件晚到必須自動回到 LIVE，不需重新整理',
);
assert(
  resolveEffectivePermission({ permission: 'denied', sensorTimedOut: false, hasSensorData: false }) === 'denied',
  '使用者拒絕授權維持拒絕',
);

console.log('Taiji Level 01 physics lock passed');
