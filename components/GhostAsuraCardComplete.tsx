'use client';

import { useState } from 'react';
import styles from './GhostAsuraCardComplete.module.css';

/**
 * 鬼魅阿修羅 - 完整卡片（過去 | 現在 | 未來）
 * 
 * 功能：
 * - Tab 1: 本命盤（八字四柱）
 * - Tab 2: 流年三時段（過去 | 現在 | 未來）
 */
export default function GhostAsuraCardComplete({
  userData,
  timelineData,
}: any) {
  const [activeTab, setActiveTab] = useState<'base' | 'timeline'>('timeline');

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
      {activeTab === 'timeline' && (
        <div className={styles.tabContent}>
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
      {activeTab === 'base' && (
        <div className={styles.tabContent}>
          <div className={styles.baseContent}>本命盤資訊</div>
        </div>
      )}
    </div>
  );
}
