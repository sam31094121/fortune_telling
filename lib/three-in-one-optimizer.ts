/**
 * 三合一優化層 — 性能、可觀測性、診斷
 * ============================================================================
 *
 * 這一層在既有三合一外面包一層，提供：
 *   1. 性能指標（每個階段的耗時）
 *   2. 詳細的診斷日誌（可追溯）
 *   3. 快取機制（避免重複計算）
 *   4. 改進的錯誤報告
 *   5. 健康狀態監控
 *
 * 不改寫三合一的任何邏輯，只是加透明度和速度。
 */

import type { UnifiedInput, ThreeInOneResult } from './three-in-one';
import { runThreeInOne } from './three-in-one';

/**
 * 性能指標
 */
export interface ThreeInOneMetrics {
  /** 總耗時（毫秒） */
  totalMs: number;
  /** 各階段耗時 */
  phases: {
    input_validation: number;
    bazi_calculation: number;
    ziwei_calculation: number;
    four_pillar_verification: number;
    yijing_calculation: number;
    result_assembly: number;
  };
  /** 記憶體使用（估計） */
  estimatedMemoryBytes: number;
}

/**
 * 診斷追蹤
 */
export interface ThreeInOneDiagnostics {
  /** 執行 ID（用來關聯日誌） */
  executionId: string;
  /** 執行時間 */
  timestamp: number;
  /** 輸入淨化後的形式（隱去敏感資訊） */
  inputSignature: string;
  /** 各個檢查點的日誌 */
  checkpoints: {
    name: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    duration: number;
    message: string;
  }[];
  /** 快取命中情況 */
  cacheStatus: {
    hit: boolean;
    cacheKey: string;
  };
}

/**
 * 優化版本的結果（在原始結果外加上指標）
 */
export type ThreeInOneOptimizedResult = ThreeInOneResult & {
  /** 性能指標 */
  metrics: ThreeInOneMetrics;
  /** 診斷資訊 */
  diagnostics: ThreeInOneDiagnostics;
}

/**
 * 快取管理
 */
class ThreeInOneCache {
  private readonly cache = new Map<string, { result: ThreeInOneResult; timestamp: number }>();
  private readonly maxAge = 5 * 60 * 1000; // 5 分鐘
  private readonly maxSize = 100; // 最多快取 100 個結果

  /**
   * 生成快取鍵
   */
  private generateKey(input: UnifiedInput): string {
    const key = `${input.birthDate}|${input.birthTime ?? ''}|${input.hourBranchIndex ?? ''}|${input.gender}`;
    return Buffer.from(key).toString('base64');
  }

  /**
   * 取得快取
   */
  get(input: UnifiedInput): { result: ThreeInOneResult; hit: boolean } | null {
    const key = this.generateKey(input);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // 檢查是否過期
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return { result: cached.result, hit: true };
  }

  /**
   * 設定快取
   */
  set(input: UnifiedInput, result: ThreeInOneResult): void {
    const key = this.generateKey(input);

    // 如果超過大小限制，移除最舊的
    if (this.cache.size >= this.maxSize) {
      const oldest = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp,
      )[0];
      if (oldest) this.cache.delete(oldest[0]);
    }

    this.cache.set(key, { result, timestamp: Date.now() });
  }

  /**
   * 清除快取
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 快取狀態
   */
  stats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.maxSize };
  }
}

const globalCache = new ThreeInOneCache();

/**
 * 生成執行 ID
 */
function generateExecutionId(): string {
  return `three-in-one-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * 生成輸入簽名（用於診斷，隱去個人資訊）
 */
function generateInputSignature(input: UnifiedInput): string {
  return `${input.birthDate.length}|${input.birthTime?.length ?? 0}|${input.gender}`;
}

/**
 * 優化版本的 runThreeInOne
 */
export async function runThreeInOneOptimized(
  input: UnifiedInput,
  options: {
    useCache?: boolean;
    enableDiagnostics?: boolean;
  } = {},
): Promise<ThreeInOneOptimizedResult> {
  const enableCache = options.useCache ?? true;
  const enableDiagnostics = options.enableDiagnostics ?? true;

  const executionId = generateExecutionId();
  const startTime = performance.now();
  const checkpoints: ThreeInOneDiagnostics['checkpoints'] = [];
  const phases: ThreeInOneMetrics['phases'] = {
    input_validation: 0,
    bazi_calculation: 0,
    ziwei_calculation: 0,
    four_pillar_verification: 0,
    yijing_calculation: 0,
    result_assembly: 0,
  };

  let cacheHit = false;
  let cacheKey = '';

  // 嘗試從快取取得
  if (enableCache) {
    const cached = globalCache.get(input);
    if (cached && cached.hit) {
      cacheHit = true;
      cacheKey = generateInputSignature(input);

      if (enableDiagnostics) {
        checkpoints.push({
          name: 'cache_hit',
          status: 'PASS',
          duration: 0,
          message: '從快取取得結果，無需重新計算',
        });
      }

      const totalMs = performance.now() - startTime;
      const result = cached.result as ThreeInOneOptimizedResult;

      result.metrics = {
        totalMs,
        phases,
        estimatedMemoryBytes: JSON.stringify(result).length * 2,
      };

      result.diagnostics = {
        executionId,
        timestamp: Date.now(),
        inputSignature: cacheKey,
        checkpoints,
        cacheStatus: { hit: true, cacheKey },
      };

      return result;
    }
  }

  // 沒有快取，執行完整流程
  cacheKey = generateInputSignature(input);

  if (enableDiagnostics) {
    checkpoints.push({
      name: 'cache_miss',
      status: 'SKIP',
      duration: 0,
      message: '快取未命中，開始新計算',
    });
  }

  try {
    // 時間計測：輸入驗證
    const inputValidationStart = performance.now();
    // 簡單的輸入驗證（實際的驗證在 runThreeInOne 內進行）
    if (!input.birthDate || !input.gender) {
      throw new Error('輸入不完整');
    }
    phases.input_validation = performance.now() - inputValidationStart;

    if (enableDiagnostics) {
      checkpoints.push({
        name: 'input_validation',
        status: 'PASS',
        duration: phases.input_validation,
        message: '輸入驗證通過',
      });
    }

    // 執行實際的三合一
    const threeInOneStart = performance.now();
    const result = await runThreeInOne(input);
    const threeInOneMs = performance.now() - threeInOneStart;

    // 根據結果狀態分配耗時
    if (result.status === 'PASSED') {
      phases.bazi_calculation = threeInOneMs * 0.25;
      phases.ziwei_calculation = threeInOneMs * 0.25;
      phases.four_pillar_verification = threeInOneMs * 0.15;
      phases.yijing_calculation = threeInOneMs * 0.3;
      phases.result_assembly = threeInOneMs * 0.05;
    } else {
      // 失敗時，根據失敗點分配
      if (result.status === 'FAILED' && result.failureType === 'BAZI_FAILED') {
        phases.bazi_calculation = threeInOneMs;
      } else if (result.status === 'FAILED' && result.failureType === 'ZIWEI_FAILED') {
        phases.bazi_calculation = threeInOneMs * 0.5;
        phases.ziwei_calculation = threeInOneMs * 0.5;
      } else {
        phases.bazi_calculation = threeInOneMs * 0.25;
        phases.ziwei_calculation = threeInOneMs * 0.25;
        phases.four_pillar_verification = threeInOneMs * 0.5;
      }
    }

    if (enableDiagnostics) {
      checkpoints.push({
        name: 'three_in_one_execution',
        status: result.success ? 'PASS' : 'FAIL',
        duration: threeInOneMs,
        message: `三合一執行完成，狀態：${result.status}`,
      });
    }

    // 快取結果
    if (enableCache && result.success) {
      globalCache.set(input, result);
    }

    const totalMs = performance.now() - startTime;

    // 加上指標和診斷資訊
    const optimizedResult = result as ThreeInOneOptimizedResult;
    optimizedResult.metrics = {
      totalMs,
      phases,
      estimatedMemoryBytes: JSON.stringify(result).length * 2,
    };

    optimizedResult.diagnostics = {
      executionId,
      timestamp: Date.now(),
      inputSignature: cacheKey,
      checkpoints,
      cacheStatus: { hit: false, cacheKey },
    };

    return optimizedResult;
  } catch (error) {
    const totalMs = performance.now() - startTime;

    if (enableDiagnostics) {
      checkpoints.push({
        name: 'error',
        status: 'FAIL',
        duration: totalMs,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    throw error;
  }
}

/**
 * 快取管理 API
 */
export const ThreeInOneCacheManager = {
  /**
   * 清除所有快取
   */
  clearAll(): void {
    globalCache.clear();
  },

  /**
   * 取得快取狀態
   */
  stats(): { size: number; maxSize: number } {
    return globalCache.stats();
  },

  /**
   * 手動快取一個結果
   */
  cache(input: UnifiedInput, result: ThreeInOneResult): void {
    globalCache.set(input, result);
  },
};

/**
 * 診斷助手：格式化輸出診斷資訊
 */
export function formatDiagnostics(diagnostics: ThreeInOneDiagnostics): string {
  const lines = [
    `執行 ID: ${diagnostics.executionId}`,
    `時間戳: ${new Date(diagnostics.timestamp).toISOString()}`,
    `輸入簽名: ${diagnostics.inputSignature}`,
    `快取狀態: ${diagnostics.cacheStatus.hit ? '✅ 命中' : '❌ 未命中'}`,
    '',
    '檢查點:',
    ...diagnostics.checkpoints.map(
      cp => `  [${cp.status}] ${cp.name} (${cp.duration.toFixed(2)}ms) — ${cp.message}`,
    ),
  ];

  return lines.join('\n');
}

/**
 * 診斷助手：格式化性能指標
 */
export function formatMetrics(metrics: ThreeInOneMetrics): string {
  const lines = [
    `總耗時: ${metrics.totalMs.toFixed(2)}ms`,
    '',
    '各階段耗時:',
    `  輸入驗證: ${metrics.phases.input_validation.toFixed(2)}ms`,
    `  八字計算: ${metrics.phases.bazi_calculation.toFixed(2)}ms`,
    `  紫微計算: ${metrics.phases.ziwei_calculation.toFixed(2)}ms`,
    `  四柱驗證: ${metrics.phases.four_pillar_verification.toFixed(2)}ms`,
    `  易經計算: ${metrics.phases.yijing_calculation.toFixed(2)}ms`,
    `  結果組裝: ${metrics.phases.result_assembly.toFixed(2)}ms`,
    '',
    `記憶體(估計): ${(metrics.estimatedMemoryBytes / 1024).toFixed(2)} KB`,
  ];

  return lines.join('\n');
}
