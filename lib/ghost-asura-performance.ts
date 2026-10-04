/**
 * 鬼魅阿修羅 - 性能優化
 * Phase 9：動畫性能 + 包大小縮減
 */

export const performanceConfig = {
  // 動畫性能優化
  animationOptimize: {
    useGPU: true,           // 啟用硬體加速
    reduceFrameRate: false, // 根據設備調整幀率
    willChange: true,       // 優化渲染性能
    debounceResize: 300,    // 防抖窗口大小改變
  },

  // 包大小優化
  bundleOptimize: {
    enabled: true,
    treeshaking: true,      // 移除未使用代碼
    minification: true,     // 最小化代碼
    compression: 'gzip',    // Gzip 壓縮
  },

  // 加載速度優化
  loadOptimize: {
    lazyLoadImages: true,
    preloadCritical: true,
    codeSpitting: true,
    resourceHints: ['preconnect', 'dns-prefetch'],
  },

  // 內存管理
  memoryManage: {
    poolParticles: true,     // 粒子對象池
    cacheAnimations: true,   // 緩存動畫配置
    debounceEvents: true,
    maxParticles: 500,       // 最大粒子數
  },
};

/**
 * 計算目標幀率
 */
export function getTargetFrameRate(): number {
  if (!performanceConfig.animationOptimize.reduceFrameRate) return 60;

  // 根據設備能力調整
  const connection = (navigator as any).connection;
  if (connection?.effectiveType === '4g') return 60;
  if (connection?.effectiveType === '3g') return 30;

  return 60;
}

/**
 * 啟用 GPU 加速樣式
 */
export function getGPUAcceleratedStyle(): React.CSSProperties {
  if (!performanceConfig.animationOptimize.useGPU) return {};

  return {
    willChange: 'transform, opacity',
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
  };
}

/**
 * 計算粒子池大小
 */
export function getParticlePoolSize(): number {
  if (!performanceConfig.memoryManage.poolParticles) {
    return performanceConfig.memoryManage.maxParticles;
  }

  // 根據可用內存調整
  const memory = (performance as any).memory;
  if (memory?.jsHeapSizeLimit) {
    const ratio = memory.jsHeapSizeLimit / (100 * 1024 * 1024); // 100MB 基準
    return Math.floor(performanceConfig.memoryManage.maxParticles * ratio);
  }

  return performanceConfig.memoryManage.maxParticles;
}

/**
 * 計算防抖延遲
 */
export function getDebounceDelay(type: 'resize' | 'scroll' | 'input'): number {
  switch (type) {
    case 'resize':
      return performanceConfig.animationOptimize.debounceResize;
    case 'scroll':
      return 100;
    case 'input':
      return 200;
    default:
      return 150;
  }
}

/**
 * 報告性能指標
 */
export function reportPerformanceMetrics(): void {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log(`[Performance] ${entry.name}: ${entry.duration.toFixed(2)}ms`);
        }
      });

      observer.observe({ entryTypes: ['navigation', 'resource', 'paint', 'largest-contentful-paint'] });
    } catch (e) {
      console.warn('[Performance] PerformanceObserver not supported');
    }
  }
}
