'use client';

import { memo } from 'react';
import styles from './DifficultyIndicator.module.css';

interface DifficultyIndicatorProps {
  difficulty?: number; // 1-5
  predictedWinRate?: number; // 0-100
  reason?: string;
  visible?: boolean;
}

const DifficultyIndicator = memo(function DifficultyIndicator({
  difficulty = 3,
  predictedWinRate = 60,
  reason = '根據您的勝率調整',
  visible = true,
}: DifficultyIndicatorProps) {
  if (!visible) return null;

  const stars = Array.from({ length: 5 }, (_, i) => i < difficulty ? '⭐' : '☆');
  const difficultyLabel = ['極簡', '簡單', '普通', '挑戰', '極難'][difficulty - 1] || '普通';
  const rateColor = predictedWinRate >= 70 ? '#10b981' : predictedWinRate >= 50 ? '#7dd3fc' : '#f97316';

  return (
    <div className={styles.difficultyCard}>
      <div className={styles.header}>
        <h4>下一場難度</h4>
      </div>

      <div className={styles.difficulty}>
        <div className={styles.stars}>{stars.join('')}</div>
        <div className={styles.label}>{difficultyLabel}</div>
      </div>

      <div className={styles.predictedRate}>
        <span className={styles.label}>預測勝率</span>
        <div className={styles.percentage}>
          <span style={{ color: rateColor }} className={styles.rate}>{predictedWinRate}%</span>
        </div>
      </div>

      <div className={styles.reason}>{reason}</div>

      {predictedWinRate < 40 && (
        <div className={styles.warning}>
          ⚠️ 此場難度較高，請確認陣容搭配
        </div>
      )}
    </div>
  );
});

export default DifficultyIndicator;
