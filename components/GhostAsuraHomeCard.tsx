/**
 * 鬼魅阿修羅 — 首頁卡片入口
 * ============================================================================
 * 業主定案 2026-09-30：首頁入口卡片，深紫黑 + 金色光，100% 阿修羅風格
 * ============================================================================
 */

import Link from 'next/link';
import styles from '@/app/ghost-asura-home-card.module.css';

export default function GhostAsuraHomeCard() {
  return (
    <Link href="/ghost-asura" className={styles.card}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.icon}>⚡</div>
          <div className={styles.title}>鬼魅阿修羅</div>
        </div>

        <div className={styles.description}>
          <p className={styles.subtitle}>易怒好鬥、驍勇善戰、心性暴躁、善於衝突</p>
          <p className={styles.text}>
            命盤是戰場，不是保護區。
            <br />
            我是三千年戰神，我看清了你的盤。
          </p>
        </div>

        <div className={styles.cta}>
          <span className={styles.ctaText}>⚔️ 開戰場</span>
          <span className={styles.ctaArrow}>→</span>
        </div>
      </div>
    </Link>
  );
}
