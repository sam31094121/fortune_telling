'use client';

import { memo, useState } from 'react';
import styles from './ShareBadge.module.css';
import type { Match } from '@/lib/beast-game/interactive';

interface ShareBadgeProps {
  match: Match;
  streak: number;
  totalDamage: number;
}

const ShareBadge = memo(function ShareBadge({ match, streak }: ShareBadgeProps) {
  const [copied, setCopied] = useState(false);

  if (match.status !== 'FINISHED' || match.winner !== 'player') return null;

  const generateShareText = () => {
    const badges = [];
    if (streak >= 10) badges.push('👑 新紀錄');
    if (streak >= 6) badges.push('✨ 傳奇連勝');
    if (streak >= 3) badges.push('🔥 連勝');

    return `🎮 我在神獸卡片戰鬥中 ${streak >= 3 ? `連勝 ${streak} 場` : '贏了'}！
${badges.join(' ')}
⚔️ 共 ${match.round - 1} 回合
來試試你能贏多少場？`;
  };

  const handleCopy = () => {
    // 不支援剪貼簿時安靜不動，不假裝「已複製」。
    navigator.clipboard?.writeText(generateShareText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className={styles.badgeContainer}>
      <button
        className={styles.shareBtn}
        onClick={handleCopy}
        type="button"
        title="複製分享文案"
      >
        <span className={styles.icon}>📤</span>
        <span className={styles.text}>{copied ? '✓ 已複製' : '分享成績'}</span>
      </button>

      {streak >= 3 && (
        <div className={styles.achievementBadges}>
          {streak >= 10 && <div className={styles.badge} data-type="legendary">👑 新紀錄</div>}
          {streak >= 6 && <div className={styles.badge} data-type="epic">✨ 傳奇</div>}
          {streak >= 3 && <div className={styles.badge} data-type="rare">🔥 連勝</div>}
        </div>
      )}
    </div>
  );
});

export default ShareBadge;
