'use client';

import styles from './BattleStartGuide.module.css';
import type { PreparationStep } from './preparation-guidance';

interface BattleStartGuideProps {
  currentStep: PreparationStep;
  actionLabels: Record<PreparationStep, string>;
  onReviewStep: (step: PreparationStep) => void;
  checkingRecords?: boolean;
  status: string;
  canStart: boolean;
  startButtonText: string;
  onStart: () => void;
  blockReason?: string;
  riskNotice?: string;
}

/** One next action. Instructions live in the separate help panel, not this footer. */
export default function BattleStartGuide({
  currentStep, actionLabels, onReviewStep, checkingRecords = false,
  status, canStart, startButtonText, onStart, blockReason, riskNotice,
}: BattleStartGuideProps) {
  return (
    <div className={styles.guide} aria-label="下一步操作">
      <p className={styles.status} role="status">{status}</p>
      {riskNotice && <p className={styles.risk}>{riskNotice}</p>}
      <button type="button" className={styles.startButton}
        disabled={checkingRecords} aria-busy={checkingRecords}
        onClick={canStart ? onStart : () => onReviewStep(currentStep)}
        aria-label={canStart ? startButtonText : checkingRecords ? blockReason : actionLabels[currentStep]}
        data-start-confirmation={canStart}>
        <span aria-hidden="true">{checkingRecords ? '…' : canStart ? '⚔' : '→'}</span>
        {canStart ? startButtonText : checkingRecords ? blockReason || '核對中…' : actionLabels[currentStep]}
      </button>
      {!canStart && blockReason && !checkingRecords && <p className={styles.hint}>{blockReason}</p>}
    </div>
  );
}
