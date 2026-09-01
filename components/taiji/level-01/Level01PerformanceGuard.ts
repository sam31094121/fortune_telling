import { PERFORMANCE_SAMPLE_MS } from './level01.constants';

export type Level01PerformanceMetrics = {
  fps: number;
  averageFrameMs: number;
  droppedFrames: number;
  longTasks: number;
  memoryPressure: boolean;
};

type MemoryPerformance = Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } };

export class Level01PerformanceGuard {
  private frameCount = 0;
  private frameTimeTotal = 0;
  private droppedFrames = 0;
  private longTasks = 0;
  private windowStartedAt = -1;
  private observer: PerformanceObserver | null = null;
  private metrics: Level01PerformanceMetrics = {
    fps: 60,
    averageFrameMs: 16.67,
    droppedFrames: 0,
    longTasks: 0,
    memoryPressure: false,
  };

  start() {
    if (this.observer || typeof PerformanceObserver === 'undefined') return;
    try {
      this.observer = new PerformanceObserver((list) => {
        this.longTasks += list.getEntries().filter((entry) => entry.duration >= 50).length;
      });
      this.observer.observe({ entryTypes: ['longtask'] });
    } catch {
      this.observer = null;
    }
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
  }

  recordFrame(deltaSeconds: number, now: number) {
    if (this.windowStartedAt < 0) this.windowStartedAt = now;
    const frameMs = Math.max(0, deltaSeconds * 1000);
    this.frameCount += 1;
    this.frameTimeTotal += frameMs;
    if (frameMs > 25) this.droppedFrames += Math.max(1, Math.round(frameMs / 16.67) - 1);
    if (now - this.windowStartedAt < PERFORMANCE_SAMPLE_MS) return null;

    const elapsed = Math.max(1, now - this.windowStartedAt);
    const memory = (performance as MemoryPerformance).memory;
    this.metrics = {
      fps: Math.max(1, Math.min(60, this.frameCount * 1000 / elapsed)),
      averageFrameMs: this.frameCount > 0 ? this.frameTimeTotal / this.frameCount : 16.67,
      droppedFrames: this.droppedFrames,
      longTasks: this.longTasks,
      memoryPressure: Boolean(memory && memory.jsHeapSizeLimit > 0 && memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.82),
    };
    this.frameCount = 0;
    this.frameTimeTotal = 0;
    this.droppedFrames = 0;
    this.longTasks = 0;
    this.windowStartedAt = now;
    return this.metrics;
  }

  snapshot() {
    return this.metrics;
  }
}
