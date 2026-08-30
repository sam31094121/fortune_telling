import {
  calculateMotionEnergy,
  calculateTilt,
  clamp01,
  createPhysicsState,
  integrateLevel01Physics,
  lowPass,
  lowPassAngle,
  normalizeAngle,
  resolveBalanceState,
  shortestAngleDelta,
} from '../components/taiji/level-01/Level01Physics';
import { resolveLevel01Mode } from '../components/taiji/level-01/Level01Fallback';
import { MAX_SAFE_ROTATION_SPEED, WAKE_THRESHOLD } from '../components/taiji/level-01/level01.constants';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(normalizeAngle(365) === 5, '365 wraps onto the 360 cycle');
assert(normalizeAngle(-90) === 270, 'negative angle wraps');
assert(Math.abs(shortestAngleDelta(359, 1) - 2) < 1e-9, '359→1 must be +2 not -358');
assert(Math.abs(shortestAngleDelta(10, 350) + 20) < 1e-9, '10→350 must be -20');
assert(Math.abs(lowPassAngle(359, 1) - 359.24) < 1e-6, 'circular low-pass must not jump across 0/360');

assert(Math.abs(calculateTilt(3, 4) - 5) < 1e-9, 'tilt uses hypot');
assert(resolveBalanceState(1.2) === 'BALANCED', 'inside 2.5° is balanced');
assert(resolveBalanceState(5) === 'APPROACHING', 'inside 8° is approaching');
assert(resolveBalanceState(12) === 'UNBALANCED', 'beyond 8° is unbalanced');

assert(clamp01(1.8) === 1, 'energy clamp high');
assert(clamp01(-0.2) === 0, 'energy clamp low');
assert(calculateMotionEnergy({ orientationDelta: 250, rotationRate: 900, acceleration: 80 }) === 1, 'motion energy cannot exceed 1');
assert(calculateMotionEnergy({ orientationDelta: 0, rotationRate: 0, acceleration: 0 }) === 0, 'still phone is 0 energy');

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

console.log('Taiji Level 01 physics lock passed');
