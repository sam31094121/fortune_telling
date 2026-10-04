'use client';

import { GhostAsuraTimelineResponse } from '@/lib/types/ghost-asura-timeline';
import { renderTimelineWithAsuraVoice } from '@/lib/asura-timeline-renderer';
import styles from './GhostAsuraTimelineCard.module.css';

interface GhostAsuraTimelineCardProps {
  data: GhostAsuraTimelineResponse;
  isLoading?: boolean;
}

/**
 * 鬼魅阿修羅 - 命運流年三時段卡片
 *
 * ⚠️ 鐵律：
 * 1. 禁止自撰話術 → 全部來自 asura-timeline-renderer.ts
 * 2. 禁止根據數據決定邏輯 → 只照印
 * 3. 禁止修改或拼接文字 → 直接渲染
 */
export default function GhostAsuraTimelineCard({
  data,
  isLoading,
}: GhostAsuraTimelineCardProps) {
  if (isLoading) {
    return <div className={styles.loading}>時光正在編織...</div>;
  }

  if (!data) {
    return <div className={styles.error}>無法載入時段資訊</div>;
  }

  // 調用話術生成器（前端最後一步）
  const renderedText = renderTimelineWithAsuraVoice(data);

  return (
    <div className={styles.container}>
      {/* 標題 */}
      <header className={styles.header}>
        <h1 className={styles.title}>{data.user.name} 的命運流年</h1>
        <p className={styles.subtitle}>過去 → 現在 → 未來</p>
      </header>

      {/* 三時段卡片 - 水平排列 */}
      <div className={styles.timelineGrid}>
        {/* 過去卡片 */}
        <section
          className={styles.card}
          style={{
            '--card-color': data.timeline.past.visual.themeColor,
          } as React.CSSProperties}
        >
          <div className={styles.cardHeader}>
            <span className={styles.icon}>{data.timeline.past.visual.icon}</span>
            <h2 className={styles.cardTitle}>{renderedText.past.title}</h2>
          </div>
          <article className={styles.cardContent}>
            <p className={styles.opening}>{renderedText.past.opening}</p>
            <div className={styles.insight}>
              <h3>洞見</h3>
              {renderedText.past.insight}
            </div>
            <div className={styles.lesson}>
              <h3>教訓</h3>
              {renderedText.past.lesson}
            </div>
          </article>
        </section>

        {/* 現在卡片 */}
        <section
          className={styles.card}
          style={{
            '--card-color': data.timeline.present.visual.themeColor,
          } as React.CSSProperties}
        >
          <div className={styles.cardHeader}>
            <span className={styles.icon}>{data.timeline.present.visual.icon}</span>
            <h2 className={styles.cardTitle}>{renderedText.present.title}</h2>
          </div>
          <article className={styles.cardContent}>
            <div className={styles.challenge}>
              <h3>挑戰</h3>
              {renderedText.present.challenge}
            </div>
            <div className={styles.strength}>
              <h3>優勢</h3>
              {renderedText.present.strength}
            </div>
            <div className={styles.action}>
              <h3>行動</h3>
              {renderedText.present.action}
            </div>
          </article>
        </section>

        {/* 未來卡片 */}
        <section
          className={styles.card}
          style={{
            '--card-color': data.timeline.future.visual.themeColor,
          } as React.CSSProperties}
        >
          <div className={styles.cardHeader}>
            <span className={styles.icon}>{data.timeline.future.visual.icon}</span>
            <h2 className={styles.cardTitle}>{renderedText.future.title}</h2>
          </div>
          <article className={styles.cardContent}>
            <div className={styles.opportunity}>
              <h3>機遇</h3>
              {renderedText.future.opportunity}
            </div>
            <div className={styles.warning}>
              <h3>警示</h3>
              {renderedText.future.warning}
            </div>
            <div className={styles.vision}>
              <h3>願景</h3>
              {renderedText.future.vision}
            </div>
          </article>
        </section>
      </div>

      {/* 整體趨勢 */}
      <section className={styles.summary}>
        <h2>整體趨勢</h2>
        <div className={styles.trajectory}>
          {renderedText.summary.trajectory}
        </div>
        <div className={styles.finalMessage}>
          {renderedText.summary.finalMessage}
        </div>
      </section>

      {/* 頁尾 */}
      <footer className={styles.footer}>
        <time>{new Date(data.meta.timestamp).toLocaleString('zh-TW')}</time>
      </footer>
    </div>
  );
}
