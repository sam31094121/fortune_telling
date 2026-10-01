/**
 * 鬼魅阿修羅 — 獨立卡片
 * ============================================================================
 * 業主定案 2026-09-30：獨立呈現，100% 阿修羅口吻與字體
 *
 * 後端數據：複用 buildShenShaAsura() 結果
 * 前端呈現：深紫黑 + 金色光，完全獨立風格
 * ============================================================================
 */

import type { DualChartResult } from '@/lib/dual-chart';
import { IchingShenShaAsuraSection } from '@/components/IchingShenShaAsuraSection';
import styles from './dual-chart.module.css';

export function GhostAsuraCard({ result }: { result: DualChartResult }) {
  const asura = result.specialStars?.asura;

  if (!asura) return null;
  if (asura.state === 'BLOCKED') return null;
  if (asura.state !== 'READY') return null;

  return (
    <section
      className={styles.ghostAsuraCard}
      aria-label="鬼魅阿修羅"
      data-shensha-card-state="asura"
      style={{
        // 深紫黑 + 金色光 配色覆蓋
        '--asura-black': '#0D0812',
        '--asura-silver': '#F5F5F5',
        '--asura-dark-red': '#D4AF37',
        '--asura-border': 'rgba(212, 175, 55, 0.3)',
        '--asura-panel': 'rgba(20, 15, 25, 0.9)',
        '--asura-text': '#F5F5F5',
        '--asura-muted': '#A89860',
      } as React.CSSProperties}
    >
      {/* 卡片標題 */}
      <header className={styles.ghostAsuraHeader}>
        <h3>⚡ 鬼魅阿修羅</h3>
        <p className={styles.ghostAsuraSubtitle}>八字 → 紫微 → 特星神煞 → 易經 → 戰神宣言</p>
      </header>

      {/* 核心內容：全部交給 IchingShenShaAsuraSection 照印 (自動應用上方 CSS 變數) */}
      <div style={{ display: 'contents' }}>
        <IchingShenShaAsuraSection view={asura} />
      </div>

      {/* 分享卡按鈕 */}
      <div className={styles.ghostAsuraShare} aria-label="分享">
        <button type="button" className={styles.ghostAsuraShareButton}>
          ⚡ 分享戰譜
        </button>
        <small>不含出生日期、時辰與姓名。</small>
      </div>
    </section>
  );
}
