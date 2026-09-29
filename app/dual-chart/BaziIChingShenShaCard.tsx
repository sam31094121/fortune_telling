'use client';

import type { DualChartResult } from '@/lib/dual-chart';
import BaziChart from './BaziChart';
import { ShenShaCard } from './BaziChart';
import styles from './dual-chart.module.css';

/**
 * 融合卡片：八字易經神煞命盤
 * 完全融合展示：八字四柱 + 特星神煞 + 易經解讀
 */
export default function BaziIChingShenShaCard({ result, language = 'zh' }: { result: DualChartResult; language?: string }) {
  return (
    <article className={`${styles.panel} ${styles.fusedChart}`} data-card="bazi-iching-shensha">
      <h2>八字易經神煞命盤</h2>
      <p className={styles.fusedSubtitle}>八字 → 特星神煞 → 易經 · 完全融合一體</p>

      {/* 八字命盤部分 - 保留核心，隱藏ShenShaCard（在融合卡片中單獨顯示） */}
      <BaziChart result={result} monochrome={false} language={language} hideShenShaCard={true} />

      {/* 特星神煞 + 易經融合部分 */}
      <section className={styles.shenshaIchingFused} aria-label="特星神煞易經融合">
        <ShenShaCard result={result} printMode={false} hideShenShaGrid={false} />
      </section>
    </article>
  );
}
