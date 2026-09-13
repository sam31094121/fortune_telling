'use client';

import { memo } from 'react';
import styles from './QuickReplayButton.module.css';

interface QuickReplayButtonProps {
  show?: boolean;
  disabled?: boolean;
  onReplay?: () => void;
  onHome?: () => void;
}

const QuickReplayButton = memo(function QuickReplayButton({
  show = false,
  disabled = false,
  onReplay,
  onHome,
}: QuickReplayButtonProps) {
  if (!show) return null;

  return (
    <div className={styles.quickActionContainer}>
      {/* 背景淡化 */}
      <div className={styles.backdrop} />

      {/* 動作按鈕群 */}
      <div className={styles.actionGroup}>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={disabled}
          onClick={onReplay}
          aria-label="使用相同陣容立即重新開戰"
        >
          <span className={styles.icon}>🔄</span>
          <strong>再玩一次</strong>
          <small>保留陣容</small>
        </button>

        <button
          type="button"
          className={styles.secondaryButton}
          disabled={disabled}
          onClick={onHome}
          aria-label="回到卡片選擇頁面"
        >
          <span className={styles.icon}>🛠️</span>
          <strong>換陣容</strong>
          <small>重新選卡</small>
        </button>
      </div>
    </div>
  );
});

export default QuickReplayButton;
