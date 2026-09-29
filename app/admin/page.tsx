'use client';

import { FormEvent, useState, useEffect } from 'react';
import styles from './admin.module.css';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [ipStatus, setIpStatus] = useState('檢查中...');

  useEffect(() => {
    // 檢查是否已登入
    checkLoginStatus();
    // 檢查 IP 白名單狀態
    checkIPStatus();
  }, []);

  async function checkIPStatus() {
    try {
      const response = await fetch('/api/admin/ip-check');
      const data = await response.json();
      setIpStatus(
        data.authorized
          ? `✅ 授權 IP: ${data.clientIP}`
          : `❌ 未授權 IP: ${data.clientIP}`
      );
    } catch (err) {
      setIpStatus('⚠️ 無法檢查 IP');
    }
  }

  async function checkLoginStatus() {
    try {
      const response = await fetch('/api/admin/dual-chart-logs');
      if (response.ok) {
        setIsLoggedIn(true);
        const data = await response.json();
        setLogs(data.data ?? []);
      }
    } catch (err) {
      // 未登入
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '登入失敗');
      }

      setPassword('');
      setIsLoggedIn(true);
      await checkLoginStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : '連線失敗');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      setIsLoggedIn(false);
      setLogs([]);
      setSelectedLog(null);
      setSelectedLogId(null);
    } catch (err) {
      setError('登出失敗');
    }
  }

  async function viewLogDetails(logId: string) {
    if (selectedLogId === logId && selectedLog) {
      setSelectedLog(null);
      setSelectedLogId(null);
      return;
    }

    try {
      const response = await fetch('/api/admin/dual-chart-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: logId }),
      });

      if (!response.ok) throw new Error('取得詳情失敗');

      const data = await response.json();
      setSelectedLogId(logId);
      setSelectedLog(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '取得詳情失敗');
    }
  }

  if (!isLoggedIn) {
    return (
      <div className={styles.container}>
        <div className={styles.loginCard}>
          <h1>🔐 管理員後台</h1>
          <p className={styles.subtitle}>製作過程、來源授權、著作權信息（客戶不可見）</p>

          <div className={styles.ipStatus}>{ipStatus}</div>

          <form onSubmit={handleLogin}>
            <div className={styles.formGroup}>
              <label>管理員密碼</label>
              <div className={styles.passwordInput}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="輸入管理員密碼"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.toggleBtn}
                >
                  {showPassword ? '隱藏' : '顯示'}
                </button>
              </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button type="submit" disabled={isLoading} className={styles.submitBtn}>
              {isLoading ? '驗證中...' : '登入'}
            </button>
          </form>

          <p className={styles.warning}>
            ⚠️ 只有授權的 IP 地址可以存取此頁面。
            <br />
            在其他位置無法登入，即使擁有密碼。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <h1>📊 管理員儀表板</h1>
          <div className={styles.headerControls}>
            <span className={styles.ipStatus}>{ipStatus}</span>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              登出
            </button>
          </div>
        </div>

        <div className={styles.content}>
          <section className={styles.logsSection}>
            <h2>命盤製作日誌（{logs.length}）</h2>

            {logs.length === 0 ? (
              <p className={styles.empty}>暫無日誌記錄</p>
            ) : (
              <div className={styles.logsList}>
                {logs.map(log => (
                  <div
                    key={log.id}
                    className={`${styles.logItem} ${selectedLogId === log.id ? styles.active : ''}`}
                    onClick={() => viewLogDetails(log.id)}
                  >
                    <div className={styles.logHeader}>
                      <span className={styles.name}>{log.name || '（未命名）'}</span>
                      <span className={styles.date}>{log.timestamp.slice(0, 10)}</span>
                    </div>
                    <div className={styles.logMeta}>
                      <span>{log.gender === 'male' ? '♂' : '♀'}</span>
                      <span>{log.birthDate} {log.birthTime}</span>
                      <span>神煞: {log.manufacturing.shensha.totalHits}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {selectedLog && (
            <section className={styles.detailsSection}>
              <h2>📋 詳細製作記錄</h2>

              <div className={styles.tabs}>
                <div className={styles.tab}>
                  <h3>📌 製作過程</h3>
                  <dl>
                    <dt>八字四柱</dt>
                    <dd>
                      {selectedLog.manufacturing.bazi.pillars.year} {selectedLog.manufacturing.bazi.pillars.month}{' '}
                      {selectedLog.manufacturing.bazi.pillars.day} {selectedLog.manufacturing.bazi.pillars.hour}
                    </dd>

                    <dt>日主</dt>
                    <dd>{selectedLog.manufacturing.bazi.dayMaster}</dd>

                    <dt>神煞命中</dt>
                    <dd>
                      福氣 {selectedLog.manufacturing.shensha.byTone['福氣']} | 動能{' '}
                      {selectedLog.manufacturing.shensha.byTone['動能']} | 提醒{' '}
                      {selectedLog.manufacturing.shensha.byTone['提醒']}
                    </dd>

                    <dt>易經卦象</dt>
                    <dd>{selectedLog.manufacturing.iching.hexagram}</dd>
                  </dl>
                </div>

                <div className={styles.tab}>
                  <h3>📚 來源與授權</h3>
                  <dl>
                    <dt>八字參考</dt>
                    <dd>{selectedLog.sources.bazi.references.join('、')}</dd>

                    <dt>紫微參考</dt>
                    <dd>{selectedLog.sources.ziwei.references.join('、')}</dd>

                    <dt>神煞框架</dt>
                    <dd>{selectedLog.sources.shensha.framework}</dd>

                    <dt>易經版本</dt>
                    <dd>{selectedLog.sources.iching.edition}</dd>
                  </dl>
                </div>

                <div className={styles.tab}>
                  <h3>🛡️ 著作權信息</h3>
                  <div className={styles.copyrightInfo}>
                    {selectedLog.copyright.engine.map((eng: any, i: number) => (
                      <div key={i} className={styles.copyrightItem}>
                        <strong>{eng.name}</strong>
                        <p>所有者: {eng.owner}</p>
                        <p>授權: {eng.license}</p>
                        <p>版本: {eng.version}</p>
                      </div>
                    ))}
                    {selectedLog.copyright.customAlgorithms.map((algo: any, i: number) => (
                      <div key={i} className={styles.copyrightItem}>
                        <strong>✨ {algo.description}</strong>
                        <p>所有者: {algo.owner}</p>
                        <p>保護方式: {algo.protectionMethod}</p>
                        <p className={styles.warning}>完全保護，未經許可禁止使用。</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.tab}>
                  <h3>🔍 法律追蹤</h3>
                  <dl>
                    <dt>請求 IP</dt>
                    <dd>{selectedLog.legalTracking.ipAddress}</dd>

                    <dt>請求時間</dt>
                    <dd>{selectedLog.legalTracking.requestedAt}</dd>

                    <dt>響應雜湊（完整性驗證）</dt>
                    <dd className={styles.hash}>{selectedLog.legalTracking.responseHash}</dd>
                  </dl>
                </div>

                <div className={styles.tab}>
                  <h3>⏱️ 計算步驟</h3>
                  <table className={styles.stepsTable}>
                    <thead>
                      <tr>
                        <th>步驟</th>
                        <th>執行時間</th>
                        <th>耗時 (ms)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedLog.calculationSteps.map((step: any, i: number) => (
                        <tr key={i}>
                          <td>{step.stepName}</td>
                          <td className={styles.mono}>{step.timestamp.slice(11, 19)}</td>
                          <td>{step.duration_ms}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
