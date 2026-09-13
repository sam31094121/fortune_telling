'use client';

import { memo, useState } from 'react';
import styles from './QuickStatsDrawer.module.css';

interface QuickStatsDrawerProps {
  todayWins?: number;
  todayLosses?: number;
  weekWins?: number;
  weekLosses?: number;
  currentWinStreak?: number;
  bestWinStreak?: number;
  frequentCards?: Array<{ id: string; name: string; element: string; usedCount: number }>;
}

const QuickStatsDrawer = memo(function QuickStatsDrawer({
  todayWins = 0,
  todayLosses = 0,
  weekWins = 0,
  weekLosses = 0,
  currentWinStreak = 0,
  bestWinStreak = 0,
  frequentCards = [],
}: QuickStatsDrawerProps) {
  const [open, setOpen] = useState(false);

  const todayTotal = todayWins + todayLosses;
  const weekTotal = weekWins + weekLosses;
  const todayRate = todayTotal > 0 ? Math.round((todayWins / todayTotal) * 100) : 0;
  const weekRate = weekTotal > 0 ? Math.round((weekWins / weekTotal) * 100) : 0;

  const elementSymbol: Record<string, string> = {
    SPACE: '◎',
    AIR: '🌪️',
    WATER: '💧',
    FIRE: '🔥',
    EARTH: '🪨',
  };

  return (
    <>
      {/* 常駐切換按鈕 */}
      <button
        type="button"
        className={styles.drawerToggle}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="打開詳細戰績統計"
      >
        📊
      </button>

      {/* 抽屜背景 + 內容 */}
      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} aria-hidden="true" />
          <div className={styles.drawer} role="region" aria-label="詳細戰績統計">
            <div className={styles.drawerHeader}>
              <h2>📈 戰績詳細</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setOpen(false)}
                aria-label="關閉"
              >
                ✕
              </button>
            </div>

            <div className={styles.drawerContent}>
              {/* 本日/本周統計 */}
              <section className={styles.section}>
                <h3>今日戰績</h3>
                <div className={styles.statsGrid}>
                  <div className={styles.statBox}>
                    <span className={styles.label}>勝負</span>
                    <span className={styles.value}>{todayWins}W - {todayLosses}L</span>
                    <span className={styles.rate}>{todayRate}%</span>
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.label}>連勝</span>
                    <span className={styles.value}>{currentWinStreak}</span>
                  </div>
                </div>
              </section>

              <section className={styles.section}>
                <h3>本週戰績</h3>
                <div className={styles.statsGrid}>
                  <div className={styles.statBox}>
                    <span className={styles.label}>勝負</span>
                    <span className={styles.value}>{weekWins}W - {weekLosses}L</span>
                    <span className={styles.rate}>{weekRate}%</span>
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.label}>最高</span>
                    <span className={styles.value}>{bestWinStreak}</span>
                  </div>
                </div>
              </section>

              {/* 常用卡片 */}
              {frequentCards.length > 0 && (
                <section className={styles.section}>
                  <h3>🏆 常用卡</h3>
                  <div className={styles.cardList}>
                    {frequentCards.slice(0, 3).map((card, idx) => (
                      <div key={card.id} className={styles.cardItem}>
                        <span className={styles.rank}>#{idx + 1}</span>
                        <span className={styles.symbol}>{elementSymbol[card.element] || '◎'}</span>
                        <div className={styles.cardInfo}>
                          <span className={styles.cardName}>{card.name}</span>
                          <span className={styles.cardStat}>用{card.usedCount}次</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 激勵文字 */}
              <div className={styles.motivation}>
                {todayRate >= 70 ? '🔥 表現優異，繼續保持！' : todayRate >= 50 ? '⭐ 不錯的成績，再加油！' : '💪 再練習幾場就會更強！'}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
});

export default QuickStatsDrawer;
