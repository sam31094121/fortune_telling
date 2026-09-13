'use client';

import { memo, CSSProperties } from 'react';
import styles from './WinStreakCounter.module.css';

interface WinStreakCounterProps {
  streak: number;
  totalDamage?: number;
  roundDamage?: number;
  isNewRecord?: boolean;
}

const WinStreakCounter = memo(function WinStreakCounter({
  streak = 0,
  totalDamage = 0,
  roundDamage = 0,
  isNewRecord = false,
}: WinStreakCounterProps) {
  if (streak <= 0) return null;

  const getStreakColor = () => {
    if (streak >= 10) return '#ff006e'; // 新紀錄：紅色
    if (streak >= 6) return '#fbbf24'; // 金色
    if (streak >= 3) return '#fbbf24'; // 金色
    return '#7dd3fc'; // 淺藍
  };

  const getStreakLabel = () => {
    if (streak >= 10) return '🔥 新紀錄！';
    if (streak >= 6) return '✨ 連勝';
    if (streak >= 3) return '🔥 連勝';
    return '連勝';
  };

  return (
    <div className={styles.container} style={{ '--streak-color': getStreakColor() } as CSSProperties}>
      <div className={styles.streakDisplay}>
        <div className={styles.streakNumber} data-streak={streak} data-record={isNewRecord}>
          {streak}
        </div>
        <div className={styles.streakLabel}>{getStreakLabel()}</div>
      </div>

      {roundDamage > 0 && (
        <div className={styles.damageInfo}>
          <div className={styles.label}>本回合</div>
          <div className={styles.value}>{roundDamage}</div>
        </div>
      )}

      {totalDamage > 0 && (
        <div className={styles.totalInfo}>
          <div className={styles.label}>累計傷害</div>
          <div className={styles.value}>{totalDamage}</div>
        </div>
      )}

      {isNewRecord && (
        <div className={styles.recordBadge}>
          👑 新紀錄
        </div>
      )}
    </div>
  );
});

export default WinStreakCounter;
