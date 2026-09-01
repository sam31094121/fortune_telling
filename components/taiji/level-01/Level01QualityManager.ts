import {
  QUALITY_CRITICAL_FPS,
  QUALITY_DEGRADE_FPS,
  QUALITY_DEGRADE_HOLD_MS,
  QUALITY_RECOVER_FPS,
  QUALITY_RECOVER_HOLD_MS,
} from './level01.constants';
import type { Level01PerformanceMetrics } from './Level01PerformanceGuard';
import type { QualityLevel } from './Level01Runtime';

const ORDER: QualityLevel[] = ['LOW', 'BALANCED', 'HIGH', 'ULTRA'];

export function detectLevel01Quality(): QualityLevel {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return 'BALANCED';
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (memory <= 2 || cores <= 2) return 'LOW';
  if (memory <= 4 || cores <= 4 || window.devicePixelRatio > 2.6) return 'BALANCED';
  if (memory >= 8 && cores >= 8 && window.devicePixelRatio <= 2) return 'ULTRA';
  return 'HIGH';
}

export class Level01QualityManager {
  quality: QualityLevel = detectLevel01Quality();
  private degradedSince = -1;
  private recoveredSince = -1;

  update(metrics: Level01PerformanceMetrics, now: number) {
    const critical = metrics.fps < QUALITY_CRITICAL_FPS || metrics.memoryPressure || metrics.longTasks >= 3;
    const degraded = metrics.fps < QUALITY_DEGRADE_FPS || metrics.longTasks > 0 || metrics.droppedFrames > 12;
    if (critical) {
      this.quality = 'LOW';
      this.degradedSince = now;
      this.recoveredSince = -1;
      return this.quality;
    }
    if (degraded) {
      if (this.degradedSince < 0) this.degradedSince = now;
      this.recoveredSince = -1;
      if (now - this.degradedSince >= QUALITY_DEGRADE_HOLD_MS) this.step(-1);
      return this.quality;
    }
    this.degradedSince = -1;
    if (metrics.fps >= QUALITY_RECOVER_FPS && metrics.longTasks === 0 && !metrics.memoryPressure) {
      if (this.recoveredSince < 0) this.recoveredSince = now;
      if (now - this.recoveredSince >= QUALITY_RECOVER_HOLD_MS) {
        this.step(1);
        this.recoveredSince = now;
      }
    } else {
      this.recoveredSince = -1;
    }
    return this.quality;
  }

  private step(direction: -1 | 1) {
    const index = ORDER.indexOf(this.quality);
    this.quality = ORDER[Math.max(0, Math.min(ORDER.length - 1, index + direction))];
  }
}
