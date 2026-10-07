/**
 * 鬼魅阿修羅跨設備監控儀表板
 *
 * 顯示三端（手機、平板、電腦）驗證結果
 * 即時監控數據一致性
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  detectDeviceType,
  validateCrossDeviceOnClient,
  ValidationMetricsTracker,
  type ClientValidationResponse,
} from '@/lib/ghost-asura-client-validator';
import styles from './monitor.module.css';

export default function CrossDeviceMonitorPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ClientValidationResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [metricsTracker] = useState(() => new ValidationMetricsTracker());
  const [metrics, setMetrics] = useState(metricsTracker.getMetrics());
  const [currentDevice] = useState(() => detectDeviceType());

  const handleValidate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const startTime = performance.now();

      // 示例數據 - 在實際應用中應從後端獲取
      const response = await validateCrossDeviceOnClient(
        'test_input_2026_10_07',
        '1.0.0',
        '2.0.0',
        [], // mobileData
        [], // tabletData
        [], // desktopData
        { timeout: 15000 }
      );

      const responseTime = performance.now() - startTime;

      metricsTracker.recordValidation(response, responseTime);
      setResults(response);
      setMetrics(metricsTracker.getMetrics());
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [metricsTracker]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>🔐 鬼魅阿修羅跨設備監控</h1>
        <p>即時驗證三端數據一致性</p>
      </header>

      <section className={styles.deviceInfo}>
        <div className={styles.card}>
          <h2>當前設備</h2>
          <div className={styles.deviceType}>
            {currentDevice === 'mobile' && '📱 手機'}
            {currentDevice === 'tablet' && '📱 平板'}
            {currentDevice === 'desktop' && '💻 電腦'}
          </div>
          <p className={styles.smallText}>
            視窗寬度: {typeof window !== 'undefined' ? window.innerWidth : 'N/A'}px
          </p>
        </div>
      </section>

      <section className={styles.controls}>
        <button
          onClick={handleValidate}
          disabled={isLoading}
          className={styles.button}
        >
          {isLoading ? '驗證中...' : '開始驗證'}
        </button>
      </section>

      {error && (
        <section className={styles.error}>
          <h3>❌ 錯誤</h3>
          <pre>{error}</pre>
        </section>
      )}

      {results && (
        <section className={styles.results}>
          <div className={styles.card}>
            <h2>✅ 驗證結果</h2>

            <div className={styles.statusGrid}>
              <div className={styles.statusItem}>
                <span className={styles.label}>狀態</span>
                <span
                  className={`${styles.value} ${
                    results.consistent ? styles.success : styles.failure
                  }`}
                >
                  {results.consistent ? '一致' : '不一致'}
                </span>
              </div>

              <div className={styles.statusItem}>
                <span className={styles.label}>Mobile Hash</span>
                <span className={styles.hash}>
                  {results.result.mobileHash.slice(0, 16)}...
                </span>
              </div>

              <div className={styles.statusItem}>
                <span className={styles.label}>Tablet Hash</span>
                <span className={styles.hash}>
                  {results.result.tabletHash.slice(0, 16)}...
                </span>
              </div>

              <div className={styles.statusItem}>
                <span className={styles.label}>Desktop Hash</span>
                <span className={styles.hash}>
                  {results.result.desktopHash.slice(0, 16)}...
                </span>
              </div>
            </div>

            {results.result.inconsistencies.length > 0 && (
              <div className={styles.inconsistencies}>
                <h3>不一致詳情</h3>
                <ul>
                  {results.result.inconsistencies.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2>📊 詳細信息</h2>
            <pre className={styles.formatted}>{results.formatted}</pre>
          </div>
        </section>
      )}

      <section className={styles.metrics}>
        <div className={styles.card}>
          <h2>📈 驗證指標</h2>

          <div className={styles.metricsGrid}>
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>總驗證次數</span>
              <span className={styles.metricValue}>
                {metrics.totalValidations}
              </span>
            </div>

            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>成功</span>
              <span className={styles.metricValue}>
                {metrics.passedValidations}
              </span>
            </div>

            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>失敗</span>
              <span className={styles.metricValue}>
                {metrics.failedValidations}
              </span>
            </div>

            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>成功率</span>
              <span className={styles.metricValue}>
                {metrics.successRate.toFixed(1)}%
              </span>
            </div>

            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>平均回應時間</span>
              <span className={styles.metricValue}>
                {metrics.averageResponseTime.toFixed(0)}ms
              </span>
            </div>

            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>測試裝置</span>
              <span className={styles.metricValue}>
                {metrics.devicesTestedOnCurrentSession.size}/3
              </span>
            </div>
          </div>

          <div className={styles.devicesList}>
            <p>本次會話測試的裝置：</p>
            <ul>
              <li>
                {metrics.devicesTestedOnCurrentSession.has('mobile')
                  ? '✓'
                  : '○'}{' '}
                手機
              </li>
              <li>
                {metrics.devicesTestedOnCurrentSession.has('tablet')
                  ? '✓'
                  : '○'}{' '}
                平板
              </li>
              <li>
                {metrics.devicesTestedOnCurrentSession.has('desktop')
                  ? '✓'
                  : '○'}{' '}
                電腦
              </li>
            </ul>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>規範 #30-33：三端一致性驗證系統</p>
      </footer>
    </div>
  );
}
