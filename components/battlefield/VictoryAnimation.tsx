'use client';

import { memo, type CSSProperties } from 'react';
import styles from './VictoryAnimation.module.css';

interface VictoryAnimationProps {
  show?: boolean;
  winner?: 'player' | 'opponent' | null;
}

const VictoryAnimation = memo(function VictoryAnimation({
  show = false,
  winner = null,
}: VictoryAnimationProps) {
  if (!show || winner !== 'player') return null;

  return (
    <div className={styles.victoryContainer} aria-hidden="true">
      {/* 落幣只作勝利演出；此處不宣稱發放金幣或卡片獎勵。 */}
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={`coin-${i}`}
          className={styles.coin}
          style={{
            '--delay': `${i * 0.1}s`,
            '--from-x': `${((i * 37) % 90) - 45}%`,
            '--rotation': `${i * 60}deg`,
            '--duration': `${1.2 + (i % 4) * 0.1}s`,
          } as CSSProperties}
        >
          🪙
        </div>
      ))}
      <div className={styles.burstCenter}>
        {[...Array(8)].map((_, i) => (
          <div
            key={`burst-${i}`}
            className={styles.burstLine}
            style={{ '--angle': `${i * 45}deg` } as CSSProperties}
          />
        ))}
      </div>

    </div>
  );
});

export default VictoryAnimation;
