/**
 * 鬼魅阿修羅客戶端驗證器
 *
 * 在前端（手機、平板、電腦）上運行
 * 與後端 API 通信來驗證三端一致性
 */

import type {
  AsuraDisplayModelV1,
  CrossDeviceValidationResult,
} from './ghost-asura-cross-device-validator';

export interface ClientValidationOptions {
  apiUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface ClientValidationResponse {
  status: 'PASSED' | 'FAILED';
  consistent: boolean;
  result: CrossDeviceValidationResult;
  formatted: string;
  timestamp: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

/**
 * 偵測裝置類型
 */
export function detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  // 瀏覽器環境
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  const ua = navigator.userAgent.toLowerCase();
  const viewportWidth = window.innerWidth;

  // 檢查 user agent
  if (/mobile|android|iphone|ipod/.test(ua) && viewportWidth < 768) {
    return 'mobile';
  }

  if (/ipad|tablet|android/.test(ua) && viewportWidth >= 768 && viewportWidth < 1024) {
    return 'tablet';
  }

  // 根據視窗寬度判斷
  if (viewportWidth < 768) {
    return 'mobile';
  }

  if (viewportWidth < 1024) {
    return 'tablet';
  }

  return 'desktop';
}

/**
 * 驗證三端一致性（客戶端）
 */
export async function validateCrossDeviceOnClient(
  clientInputHash: string,
  backendVersion: string,
  skillVersion: string,
  mobileData: AsuraDisplayModelV1[],
  tabletData: AsuraDisplayModelV1[],
  desktopData: AsuraDisplayModelV1[],
  options: ClientValidationOptions = {}
): Promise<ClientValidationResponse> {
  const apiUrl =
    options.apiUrl || '/api/ghost-asura/validate-consistency';
  const timeout = options.timeout || 10000;

  const payload = {
    clientInputHash,
    backendVersion,
    skillVersion,
    mobileData,
    tabletData,
    desktopData,
  };

  let lastError: Error | null = null;
  const maxRetries = options.retries ?? 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `API error: ${errorData.error || response.statusText}`
        );
      }

      const data = await response.json();

      return {
        status: data.status,
        consistent: data.consistent,
        result: data.result,
        formatted: data.formatted,
        timestamp: Date.now(),
        deviceType: detectDeviceType(),
      };
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error('Unknown error during validation');

      if (attempt < maxRetries) {
        // 重試前等待
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1))
        );
      }
    }
  }

  throw lastError || new Error('Validation failed after all retries');
}

/**
 * 批量驗證多個資料集合
 */
export async function batchValidateDevices(
  datasets: Array<{
    label: string;
    clientInputHash: string;
    backendVersion: string;
    skillVersion: string;
    mobileData: AsuraDisplayModelV1[];
    tabletData: AsuraDisplayModelV1[];
    desktopData: AsuraDisplayModelV1[];
  }>,
  options: ClientValidationOptions = {}
): Promise<Array<ClientValidationResponse & { label: string }>> {
  const results: Array<ClientValidationResponse & { label: string }> = [];

  for (const dataset of datasets) {
    try {
      const result = await validateCrossDeviceOnClient(
        dataset.clientInputHash,
        dataset.backendVersion,
        dataset.skillVersion,
        dataset.mobileData,
        dataset.tabletData,
        dataset.desktopData,
        options
      );

      results.push({
        ...result,
        label: dataset.label,
      });
    } catch (error) {
      results.push({
        status: 'FAILED',
        consistent: false,
        result: {
          clientInputHash: dataset.clientInputHash,
          backendVersion: dataset.backendVersion,
          skillVersion: dataset.skillVersion,
          mobileHash: '',
          tabletHash: '',
          desktopHash: '',
          isConsistent: false,
          inconsistencies: [
            error instanceof Error ? error.message : 'Unknown error',
          ],
          mobileData: {
            hitCount: dataset.mobileData.length,
            asuraIds: [],
            displayNames: [],
          },
          tabletData: {
            hitCount: dataset.tabletData.length,
            asuraIds: [],
            displayNames: [],
          },
          desktopData: {
            hitCount: dataset.desktopData.length,
            asuraIds: [],
            displayNames: [],
          },
          timestamp: Date.now(),
        },
        formatted: `驗證失敗: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        deviceType: detectDeviceType(),
        label: dataset.label,
      });
    }
  }

  return results;
}

/**
 * 監控儀表板資料格式
 */
export interface DashboardMetrics {
  totalValidations: number;
  passedValidations: number;
  failedValidations: number;
  successRate: number;
  averageResponseTime: number;
  lastValidationTime: number;
  devicesTestedOnCurrentSession: Set<'mobile' | 'tablet' | 'desktop'>;
}

/**
 * 簡單的驗證指標追蹤
 */
export class ValidationMetricsTracker {
  private metrics: DashboardMetrics = {
    totalValidations: 0,
    passedValidations: 0,
    failedValidations: 0,
    successRate: 0,
    averageResponseTime: 0,
    lastValidationTime: 0,
    devicesTestedOnCurrentSession: new Set(),
  };

  private responseTimes: number[] = [];

  recordValidation(
    response: ClientValidationResponse,
    responseTime: number
  ): void {
    this.metrics.totalValidations++;

    if (response.consistent) {
      this.metrics.passedValidations++;
    } else {
      this.metrics.failedValidations++;
    }

    this.metrics.devicesTestedOnCurrentSession.add(response.deviceType);
    this.metrics.lastValidationTime = Date.now();
    this.responseTimes.push(responseTime);

    // 計算平均回應時間
    this.metrics.averageResponseTime =
      this.responseTimes.reduce((a, b) => a + b, 0) /
      this.responseTimes.length;

    // 計算成功率
    this.metrics.successRate =
      this.metrics.totalValidations > 0
        ? (this.metrics.passedValidations / this.metrics.totalValidations) *
          100
        : 0;
  }

  getMetrics(): DashboardMetrics {
    return {
      ...this.metrics,
      devicesTestedOnCurrentSession: new Set(
        this.metrics.devicesTestedOnCurrentSession
      ),
    };
  }

  reset(): void {
    this.metrics = {
      totalValidations: 0,
      passedValidations: 0,
      failedValidations: 0,
      successRate: 0,
      averageResponseTime: 0,
      lastValidationTime: 0,
      devicesTestedOnCurrentSession: new Set(),
    };
    this.responseTimes = [];
  }
}
