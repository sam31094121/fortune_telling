'use client';

import { memo, CSSProperties } from 'react';
import styles from './TeamRosterPanel.module.css';

interface TeamCard {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  defeated: boolean;
  element: string;
  canRage?: boolean;
}

interface TeamRosterPanelProps {
  team?: TeamCard[];
  side: 'player' | 'opponent';
  activeCardId?: string;
}

const elementEmoji: Record<string, string> = {
  SPACE: '◎',
  AIR: '🌪️',
  WATER: '💧',
  FIRE: '🔥',
  EARTH: '🪨',
};

const TeamRosterPanel = memo(function TeamRosterPanel({
  team = [],
  side = 'player',
  activeCardId,
}: TeamRosterPanelProps) {
  // 只顯示還活著的卡
  const aliveTeam = team.filter(card => !card.defeated);

  return (
    <div className={styles.rosterPanel} data-side={side} aria-label={side === 'player' ? '你的隊伍' : '對手隊伍'}>
      <div className={styles.rosterHeader}>
        <span className={styles.count}>{aliveTeam.length}/{team.length}</span>
      </div>

      <div className={styles.rosterList}>
        {aliveTeam.map((card, idx) => (
          <div
            key={card.id}
            className={styles.rosterCard}
            data-active={activeCardId === card.id}
            data-rage={card.canRage}
            style={{
              '--animation-delay': `${idx * 0.1}s`,
            } as CSSProperties}
          >
            {/* 暴怒合體指示光芒 */}
            {card.canRage && (
              <>
                <div className={styles.rageAura} aria-hidden="true" />
                <div className={styles.rageGlow} aria-hidden="true">✨</div>
              </>
            )}

            {/* 卡片內容 */}
            <div className={styles.cardContent}>
              {/* 元素符號 */}
              <div className={styles.element}>
                {elementEmoji[card.element] || '◎'}
              </div>

              {/* 卡片名稱 */}
              <div className={styles.cardName}>
                {card.name}
              </div>

              {/* 血量條 */}
              <div className={styles.hpBar}>
                <div
                  className={styles.hpFill}
                  style={{ width: `${(card.hp / card.maxHp) * 100}%` }}
                  aria-hidden="true"
                />
              </div>

              {/* 血量數字 */}
              <div className={styles.hpText}>
                {card.hp}/{card.maxHp}
              </div>

              {/* 主戰標記 */}
              {activeCardId === card.id && (
                <div className={styles.activeMarker} aria-label="主戰">
                  ●
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 空隊提示 */}
      {aliveTeam.length === 0 && (
        <div className={styles.emptyState}>
          所有卡片已倒下
        </div>
      )}
    </div>
  );
});

export default TeamRosterPanel;
