import {
  LOW_PASS_FACTOR,
  SENSOR_DEAD_ZONE_DEG,
  SENSOR_ROTATION_DEAD_ZONE,
  SENSOR_SPIKE_THRESHOLD_DEG,
  SENSOR_TIMEOUT_MS,
} from './level01.constants';
import { Level01CalibrationEngine } from './Level01Calibration';
import { lowPass, shortestAngleDelta, unwrapAngle } from './Level01Physics';
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
  receivedAt: number;
  fresh: boolean;
  calibrated: boolean;
};

const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
const deadZone = (value: number, threshold: number) => Math.abs(value) < threshold ? 0 : value;

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
    const alphaDelta = shortestAngleDelta(this.orientation.alpha, corrected.alpha);
    this.orientation.alpha += alphaDelta * LOW_PASS_FACTOR;
    this.orientation.beta = lowPass(this.orientation.beta, deadZone(corrected.beta, SENSOR_DEAD_ZONE_DEG));
    this.orientation.gamma = lowPass(this.orientation.gamma, deadZone(corrected.gamma, SENSOR_DEAD_ZONE_DEG));
    this.orientation.receivedAt = now;
  }

  pushMotionEvent(event: DeviceMotionEvent, now: number) {
    if (this.paused) return;
    const sample = readMotionEvent(event, now, this.gravity);
    this.motion = {
      rotationRate: lowPass(this.motion.rotationRate, deadZone(finite(sample.rotationRate), SENSOR_ROTATION_DEAD_ZONE), 0.18),
      acceleration: lowPass(this.motion.acceleration, deadZone(finite(sample.acceleration), 0.08), 0.18),
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
      receivedAt: this.orientation.receivedAt,
      fresh: now - this.orientation.receivedAt < SENSOR_TIMEOUT_MS,
      calibrated: this.calibration.ready,
    };
  }
}
