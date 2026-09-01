import type { QualityLevel } from './Level01Runtime';

export type Level01TelemetrySnapshot = {
  sensorAvailable: boolean;
  permissionResult: 'idle' | 'granted' | 'denied' | 'unsupported';
  qualityLevel: QualityLevel;
  averageFPS: number;
  fallbackUsed: boolean;
  completionSuccess: boolean;
};

/** In-memory engineering telemetry only. It never stores or sends raw sensor samples. */
export class Level01Telemetry {
  private value: Level01TelemetrySnapshot = {
    sensorAvailable: false,
    permissionResult: 'idle',
    qualityLevel: 'BALANCED',
    averageFPS: 60,
    fallbackUsed: false,
    completionSuccess: false,
  };

  update(next: Partial<Level01TelemetrySnapshot>) {
    this.value = { ...this.value, ...next };
  }

  snapshot() {
    return { ...this.value };
  }
}
