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
  resolveLevel01TiltDirection,
  resolveBalanceState,
  shortestAngleDelta,
  unwrapAngle,
  visualPoseFromPhysics,
} from '../components/taiji/level-01/Level01Physics';
import { Level01CalibrationEngine } from '../components/taiji/level-01/Level01Calibration';
import { Level01GameController } from '../components/taiji/level-01/Level01GameController';
import { Level01QualityManager } from '../components/taiji/level-01/Level01QualityManager';
import { resolveEffectivePermission, resolveLevel01Mode } from '../components/taiji/level-01/Level01Fallback';
import { canAutoStartLevel01Sensors, createGravityEstimate, readMotionEvent } from '../components/taiji/level-01/Level01Orientation';
import { LEVEL01_REENTRY_CHEER_PROGRESS, LEVEL01_REENTRY_DURATION_SECONDS, level01ReentryCheer, level01ReentryPose, level01ReentrySoundEnvelope, level01ReentryTimeline, shouldTriggerLevel01Reentry } from '../components/taiji/level-01/Level01Reentry';
import { LEVEL01_ENTRANCE_DURATION_SECONDS, level01EntrancePose } from '../components/taiji/level-01/Level01Entrance';
import { MAX_FLICK_SPIN_SPEED, MAX_SAFE_ROTATION_SPEED, WAKE_THRESHOLD } from '../components/taiji/level-01/level01.constants';
import { Level01MotionGameEngine, type TaijiMotionGameInput } from '../components/taiji/level-01/Level01MotionGameEngine';
import { rotationBurstTimeline, rotationFeedbackProfile, TAIJI_ACTIVATION_FEEDBACK, TAIJI_PENTATONIC_HZ } from '../components/taiji/level-01/Level01SensoryFeedback';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(normalizeAngle(365) === 5, '365 wraps onto the 360 cycle');
assert(normalizeAngle(-90) === 270, 'negative angle wraps');
assert(Math.abs(shortestAngleDelta(359, 1) - 2) < 1e-9, '359→1 must be +2 not -358');
assert(Math.abs(shortestAngleDelta(10, 350) + 20) < 1e-9, '10→350 must be -20');
assert(unwrapAngle(359, 0) === 360 && unwrapAngle(360, 1) === 361, 'heading unwrap preserves 359→0→1 continuity');
assert(Math.abs(lowPassAngle(359, 1) - 359.24) < 1e-6, 'circular low-pass must not jump across 0/360');
assert(Math.abs(frameRateIndependentFactor(1 / 60) - 0.12) < 1e-9, '60fps smoothing preserves the calibrated response');
assert(level01BubbleOffset(0.8) === 0 && level01BubbleOffset(30) === 18, 'bubble applies a dead zone and safe clamp from shared tilt state');
assert(shouldTriggerLevel01Reentry(2, 1), 'the layer 2→1 path starts the level 1 re-entry');
assert(shouldTriggerLevel01Reentry(24, 1), 'any higher layer returning directly to level 1 starts the re-entry');
assert(!shouldTriggerLevel01Reentry(3, 2), 'returns that do not reach level 1 cannot start the re-entry');
const reentry = level01ReentryPose(0.12, false);
assert(reentry.active && reentry.spin > 0 && Math.abs(reentry.x) > 0, 're-entry has one bounded spin-and-drift pose');
assert(!level01ReentryPose(0.12, true).active && !level01ReentryPose(LEVEL01_REENTRY_DURATION_SECONDS, false).active, 're-entry settles immediately for reduced motion and ends once');
assert(LEVEL01_REENTRY_DURATION_SECONDS > 0.76, 're-entry gives the natural coast more time than the former short transition');
const launchTimeline = level01ReentryTimeline(0.14);
const coastTimeline = level01ReentryTimeline(0.5);
const settleTimeline = level01ReentryTimeline(0.9);
assert(launchTimeline.phase === 'LAUNCH' && coastTimeline.phase === 'COAST' && settleTimeline.phase === 'SETTLE', 're-entry follows launch, coast, then settle phases');
assert(launchTimeline.energy > coastTimeline.energy && coastTimeline.energy > settleTimeline.energy, 're-entry kinetic energy decays through the longer coast');
assert(settleTimeline.tailVelocity < 0, 're-entry supplies a small residual angular velocity for the level-01 handoff');
assert(level01ReentryPose(LEVEL01_REENTRY_DURATION_SECONDS * 0.99, false).spin > 0.1, 're-entry keeps a visible low-speed rotational tail instead of hard-stopping');
const cheerStart = level01ReentryCheer(0);
const cheerPeak = level01ReentryCheer(0.5);
const cheerEnd = level01ReentryCheer(1);
assert(Math.abs(cheerStart.y) < 1e-9 && Math.abs(cheerEnd.y) < 1e-9 && cheerPeak.y > 0.01, 're-entry adds one restrained lift-and-settle greeting only in the tail');
assert(LEVEL01_REENTRY_CHEER_PROGRESS > 0.76 && LEVEL01_REENTRY_CHEER_PROGRESS < 1, 'the cheer feedback occurs once in the low-speed settling tail');
const reentryStartSound = level01ReentrySoundEnvelope(0);
const reentryPeakSound = level01ReentrySoundEnvelope(0.14);
const reentryMiddleSound = level01ReentrySoundEnvelope(0.5);
const reentryEndSound = level01ReentrySoundEnvelope(1);
assert(reentryPeakSound.frequency > reentryStartSound.frequency && reentryStartSound.frequency > reentryMiddleSound.frequency && reentryMiddleSound.frequency > reentryEndSound.frequency, 're-entry sound follows the launch then decelerating spin');
assert(reentryPeakSound.gain > reentryStartSound.gain && reentryStartSound.gain > reentryMiddleSound.gain && reentryEndSound.gain <= 0.00011, 're-entry sound fades cleanly to silence at visual settle');
const entrancePeak = level01EntrancePose(LEVEL01_ENTRANCE_DURATION_SECONDS * 0.24, false);
assert(entrancePeak.active && entrancePeak.z > 0 && entrancePeak.scale > 1, 'level-01 user activation has a clear bounded forward impact');
assert(Math.abs(entrancePeak.rx) > 0 && Math.abs(entrancePeak.ry) > 0 && Math.abs(entrancePeak.rz) > 0, 'entry surprise uses cross-axis rotation');
assert(!level01EntrancePose(LEVEL01_ENTRANCE_DURATION_SECONDS, false).active, 'entry surprise runs once and hands off cleanly');
assert(LEVEL01_ENTRANCE_DURATION_SECONDS === TAIJI_ACTIVATION_FEEDBACK.durationSeconds && TAIJI_ACTIVATION_FEEDBACK.turns === 2, 'entry motion, sound and haptic use one deterministic timing contract');
assert(TAIJI_ACTIVATION_FEEDBACK.hapticPattern.join(',') === '18,38,26', 'entry palm impact keeps a fixed impact-pause-recoil proportion');

assert(Math.abs(calculateTilt(3, 4) - 5) < 1e-9, 'tilt uses hypot');
assert(resolveBalanceState(1.2) === 'BALANCED', 'inside 2.5° is balanced');
assert(resolveBalanceState(5) === 'APPROACHING', 'inside 8° is approaching');
assert(resolveBalanceState(12) === 'UNBALANCED', 'beyond 8° is unbalanced');
assert(resolveBalanceState(4, 'HOLDING') === 'BALANCED', 'exit threshold keeps a holding phone stable through the 3° boundary');
assert(resolveBalanceState(5.2, 'HOLDING') === 'APPROACHING', 'crossing 5° exits the balanced hysteresis band');
assert(resolveLevel01TiltDirection(1, 1) === null, 'small natural movement stays inside the four-way feedback dead zone');
assert(resolveLevel01TiltDirection(0, 12) === 'E' && resolveLevel01TiltDirection(0, -12) === 'W', 'horizontal tilt maps to a stable east/west pair');
assert(resolveLevel01TiltDirection(12, 0) === 'S' && resolveLevel01TiltDirection(-12, 0) === 'N', 'vertical tilt maps to a stable north/south pair');

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
assert(state.balanceState === 'BALANCED' || state.balanceState === 'HOLDING' || state.balanceState === 'UNBALANCED' || state.balanceState === 'APPROACHING', 'valid state');

const expressive = createPhysicsState();
for (let i = 0; i < 12; i += 1) {
  integrateLevel01Physics(expressive, {
    alpha: 0,
    beta: 3,
    gamma: 2,
    rotationRate: 60,
    acceleration: 4,
    now: i * 16,
    delta: 1 / 60,
    reducedMotion: false,
  });
}
const expressivePose = visualPoseFromPhysics(expressive, true);
assert(expressive.visualBurstTurns === 0 && expressivePose.visualMomentum === 0, 'a clear small tilt stays proportional and never causes an unsolicited fast flourish');
assert(expressive.angularVelocity < MAX_SAFE_ROTATION_SPEED * 0.7, 'gentle motion remains visibly slower than the normal safe-speed ceiling');

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

const threeAxis = createPhysicsState();
for (let i = 0; i < 150; i += 1) {
  integrateLevel01Physics(threeAxis, {
    alpha: 0, beta: 0, gamma: 0,
    rotationRate: 420, acceleration: 5,
    rotationAlpha: 280, rotationBeta: -240, rotationGamma: 200,
    accelerationX: 4, accelerationY: -3, accelerationZ: 2,
    now: i * (1000 / 60), delta: 1 / 60, reducedMotion: false,
  });
}
const threeAxisPose = visualPoseFromPhysics(threeAxis, true);
assert(Math.abs(threeAxis.axisAngleX) > Math.PI * 2, 'vertical hand motion can rotate continuously beyond 360 degrees');
assert(Math.abs(threeAxis.axisAngleY) > Math.PI * 2, 'wrist turn can rotate continuously beyond 360 degrees');
assert(Math.abs(threeAxis.axisAngleZ) > Math.PI * 2, 'lateral hand motion can rotate continuously beyond 360 degrees');
assert(Math.abs(threeAxisPose.visualOffset.x) <= 0.018 && Math.abs(threeAxisPose.visualOffset.y) <= 0.018, 'movement follow and jump remain inside the card-safe bound');
const axisSpeedBeforeStop = Math.hypot(threeAxis.axisVelocityX, threeAxis.axisVelocityY, threeAxis.axisVelocityZ);
for (let i = 0; i < 90; i += 1) {
  integrateLevel01Physics(threeAxis, {
    alpha: 0, beta: 0, gamma: 0, rotationRate: 0, acceleration: 0,
    rotationAlpha: 0, rotationBeta: 0, rotationGamma: 0,
    accelerationX: 0, accelerationY: 0, accelerationZ: 0,
    now: 2200 + i * (1000 / 60), delta: 1 / 60, reducedMotion: false,
  });
}
assert(Math.hypot(threeAxis.axisVelocityX, threeAxis.axisVelocityY, threeAxis.axisVelocityZ) < axisSpeedBeforeStop, 'all three axes coast down naturally after the phone stops');

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

const calibration = new Level01CalibrationEngine();
calibration.reset(0);
for (let index = 0; index < 10; index += 1) {
  calibration.push({ alpha: 358 + index * 0.2, beta: 7 + index * 0.02, gamma: -3 + index * 0.01, receivedAt: index * 45 });
}
assert(calibration.ready, 'stable 300–600ms sensor samples complete automatic calibration');
const corrected = calibration.apply({ alpha: 361, beta: 8, gamma: -2 });
assert(Math.abs(corrected.beta) < 1.1 && Math.abs(corrected.gamma) < 1.1, 'calibration removes the real holding baseline');

const game = new Level01GameController();
game.lowPerformance(true, 0);
assert(game.snapshot().state === 'IDLE', 'performance warmup cannot start the game before the customer');
game.beginPermission(0);
game.beginCalibration(20);
game.ready(420);
game.activate(900);
let gameSnapshot = game.sync({ balanceState: 'BALANCED', balanceProgress: 1, holdProgress: 0.2, motionEnergy: 0, now: 920 });
assert(gameSnapshot.state === 'ACTIVE', 'a still device cannot complete the level before the player creates motion');
game.sync({ balanceState: 'UNBALANCED', balanceProgress: 0.2, holdProgress: 0, motionEnergy: 0.5, now: 930 });
gameSnapshot = game.sync({ balanceState: 'BALANCED', balanceProgress: 0.92, holdProgress: 0.2, motionEnergy: 0.1, now: 940 });
assert(gameSnapshot.state === 'BALANCED' && gameSnapshot.combo === 1, 'state machine enters balanced and starts a lightweight combo');
gameSnapshot = game.sync({ balanceState: 'HOLDING', balanceProgress: 0.98, holdProgress: 0.7, motionEnergy: 0.05, now: 1450 });
assert(gameSnapshot.state === 'HOLDING' && gameSnapshot.holdProgress === 0.7, 'state machine exposes hold progress');
game.sync({ balanceState: 'LOCKED', balanceProgress: 1, holdProgress: 1, motionEnergy: 0, now: 1800 });
gameSnapshot = game.sync({ balanceState: 'LOCKED', balanceProgress: 1, holdProgress: 1, motionEnergy: 0, now: 2800 });
assert(gameSnapshot.state === 'LEVEL_COMPLETE' && gameSnapshot.score.overall > 0, 'locked state settles into completion with a local score');

const quality = new Level01QualityManager();
quality.quality = 'HIGH';
const slowMetrics = { fps: 38, averageFrameMs: 27, droppedFrames: 18, longTasks: 1, memoryPressure: false };
quality.update(slowMetrics, 0);
assert(quality.update(slowMetrics, 1700) === 'BALANCED', 'sustained sub-45 FPS degrades quality one level');
const criticalMetrics = { fps: 24, averageFrameMs: 42, droppedFrames: 30, longTasks: 3, memoryPressure: false };
assert(quality.update(criticalMetrics, 1900) === 'LOW', 'sub-30 FPS immediately protects the device with LOW quality');

assert(TAIJI_PENTATONIC_HZ.length === 5 && TAIJI_PENTATONIC_HZ.every((frequency, index) => index === 0 || frequency > TAIJI_PENTATONIC_HZ[index - 1]), 'rotation sound uses one ordered, consonant five-note palette');
const gentleFeedback = rotationFeedbackProfile({ spin: 0.42, energy: 0.3, pulseIndex: 2 });
assert(gentleFeedback.gain <= 0.038 && gentleFeedback.durationMs <= 124, 'rotation tone stays brief and under the local gain ceiling');
assert(Math.abs(gentleFeedback.harmonicFrequency / gentleFeedback.frequency - 1.5) < 1e-9, 'rotation tone uses a consonant perfect-fifth harmonic');
assert(gentleFeedback.hapticMs >= 5 && gentleFeedback.hapticMs <= 14, 'the matching rotation haptic is light and bounded');
assert(rotationFeedbackProfile({ spin: 1, energy: 1, pulseIndex: 4, reducedMotion: true }).hapticMs === 0, 'reduced motion keeps sound restrained and removes rotation haptics');
const sensoryBurst = rotationBurstTimeline(4, 0.8, 0.72);
assert(sensoryBurst.length === 4 && sensoryBurst.every((beat, index) => index === 0 || beat.offsetMs > sensoryBurst[index - 1].offsetMs), 'audio and haptic burst share one deterministic beat timeline');
assert(sensoryBurst.every((beat) => beat.gain <= 0.038 && beat.hapticMs <= 14), 'every synchronized burst beat stays inside audio and vibration safety caps');

const motionGameInput = (overrides: Partial<TaijiMotionGameInput> = {}): TaijiMotionGameInput => ({
  alpha: 0,
  beta: 9,
  gamma: 4,
  acceleration: 1.6,
  rotationRate: 90,
  motionEnergy: 0.32,
  angularVelocity: 1.2,
  balanceState: 'UNBALANCED',
  now: 0,
  delta: 1 / 60,
  reducedMotion: false,
  ...overrides,
});

const runMotionGameAtHz = (hz: number) => {
  const engine = new Level01MotionGameEngine();
  const frames = hz * 2;
  for (let frame = 0; frame < frames; frame += 1) {
    engine.update(motionGameInput({ now: frame / hz * 1000, delta: 1 / hz }));
  }
  return engine.snapshot();
};

const motion60 = runMotionGameAtHz(60);
const motion90 = runMotionGameAtHz(90);
const motion120 = runMotionGameAtHz(120);
assert(Math.abs(motion60.motionMagnitude - motion90.motionMagnitude) < 0.003, 'motion response is deltaTime-consistent at 60Hz and 90Hz');
assert(Math.abs(motion60.motionMagnitude - motion120.motionMagnitude) < 0.003, 'motion response is deltaTime-consistent at 60Hz and 120Hz');

const stagedMotion = new Level01MotionGameEngine();
for (let burst = 0; burst < 4; burst += 1) {
  const now = burst * 700;
  stagedMotion.update(motionGameInput({ now, acceleration: 5.2, rotationRate: 340, motionEnergy: 0.82 }));
  stagedMotion.update(motionGameInput({ now: now + 300, acceleration: 0, rotationRate: 0, motionEnergy: 0 }));
}
assert(stagedMotion.snapshot().stage === 'FIVE_ELEMENTS' && stagedMotion.snapshot().combo === 4, 'four safe ordinary-motion bursts reveal two forms, four symbols, bagua, then five elements');
const afterBurst = stagedMotion.update(motionGameInput({ now: 2901, acceleration: 0, rotationRate: 0, motionEnergy: 0 }));
assert(afterBurst.state !== 'BURST', 'a visual burst can never remain active beyond 800ms');
stagedMotion.markUnity();
assert(stagedMotion.snapshot().stage === 'UNITY' && stagedMotion.snapshot().visualElement === '空', 'completion returns the local visual signal to Void');

const reducedGame = new Level01MotionGameEngine();
const reducedSnapshot = reducedGame.update(motionGameInput({ acceleration: 5.2, rotationRate: 340, motionEnergy: 0.82, reducedMotion: true }));
assert(reducedSnapshot.stage === 'LIANGYI' && reducedSnapshot.state !== 'BURST', 'reduced motion keeps full stage progress without a burst effect');

const waterGame = new Level01MotionGameEngine();
let waterSnapshot = waterGame.snapshot();
for (let frame = 0; frame < 30; frame += 1) waterSnapshot = waterGame.update(motionGameInput({ now: frame * 16, beta: 5, gamma: 3, motionEnergy: 0.16, acceleration: 0.3, rotationRate: 20 }));
assert(waterSnapshot.visualElement === '水', 'slow movement maps only to the local Water visual signal');
const windSnapshot = waterGame.update(motionGameInput({ now: 520, beta: 2, gamma: 16, motionEnergy: 0.48, acceleration: 1.8, rotationRate: 120 }));
assert(windSnapshot.visualElement === '風', 'fast lateral movement maps to Wind');
const fireSnapshot = waterGame.update(motionGameInput({ now: 1200, acceleration: 5.2, rotationRate: 340, motionEnergy: 0.84 }));
assert(fireSnapshot.visualElement === '火', 'a safe burst maps to Fire');
const earthSnapshot = waterGame.update(motionGameInput({ now: 2100, beta: 0, gamma: 0, acceleration: 0, rotationRate: 0, motionEnergy: 0, balanceState: 'BALANCED' }));
assert(earthSnapshot.visualElement === '地', 'a stable horizontal phone maps to Earth');

const chaseGame = new Level01MotionGameEngine();
for (let frame = 0; frame <= 10; frame += 1) {
  chaseGame.update(motionGameInput({ now: frame * 16, beta: 0, gamma: 12, motionEnergy: 0.18 }));
}
assert(chaseGame.snapshot().chase.hits === 1 && chaseGame.snapshot().chase.direction === 'N', 'holding the first east light briefly absorbs it and advances the target');
for (let frame = 11; frame <= 25; frame += 1) {
  chaseGame.update(motionGameInput({ now: frame * 16, beta: 0, gamma: 0, motionEnergy: 0 }));
}
for (let frame = 26; frame <= 36; frame += 1) {
  chaseGame.update(motionGameInput({ now: frame * 16, beta: -12, gamma: 0, motionEnergy: 0.18 }));
}
assert(chaseGame.snapshot().chase.hits === 2 && chaseGame.snapshot().chase.hitId === 2, 'the next north light advances only after a deliberate matching tilt');

const longRun = new Level01MotionGameEngine();
for (let frame = 0; frame < 30 * 120; frame += 1) {
  longRun.update(motionGameInput({
    now: frame / 120 * 1000,
    delta: 1 / 120,
    beta: Math.sin(frame / 25) * 8,
    gamma: Math.cos(frame / 29) * 11,
    motionEnergy: 0.28,
  }));
}
assert(Number.isFinite(longRun.snapshot().motionMagnitude) && longRun.snapshot().motionMagnitude <= 1, '30-second 120Hz simulation remains finite and bounded');

console.log('Taiji Level 01 physics lock passed');
