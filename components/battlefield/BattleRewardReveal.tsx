'use client';

import type { ReactNode } from 'react';
import styles from './BattleRewardReveal.module.css';

/**
 * 勝利後的「戰利品揭曉」：緊接在勝利橫幅下面，一屏就看到獲得什麼。
 *
 * 純顯示元件：獲得哪張卡、有沒有保存成功，全由後端結算結果決定、由父層傳入。
 * 制度鐵律（docs/beast-game-skill.md〈客戶利益與收藏〉）：獎勵真實入庫且保存後才顯示已獲得；
 * 保存中只顯示「保存中」，保存失敗要能重試，絕不假裝已發獎。翻牌動畫只是演出，不影響結果。
 */
export type BattleRewardStatus = 'saving' | 'saved' | 'failed';

interface Props {
  /** 僅寶珠戰困難版使用的戰利品揭曉演出。 */
  presentation?: 'standard' | 'orb-victory';
  status: BattleRewardStatus;
  /** 後端已保存的戰利卡（完整卡面，由父層以既有 BeastCardFace 傳入） */
  card?: ReactNode;
  /** 說明文字：已保存時為「多了一張…」，失敗時為錯誤原因 */
  message: string;
  onRetry?: () => void;
  onViewCards?: () => void;
  viewDisabled?: boolean;
}

export default function BattleRewardReveal({ status, card, message, onRetry, onViewCards, viewDisabled, presentation = 'standard' }: Props) {
  return (
    <section className={styles.reveal} data-presentation={presentation} data-testid="campaign-victory-reward" data-reward-status={status} aria-live="polite" aria-label="戰利品">
      <h3 className={styles.heading}><span aria-hidden="true">{presentation === 'orb-victory' ? '🏆' : '🎁'}</span> {presentation === 'orb-victory' ? '勝利戰利品' : '戰利品'}</h3>

      {status === 'saving' ? (
        <>
          <div className={styles.placeholder} aria-hidden="true"><span>?</span></div>
          <p className={styles.message}>{message}</p>
        </>
      ) : status === 'saved' ? (
        <>
          {presentation === 'orb-victory' ? (
            <div className={styles.stage}>
              <div className={styles.rays} aria-hidden="true" />
              <div className={styles.aura} aria-hidden="true" />
              <div className={styles.ring2} aria-hidden="true" />
              <div className={styles.ring} aria-hidden="true" />
              <div className={styles.sparks} aria-hidden="true">
                {Array.from({ length: 20 }, (_, i) => <i key={i} style={{ rotate: `${i * 18}deg`, ['--d' as string]: `${(i % 5) * 70}ms`, ['--r' as string]: `${105 + (i % 4) * 28}px` }} />)}
              </div>
              <div className={styles.embers} aria-hidden="true">
                {Array.from({ length: 9 }, (_, i) => <i key={i} style={{ left: `${8 + i * 10.5}%`, ['--d' as string]: `${0.6 + (i % 4) * 0.35}s`, ['--t' as string]: `${2.4 + (i % 3) * 0.6}s` }} />)}
              </div>
              <div className={styles.cardWrap} data-reward-card>{card}</div>
              <div className={styles.pedestal} aria-hidden="true" />
            </div>
          ) : <div className={styles.cardWrap} data-reward-card>{card}</div>}
          <p className={styles.message}>{message}</p>
          {onViewCards ? (
            <button type="button" className={styles.button} disabled={viewDisabled} onClick={onViewCards}>查看我的卡片</button>
          ) : null}
        </>
      ) : (
        <>
          <p className={styles.error} role="alert">{message}</p>
          {onRetry ? <button type="button" className={styles.button} onClick={onRetry}>重試保存獎勵</button> : null}
        </>
      )}
    </section>
  );
}
