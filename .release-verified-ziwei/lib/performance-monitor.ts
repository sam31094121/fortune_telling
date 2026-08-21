/**
 * 性能監控和穩定性追蹤
 * 幫助識別和解決潛在的性能問題
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  type: 'api' | 'render' | 'network' | 'other';
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 100; // 保持最多 100 個指標

  recordMetric(name: string, duration: number, type: PerformanceMetric['type'] = 'other') {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      type,
    };

    this.metrics.push(metric);

    // 保持 metrics 陣列大小
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // 如果耗時超過 3 秒，記錄警告
    if (duration > 3000) {
      console.warn(
        `[Performance Warning] ${name} took ${(duration / 1000).toFixed(2)}s`,
      );
    }
  }

  getAverageTime(type?: PerformanceMetric['type']): number {
    const filtered = type
      ? this.metrics.filter(m => m.type === type)
      : this.metrics;

    if (filtered.length === 0) return 0;

    const total = filtered.reduce((sum, m) => sum + m.duration, 0);
    return total / filtered.length;
  }

  getMetrics() {
    return {
      totalCount: this.metrics.length,
      averageTime: this.getAverageTime(),
      apiAverageTime: this.getAverageTime('api'),
      renderAverageTime: this.getAverageTime('render'),
      slowestMetrics: [...this.metrics]
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5),
    };
  }

  clear() {
    this.metrics = [];
  }
}

// 導出全局監控實例
export const performanceMonitor = new PerformanceMonitor();

// API 調用計時器
export function measureApiCall<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  return fn()
    .then(result => {
      const duration = performance.now() - start;
      performanceMonitor.recordMetric(name, duration, 'api');
      return result;
    })
    .catch(error => {
      const duration = performance.now() - start;
      performanceMonitor.recordMetric(`${name} [ERROR]`, duration, 'api');
      throw error;
    });
}
