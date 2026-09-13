'use client';

import { memo, CSSProperties } from 'react';
import styles from './PhotonParticleEffect.module.css';

interface PhotonParticleProps {
  active?: boolean;
  element?: string;
  intensity?: 'light' | 'medium' | 'heavy';
  isSkill?: boolean;
}

const PhotonParticleEffect = memo(function PhotonParticleEffect({
  active = false,
  element = 'SPACE',
  intensity = 'medium',
  isSkill = false,
}: PhotonParticleProps) {
  if (!active) return null;

  const elementGlowMap: Record<string, string> = {
    SPACE: '#7dd3fc',
    AIR: '#10b981',
    WATER: '#3b82f6',
    FIRE: '#ef4444',
    EARTH: '#d97706',
  };

  const glow = elementGlowMap[element] || '#7dd3fc';

  return (
    <div
      className={styles.particleContainer}
      data-intensity={intensity}
      data-is-skill={isSkill}
      style={{ '--photon-glow': glow } as CSSProperties}
      aria-hidden="true"
    >
      {/* 核心光球 */}
      <div className={styles.photonCore} />

      {/* 粒子環 - 3 層 */}
      {[1, 2, 3].map((ring) => (
        <div key={`ring-${ring}`} className={styles.particleRing} data-ring={ring}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((particle) => (
            <div
              key={`particle-${ring}-${particle}`}
              className={styles.particle}
              style={{
                '--delay': `${(ring * 0.15 + particle * 0.05)}s`,
                '--angle': `${(particle * 45)}deg`,
              } as CSSProperties}
            />
          ))}
        </div>
      ))}

      {/* 爆發光線 */}
      <div className={styles.burstRays}>
        {[0, 1, 2, 3, 4, 5].map((ray) => (
          <div
            key={`ray-${ray}`}
            className={styles.ray}
            style={{ '--angle': `${ray * 60}deg` } as CSSProperties}
          />
        ))}
      </div>

      {/* 強烈衝擊波（技能時） */}
      {isSkill && (
        <div className={styles.shockWave} />
      )}
    </div>
  );
});

export default PhotonParticleEffect;
