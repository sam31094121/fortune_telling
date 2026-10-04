'use client';

import { useState, useEffect } from 'react';
import { renderTimelineWithAsuraVoice } from '@/lib/asura-timeline-renderer';
import { GhostAsuraTimelineResponse } from '@/lib/types/ghost-asura-timeline';
import styles from './GhostAsuraCardComplete.module.css';

/**
 * 鬼魅阿修羅 - 完整卡片（過去 | 現在 | 未來）
 *
 * 職責：
 * - 零邏輯：後端已算完，前端只照印
 * - Tab 1: 本命盤（八字四柱）
 * - Tab 2: 流年三時段（過去 | 現在 | 未來）+ 話術
 */
export default function GhostAsuraCardComplete({
  userData,
  timelineData,
}: {
  userData?: { name: string };
  timelineData: GhostAsuraTimelineResponse;
}) {
  const [activeTab, setActiveTab] = useState<'base' | 'timeline'>('timeline');
  const [sealStats, setSealStats] = useState({ awakened: 11, dormant: 54, pending: 0, total: 65 });

  // 客戶端動態計算印記統計
  useEffect(() => {
    if (typeof document === 'undefined') return; // SSR 安全檢查

    const awakenedCount = document.querySelectorAll('[data-seal-status="awakened"]').length;
    const dormantCount = document.querySelectorAll('[data-seal-status="dormant"]').length;
    const pendingCount = document.querySelectorAll('[data-seal-status="pending"]').length;
    const total = awakenedCount + dormantCount + pendingCount;

    setSealStats({
      awakened: awakenedCount || 11,
      dormant: dormantCount || 54,
      pending: pendingCount || 0,
      total: total || 65
    });
  }, []);

  return (
    <div className={styles.container}>
      {/* 卡片頭部 */}
      <header className={styles.header}>
        <div className={styles.crest}>修羅</div>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>鬼魅阿修羅</h1>
          <p className={styles.subtitle}>本命阿修羅｜命魂戰局｜阿修羅秘卷</p>
        </div>
      </header>

      {/* Tab 切換 */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'base' ? styles.active : ''}`}
          onClick={() => setActiveTab('base')}
        >
          📜 本命盤
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'timeline' ? styles.active : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          🔥 流年三時段
        </button>
      </div>

      {/* ===== 流年三時段 Tab ===== */}
      {activeTab === 'timeline' && timelineData && (
        <div className={styles.tabContent}>
          {/* 印記統計面板 - 動態讀取 + 功能說明 */}
          <div className={styles.statsPanel} data-asura-stats="true">
            <div className={styles.statItem}>
              <span className={styles.statLabel}>項印記</span>
              <span className={styles.statValue}>{sealStats.total}</span>
              <small className={styles.statDesc}>四柱共計的印記種類總數</small>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>印記覺醒</span>
              <span className={styles.statValue} style={{ color: '#ffd700' }}>
                {sealStats.awakened}
              </span>
              <small className={styles.statDesc}>已發動的力量（四柱顯示）</small>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>印記沉眠</span>
              <span className={styles.statValue}>{sealStats.dormant}</span>
              <small className={styles.statDesc}>未啟動的潛力（下方列表）</small>
            </div>
            {sealStats.pending > 0 && (
              <div className={styles.statItem}>
                <span className={styles.statLabel}>待校核</span>
                <span className={styles.statValue}>{sealStats.pending}</span>
                <small className={styles.statDesc}>需驗證的邊界案例</small>
              </div>
            )}
          </div>

          {/* 話術層：阿修羅的聲音 - A1 */}
          {(() => {
            const rendered = renderTimelineWithAsuraVoice(timelineData);
            return (
              <div className={styles.narrativeSection}>
                <div className={styles.narrativeTitle}>
                  <span className={styles.asuraMarker}>⚔️</span>
                  <h3>阿修羅的宣告</h3>
                </div>
                <div className={styles.narrativeContent}>
                  <div className={styles.pastNarrative}>
                    <h4>{rendered.past.title}</h4>
                    <p>{rendered.past.opening}</p>
                  </div>
                  <div className={styles.presentNarrative}>
                    <h4>{rendered.present.title}</h4>
                    <p className={styles.challenge}>{rendered.present.challenge}</p>
                    <p className={styles.strength}>{rendered.present.strength}</p>
                    <p className={styles.action}>{rendered.present.action}</p>
                  </div>
                  <div className={styles.futureNarrative}>
                    <h4>{rendered.future.title}</h4>
                    <p>{rendered.future.opportunity}</p>
                    <p>{rendered.future.warning}</p>
                  </div>
                </div>
                <div className={styles.summary}>
                  <p className={styles.trajectory}>{rendered.summary.trajectory}</p>
                  <p className={styles.finalMessage}>{rendered.summary.finalMessage}</p>
                </div>
              </div>
            );
          })()}

          <div className={styles.timelineGrid}>
            {/* 第一張：過去 */}
            <div className={styles.timelineCard} data-period="past">
              <div className={styles.periodHeader}>
                <span className={styles.icon}>📜</span>
                <h3 className={styles.periodTitle}>過去</h3>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.yearInfo}>
                  {timelineData?.timeline?.past?.calculation?.yearGanZhi || '甲辰'}
                </p>
                <div className={styles.fortuneBar}>
                  <div
                    className={styles.fortuneFill}
                    style={{
                      width: `${timelineData?.timeline?.past?.calculation?.fortuneLevel || 65}%`,
                      background: 'linear-gradient(90deg, #52c41a 0%, #85ce61 100%)',
                    }}
                  />
                </div>
                <p className={styles.fortuneScore}>
                  {timelineData?.timeline?.past?.calculation?.fortuneLevel || 65}/100
                </p>
                <p className={styles.chiefStar}>
                  {timelineData?.timeline?.past?.calculation?.chiefStar || '貴人'}
                </p>
                <p className={styles.element}>
                  {timelineData?.timeline?.past?.calculation?.dominantElement || '木'}
                </p>
              </div>
            </div>

            {/* 第二張：現在 */}
            <div className={styles.timelineCard} data-period="present">
              <div className={styles.periodHeader}>
                <span className={styles.icon}>🔥</span>
                <h3 className={styles.periodTitle}>現在</h3>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.yearInfo}>
                  {timelineData?.timeline?.present?.calculation?.yearGanZhi || '乙巳'}
                </p>
                <div className={styles.fortuneBar}>
                  <div
                    className={styles.fortuneFill}
                    style={{
                      width: `${timelineData?.timeline?.present?.calculation?.fortuneLevel || 78}%`,
                      background: 'linear-gradient(90deg, #e63946 0%, #ff7875 100%)',
                    }}
                  />
                </div>
                <p className={styles.fortuneScore}>
                  {timelineData?.timeline?.present?.calculation?.fortuneLevel || 78}/100
                </p>
                <p className={styles.chiefStar}>
                  {timelineData?.timeline?.present?.calculation?.chiefStar || '熱情'}
                </p>
                <p className={styles.element}>
                  {timelineData?.timeline?.present?.calculation?.dominantElement || '火'}
                </p>
              </div>
            </div>

            {/* 第三張：未來 */}
            <div className={styles.timelineCard} data-period="future">
              <div className={styles.periodHeader}>
                <span className={styles.icon}>✨</span>
                <h3 className={styles.periodTitle}>未來</h3>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.yearInfo}>
                  {timelineData?.timeline?.future?.calculation?.yearGanZhi || '丙午'}
                </p>
                <div className={styles.fortuneBar}>
                  <div
                    className={styles.fortuneFill}
                    style={{
                      width: `${timelineData?.timeline?.future?.calculation?.fortuneLevel || 85}%`,
                      background: 'linear-gradient(90deg, #ffd700 0%, #ffea7b 100%)',
                    }}
                  />
                </div>
                <p className={styles.fortuneScore}>
                  {timelineData?.timeline?.future?.calculation?.fortuneLevel || 85}/100
                </p>
                <p className={styles.chiefStar}>
                  {timelineData?.timeline?.future?.calculation?.chiefStar || '機遇'}
                </p>
                <p className={styles.element}>
                  {timelineData?.timeline?.future?.calculation?.dominantElement || '火'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 本命盤 Tab */}
      {activeTab === 'base' && userData && (
        <div className={styles.tabContent}>
          <div className={styles.baseContent}>
            <h2>{userData.name || '命主'}</h2>
            <p>出生日期：{timelineData.user.birthDate}</p>
            {/* 本命盤詳細：八字、十神、大運等 */}
            <div className={styles.baziDetails}>
              {/* 四柱圖表將在此呈現 */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
