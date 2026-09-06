'use client';

/**
 * 羈絆解鎖・慶祝時刻
 * ============================================================================
 *
 * 沒有這個元件之前，解鎖是「無聲發生」的：卡片默默發進收藏，
 * 客戶下次進頁面才發現牆上多一格亮的——最值錢的那一刻（得到的當下）
 * 完全沒有被慶祝。獲得感在事發當下最強，事後補看只剩通知。
 *
 * 【只演出，不發卡】
 *
 * 誰解鎖、發了什麼，全部由父層依 deriveUnlockedMansions 算好。
 * 這裡只負責翻牌給人看。翻不翻、快轉、關掉重開，收藏內容一張不差——
 * 跟戰鬥演出同一條紀律：演出層不得決定結果。
 */

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './BeastBondCelebration.module.css';

export default function BeastBondCelebration({
  beast, onClose,
}: {
  beast: { id: number; name: string; image: string; youngDivineImage: string; coreMeaning: string; symbolicPart: string };
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`羈絆解鎖：${beast.name}`}
      data-bond-celebration
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className={styles.stage}>
        <p className={styles.kicker}>羈絆解鎖</p>
        <div className={styles.card}>
          <div className={styles.inner}>
            <div className={`${styles.face} ${styles.back}`} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/beast-game/card-back.webp" alt="" />
            </div>
            <div className={`${styles.face} ${styles.front}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={beast.image} alt={`${beast.name}本體神獸`} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.young} src={beast.youngDivineImage} alt={`${beast.name}神獸幼子`} />
            </div>
          </div>
        </div>
        <h3 className={styles.name}>{beast.name}</h3>
        <p className={styles.meaning}>{beast.symbolicPart}・{beast.coreMeaning}</p>
        <p className={styles.grant}>本體與幼子各一張，已發進你的成長收藏。</p>
        <div className={styles.actions}>
          <Link href="/beast-game/battlefield" className={styles.primary}>帶牠去神獸戰場出戰</Link>
          <button ref={closeRef} type="button" onClick={onClose} className={styles.secondary}>
            收下，繼續成長
          </button>
        </div>
      </div>
    </div>
  );
}
