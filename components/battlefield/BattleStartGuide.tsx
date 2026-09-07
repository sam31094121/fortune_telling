'use client';

/**
 * 戰場5步清晰引導
 * ============================================================================
 *
 * 目的：把複雜的佈陣流程變成「傻瓜級」的5步引導。
 * 原則：
 *   · 用箭頭和高亮代替文字說明
 *   · 一次只讓玩家看到「當前該做的事」
 *   · 開戰按鈕要清楚、明顯、難以錯過
 *   · 進度條視覺化「還剩幾步」
 */

import { useMemo } from 'react';
import styles from './BattleStartGuide.module.css';

interface BattleStep {
  step: 1 | 2 | 3 | 4 | 5;
  label: string;
  done: boolean;
  icon: string;
}

interface BattleStartGuideProps {
  /** 步驟完成度 */
  steps: BattleStep[];
  /** 當前狀態簡述（用 emoji + 文字） */
  status: string;
  /** 開戰是否可用 */
  canStart: boolean;
  /** 開戰按鈕文字 */
  startButtonText: string;
  /** 開戰回調 */
  onStart: () => void;
  /** 如果無法開戰，提示訊息 */
  blockReason?: string;
}

export default function BattleStartGuide({
  steps,
  status,
  canStart,
  startButtonText,
  onStart,
  blockReason,
}: BattleStartGuideProps) {
  const currentStep = useMemo(() => {
    // 找第一個未完成的步驟
    return steps.find(s => !s.done)?.step ?? 5;
  }, [steps]);

  const progress = useMemo(() => {
    const completed = steps.filter(s => s.done).length;
    return (completed / 5) * 100;
  }, [steps]);

  return (
    <div className={styles.guide}>
      {/* 進度條：視覺化「還剩幾步」 */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        <span className={styles.progressLabel}>{steps.filter(s => s.done).length}/5</span>
      </div>

      {/* 5步驟：視覺陣列 */}
      <div className={styles.stepsGrid}>
        {steps.map((step, idx) => (
          <div
            key={step.step}
            className={`${styles.stepBox} ${step.done ? styles.done : step.step === currentStep ? styles.current : ''}`}
            data-step={step.step}
          >
            <div className={styles.stepNumber}>
              <span>{step.step}</span>
            </div>
            <div className={styles.stepIcon}>{step.icon}</div>
            <div className={styles.stepLabel}>{step.label}</div>
            {step.done && <div className={styles.stepCheck}>✓</div>}
            {step.step === currentStep && <div className={styles.stepArrow}>➜</div>}
            {idx < 4 && <div className={styles.stepConnector}>|</div>}
          </div>
        ))}
      </div>

      {/* 當前狀態 */}
      <div className={styles.statusBox}>
        <p>{status}</p>
      </div>

      {/* 開戰按鈕（醒目） */}
      <button
        type="button"
        className={styles.startButton}
        disabled={!canStart}
        onClick={onStart}
        aria-label={canStart ? startButtonText : `${blockReason || '無法開戰'}`}
      >
        {canStart ? (
          <>
            <span className={styles.startIcon}>⚔️</span>
            <span className={styles.startText}>{startButtonText}</span>
          </>
        ) : (
          <>
            <span className={styles.waitIcon}>⏳</span>
            <span className={styles.waitText}>{blockReason || '準備中…'}</span>
          </>
        )}
      </button>

      {/* 額外提示（只在無法開戰時） */}
      {!canStart && blockReason && (
        <div className={styles.hint}>
          <span className={styles.hintIcon}>ℹ️</span>
          <span>{blockReason}</span>
        </div>
      )}
    </div>
  );
}
