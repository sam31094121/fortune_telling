'use client';

import { memo } from 'react';
import styles from './BattleStatsPanel.module.css';

interface BattleStatsPanelProps {
  todayWins?: number;
  todayLosses?: number;
  currentWinStreak?: number;
  bestWinStreak?: number;
  visible?: boolean;
}

const BattleStatsPanel = memo(function BattleStatsPanel({
  todayWins = 0,
  todayLosses = 0,
  currentWinStreak = 0,
  bestWinStreak = 0,
  visible = true,
}: BattleStatsPanelProps) {
  if (!visible) return null;

  const todayTotal = todayWins + todayLosses;
  const todayRate = todayTotal > 0 ? Math.round((todayWins / todayTotal) * 100) : 0;
  const streakStatus = currentWinStreak >= 3 ? '🔥' : currentWinStreak >= 1 ? '⭐' : '📍';

  return (
    <div className={styles.statsPanel} role="status" aria-label="今日戰績統計">
      <div className={styles.statRow}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>🏆 本日</span>
          <span className={styles.statValue}>{todayWins}勝 {todayLosses}敗</span>
          <span className={styles.statRate}>{todayRate}%</span>
        </div>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>{streakStatus} 連勝</span>
          <span className={styles.statValue}>{currentWinStreak}</span>
          {currentWinStreak >= 3 && <span className={styles.streakBonus}>火熱！</span>}
        </div>

        <div className={styles.statItem}>
          <span className={styles.statLabel}>⭐ 最高</span>
          <span className={styles.statValue}>{bestWinStreak}</span>
        </div>
      </div>

      {/* 連勝激勵提示 */}
      {currentWinStreak >= 3 && (
        <div className={styles.motivationText}>
          再贏 {5 - currentWinStreak} 場就能破紀錄！
        </div>
      )}
    </div>
  );
});

export default BattleStatsPanel;
