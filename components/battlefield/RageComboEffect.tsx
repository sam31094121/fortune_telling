'use client';

import { memo, CSSProperties } from 'react';
import styles from './RageComboEffect.module.css';

interface RageComboEffectProps {
  active?: boolean;
  element?: string;
}

const RageComboEffect = memo(function RageComboEffect({
  active = false,
  element = 'SPACE',
}: RageComboEffectProps) {
  if (!active) return null;

  const elementGlowMap: Record<string, string> = {
    SPACE: '#7dd3fc',
    AIR: '#10b981',
    WATER: '#3b82f6',
    FIRE: '#ef4444',
    EARTH: '#d97706',
  };

  const elementIntensityMap: Record<string, string> = {
    SPACE: '1.1',
    AIR: '1.0',
    WATER: '0.95',
    FIRE: '1.2',
    EARTH: '1.05',
  };

  const glow = elementGlowMap[element] || '#fbbf24';
  const intensity = elementIntensityMap[element] || '1.0';

  return (
    <div
      className={styles.rageContainer}
      style={{ '--rage-glow': glow, '--intensity': intensity } as CSSProperties}
      aria-hidden="true"
      data-element={element}
    >
      {/* 1. 背景閃爍暗化 */}
      <div className={styles.bgDim} />

      {/* 2. 粒子爆發 - 48層光子環（提升24層增強視覺） */}
      <div className={styles.particleLayer}>
        {[1, 2, 3, 4].map((ring) => (
          <div key={`ring-${ring}`} className={styles.particleRing} data-ring={ring}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((particle) => (
              <div
                key={`particle-${ring}-${particle}`}
                className={styles.rageParticle}
                style={{
                  '--delay': `${ring * 0.12 + particle * 0.04}s`,
                  '--angle': `${particle * 30}deg`,
                } as CSSProperties}
              />
            ))}
          </div>
        ))}
      </div>

      {/* 3. 中心爆炸光球 */}
      <div className={styles.explosionCore} />

      {/* 4. 衝擊波（6層向外擴散） */}
      <div className={styles.shockwaveLayer}>
        {[0, 1, 2, 3, 4, 5].map((wave) => (
          <div
            key={`shockwave-${wave}`}
            className={styles.shockwave}
            style={{ '--wave-delay': `${wave * 0.08}s` } as CSSProperties}
          />
        ))}
      </div>

      {/* 5. 光線掃過（上下左右） */}
      <div className={styles.lightSweepLayer}>
        <div className={styles.lightSweep} data-direction="vertical" />
        <div className={styles.lightSweep} data-direction="horizontal" />
      </div>

      {/* 6. 邊角光芒 */}
      <div className={styles.cornerGlows}>
        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
          <div key={corner} className={styles.cornerGlow} data-corner={corner} />
        ))}
      </div>

      {/* 7. 文字標題：暴怒合體 */}
      <div className={styles.rageTitle}>
        <div className={styles.titleText}>🔥 暴怒合體 🔥</div>
      </div>
    </div>
  );
});

export default RageComboEffect;
