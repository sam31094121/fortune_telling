'use client';

import { memo } from 'react';
import styles from './UpgradePathHint.module.css';
import type { Match } from '@/lib/beast-game/interactive';

interface UpgradePathHintProps {
  match: Match;
}

const UpgradePathHint = memo(function UpgradePathHint({ match }: UpgradePathHintProps) {
  if (match.status !== 'FINISHED') return null;

  const isVictory = match.winner === 'player';
  const playerFighter = match.player.team[match.player.active];
  const opponentFighter = match.opponent.team[match.opponent.active];
  const streak = 1; // 簡化版本，實際應從match計算

  // 生成升級建議
  const getHint = () => {
    if (!isVictory) {
      return {
        title: '💪 下次更強',
        message: `試試 ${opponentFighter.element} 系卡，克制對方`,
        type: 'defeat',
      };
    }

    if (streak >= 3) {
      return {
        title: '🌟 趁勢升級',
        message: `${playerFighter.name} 表現神勇，升級它會更強`,
        type: 'upgrade',
      };
    }

    if (playerFighter.element !== opponentFighter.element) {
      return {
        title: '⚡ 優勢鞏固',
        message: `${playerFighter.element} 剋 ${opponentFighter.element}，組隊時記住`,
        type: 'advantage',
      };
    }

    return {
      title: '🎯 穩定勝利',
      message: '保持這樣的隊伍搭配，再來一局',
      type: 'stable',
    };
  };

  const hint = getHint();

  return (
    <div className={styles.hintContainer} data-type={hint.type} aria-live="polite">
      <div className={styles.hintContent}>
        <div className={styles.hintTitle}>{hint.title}</div>
        <div className={styles.hintMessage}>{hint.message}</div>
      </div>
      <div className={styles.hintAction}>
        <button className={styles.actionBtn} type="button">
          {isVictory ? '下一局' : '重試'}
        </button>
      </div>
    </div>
  );
});

export default UpgradePathHint;
