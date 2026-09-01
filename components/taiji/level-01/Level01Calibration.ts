import {
  SENSOR_CALIBRATION_MAX_MS,
  SENSOR_CALIBRATION_MIN_MS,
  SENSOR_CALIBRATION_MIN_SAMPLES,
} from './level01.constants';

export type Level01CalibrationBaseline = { alpha: number; beta: number; gamma: number };
export type Level01CalibrationSample = Level01CalibrationBaseline & { receivedAt: number };

export class Level01CalibrationEngine {
  private samples: Level01CalibrationSample[] = [];
  private startedAt = -1;
  private baseline: Level01CalibrationBaseline | null = null;

  reset(now = -1) {
    this.samples = [];
    this.startedAt = now;
    this.baseline = null;
  }

  push(sample: Level01CalibrationSample) {
    if (this.startedAt < 0) this.startedAt = sample.receivedAt;
    if (sample.receivedAt - this.startedAt > SENSOR_CALIBRATION_MAX_MS && this.samples.length > 0) {
      return this.finish();
    }
    const last = this.samples[this.samples.length - 1];
    if (last && Math.hypot(sample.beta - last.beta, sample.gamma - last.gamma) > 12) return this.baseline;
    this.samples.push(sample);
    const elapsed = sample.receivedAt - this.startedAt;
    if (elapsed >= SENSOR_CALIBRATION_MIN_MS && this.samples.length >= SENSOR_CALIBRATION_MIN_SAMPLES) {
      return this.finish();
    }
    return this.baseline;
  }

  get ready() {
    return this.baseline !== null;
  }

  get value() {
    return this.baseline;
  }

  apply(sample: Level01CalibrationBaseline): Level01CalibrationBaseline {
    if (!this.baseline) return { alpha: 0, beta: 0, gamma: 0 };
    return {
      alpha: sample.alpha - this.baseline.alpha,
      beta: sample.beta - this.baseline.beta,
      gamma: sample.gamma - this.baseline.gamma,
    };
  }

  private finish() {
    if (this.samples.length === 0) return this.baseline;
    const orderedBeta = this.samples.map((sample) => sample.beta).sort((a, b) => a - b);
    const orderedGamma = this.samples.map((sample) => sample.gamma).sort((a, b) => a - b);
    const middle = Math.floor(this.samples.length / 2);
    this.baseline = {
      alpha: this.samples.reduce((sum, sample) => sum + sample.alpha, 0) / this.samples.length,
      beta: orderedBeta[middle],
      gamma: orderedGamma[middle],
    };
    return this.baseline;
  }
}
