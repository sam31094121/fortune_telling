'use client';

import { memo, CSSProperties } from 'react';
import styles from './VictoryMoment.module.css';

interface VictoryMomentProps {
  active?: boolean;
  streak?: number;
  isNewRecord?: boolean;
  element?: string;
}

const VictoryMoment = memo(function VictoryMoment({
  active = false,
  streak = 1,
  isNewRecord = false,
  element = 'SPACE',
}: VictoryMomentProps) {
  if (!active) return null;

  const elementGlowMap: Record<string, string> = {
    SPACE: '#7dd3fc',
    AIR: '#10b981',
    WATER: '#3b82f6',
    FIRE: '#ef4444',
    EARTH: '#d97706',
  };

  const glow = elementGlowMap[element] || '#fbbf24';

  const getIntensity = () => {
    if (streak >= 10) return 'legendary'; // 傳奇級
    if (streak >= 6) return 'epic'; // 史詩級
    if (streak >= 3) return 'rare'; // 罕見級
    return 'common'; // 普通級
  };

  const intensity = getIntensity();

  return (
    <div
      className={styles.victoryContainer}
      style={{ '--victory-glow': glow } as CSSProperties}
      data-intensity={intensity}
      aria-hidden="true"
    >
      {/* 屏幕震動疊層 */}
      <div className={styles.shakeOverlay} />

      {/* 全屏光芒爆發 */}
      <div className={styles.flashBurst} />

      {/* 勝利標題 */}
      <div className={styles.victoryTitle}>
        <span className={styles.titleText}>
          {streak >= 10 ? '🎉 傳奇連勝！' : streak >= 6 ? '✨ 好厲害！' : streak >= 3 ? '🔥 連勝！' : '勝利！'}
        </span>
      </div>

      {/* 連勝特效 */}
      {streak >= 3 && (
        <>
          <div className={styles.streakAura} />
          <div className={styles.particleExplosion}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={styles.victoryParticle} style={{ '--particle-delay': `${i * 0.1}s` } as CSSProperties} />
            ))}
          </div>
        </>
      )}

      {/* 新紀錄特效 */}
      {isNewRecord && (
        <div className={styles.recordEffect}>
          <div className={styles.recordRing} />
          <div className={styles.recordText}>新紀錄！</div>
        </div>
      )}

      {/* 對手消散效果 */}
      <div className={styles.defeatAnimation} />
    </div>
  );
});

export default VictoryMoment;
