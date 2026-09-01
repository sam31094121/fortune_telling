import {
  LOW_PASS_FACTOR,
  SENSOR_DEAD_ZONE_DEG,
  SENSOR_DEAD_ZONE_RAMP_DEG,
  SENSOR_ROTATION_DEAD_ZONE,
  SENSOR_SPIKE_THRESHOLD_DEG,
  SENSOR_TIMEOUT_MS,
} from './level01.constants';
import { Level01CalibrationEngine } from './Level01Calibration';
import { frameRateIndependentFactor, lowPass, shortestAngleDelta, unwrapAngle } from './Level01Physics';
import {
  createGravityEstimate,
  readMotionEvent,
  readOrientationEvent,
  type GravityEstimate,
  type MotionSample,
} from './Level01Orientation';

export type Level01SensorSnapshot = {
  alpha: number;
  beta: number;
  gamma: number;
  rotationRate: number;
  acceleration: number;
  accelerationX: number;
  accelerationY: number;
  accelerationZ: number;
  rotationAlpha: number;
  rotationBeta: number;
  rotationGamma: number;
  receivedAt: number;
  fresh: boolean;
  calibrated: boolean;
};

const finite = (value: number | null | undefined, fallback = 0) => Number.isFinite(value) ? value as number : fallback;

/**
 * V3：越過死區後用短距離線性斜坡漸入，取代硬切為 0 → 全值的跳動。
 * threshold 內＝完全視為靜止；threshold ～ threshold+ramp 之間線性淡入；
 * 超過 threshold+ramp 才是完整數值。
 */
const deadZoneRamp = (value: number, threshold: number, ramp: number) => {
  const magnitude = Math.abs(value);
  if (magnitude <= threshold) return 0;
  const t = Math.min(1, (magnitude - threshold) / Math.max(ramp, 0.001));
  return value * t;
};

export class Level01SensorController {
  readonly calibration = new Level01CalibrationEngine();
  private readonly gravity: GravityEstimate = createGravityEstimate();
  private orientation = { alpha: 0, beta: 0, gamma: 0, receivedAt: -Infinity };
  private motion: MotionSample = { rotationRate: 0, acceleration: 0, receivedAt: -Infinity };
  private previousRaw: { alpha: number; beta: number; gamma: number; receivedAt: number } | null = null;
  private unwrappedAlpha = 0;
  private paused = false;

  beginCalibration(now: number) {
    this.calibration.reset(now);
    this.previousRaw = null;
    this.orientation = { alpha: 0, beta: 0, gamma: 0, receivedAt: -Infinity };
  }

  setPaused(paused: boolean) {
    this.paused = paused;
  }

  pushOrientationEvent(event: DeviceOrientationEvent, now: number) {
    if (this.paused) return;
    const raw = readOrientationEvent(event, now);
    if (!raw) return;
    const sanitized = {
      alpha: finite(raw.alpha),
      beta: Math.max(-180, Math.min(180, finite(raw.beta))),
      gamma: Math.max(-90, Math.min(90, finite(raw.gamma))),
      receivedAt: now,
    };
    if (this.previousRaw) {
      const dt = Math.max(1, now - this.previousRaw.receivedAt);
      const abruptTilt = Math.max(
        Math.abs(sanitized.beta - this.previousRaw.beta),
        Math.abs(sanitized.gamma - this.previousRaw.gamma),
      );
      if (dt < 80 && abruptTilt > SENSOR_SPIKE_THRESHOLD_DEG) return;
      this.unwrappedAlpha = unwrapAngle(this.unwrappedAlpha, sanitized.alpha);
    } else {
      this.unwrappedAlpha = sanitized.alpha;
    }
    this.previousRaw = sanitized;
    const continuous = { ...sanitized, alpha: this.unwrappedAlpha };
    if (!this.calibration.ready) this.calibration.push(continuous);
    const corrected = this.calibration.apply(continuous);
    // V3：跟物理層用同一套 deltaTime 補償公式，事件來得快（高 Hz 裝置）或慢都一致，
    // 不是固定 alpha 硬套在不同更新率的裝置上。
    const orientationDt = Math.max(1, now - this.orientation.receivedAt) / 1000;
    const smoothing = frameRateIndependentFactor(orientationDt, LOW_PASS_FACTOR);
    const alphaDelta = shortestAngleDelta(this.orientation.alpha, corrected.alpha);
    this.orientation.alpha += alphaDelta * smoothing;
    this.orientation.beta = lowPass(this.orientation.beta, deadZoneRamp(corrected.beta, SENSOR_DEAD_ZONE_DEG, SENSOR_DEAD_ZONE_RAMP_DEG), smoothing);
    this.orientation.gamma = lowPass(this.orientation.gamma, deadZoneRamp(corrected.gamma, SENSOR_DEAD_ZONE_DEG, SENSOR_DEAD_ZONE_RAMP_DEG), smoothing);
    this.orientation.receivedAt = now;
  }

  pushMotionEvent(event: DeviceMotionEvent, now: number) {
    if (this.paused) return;
    const sample = readMotionEvent(event, now, this.gravity);
    const motionDt = Math.max(1, now - this.motion.receivedAt) / 1000;
    const smoothing = frameRateIndependentFactor(motionDt, 0.18);
    this.motion = {
      rotationRate: lowPass(this.motion.rotationRate, deadZoneRamp(finite(sample.rotationRate), SENSOR_ROTATION_DEAD_ZONE, SENSOR_DEAD_ZONE_RAMP_DEG * 2), smoothing),
      acceleration: lowPass(this.motion.acceleration, deadZoneRamp(finite(sample.acceleration), 0.08, 0.05), smoothing),
      accelerationX: lowPass(this.motion.accelerationX ?? 0, finite(sample.accelerationX), smoothing),
      accelerationY: lowPass(this.motion.accelerationY ?? 0, finite(sample.accelerationY), smoothing),
      accelerationZ: lowPass(this.motion.accelerationZ ?? 0, finite(sample.accelerationZ), smoothing),
      rotationAlpha: lowPass(this.motion.rotationAlpha ?? 0, finite(sample.rotationAlpha), smoothing),
      rotationBeta: lowPass(this.motion.rotationBeta ?? 0, finite(sample.rotationBeta), smoothing),
      rotationGamma: lowPass(this.motion.rotationGamma ?? 0, finite(sample.rotationGamma), smoothing),
      receivedAt: now,
    };
  }

  snapshot(now: number): Level01SensorSnapshot {
    return {
      alpha: this.orientation.alpha,
      beta: this.orientation.beta,
      gamma: this.orientation.gamma,
      rotationRate: this.motion.rotationRate,
      acceleration: this.motion.acceleration,
      accelerationX: this.motion.accelerationX ?? 0,
      accelerationY: this.motion.accelerationY ?? 0,
      accelerationZ: this.motion.accelerationZ ?? 0,
      rotationAlpha: this.motion.rotationAlpha ?? 0,
      rotationBeta: this.motion.rotationBeta ?? 0,
      rotationGamma: this.motion.rotationGamma ?? 0,
      receivedAt: this.orientation.receivedAt,
      fresh: now - this.orientation.receivedAt < SENSOR_TIMEOUT_MS,
      calibrated: this.calibration.ready,
    };
  }
}
