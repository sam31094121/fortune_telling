'use client';

import { GhostAsuraCardResponse } from '@/lib/types/ghost-asura-response';
import styles from './GhostAsuraCard.module.css';

interface GhostAsuraCardProps {
  data: GhostAsuraCardResponse;
  isLoading?: boolean;
}

/**
 * 鬼魅阿修羅卡片 - 純視覺呈現
 *
 * ⚠️ 鐵律：
 * - 只接收後端資料 → 直接渲染
 * - 不運算、不修改、不生成任何文字
 * - 不決定排版 → CSS 全權負責
 * - 所有中文句子來自後端 data.*.xxx
 */
export default function GhostAsuraCard({ data, isLoading }: GhostAsuraCardProps) {
  if (isLoading) {
    return <div className={styles.loading}>正在覺醒...</div>;
  }

  if (!data || !data.meta.verified) {
    return <div className={styles.error}>無法載入命盤資訊</div>;
  }

  return (
    <div
      className={styles.card}
      style={{
        '--theme-color': data.visual.themeColor,
        '--accent-color': data.visual.accentColor,
      } as React.CSSProperties}
    >
      {/* 頭部：使用者資訊 */}
      <header className={styles.header}>
        <h1 className={styles.title}>{data.user.name}</h1>
        <time className={styles.birthDate}>{data.user.birthDate}</time>
        {data.user.birthTime && (
          <time className={styles.birthTime}>{data.user.birthTime}</time>
        )}
      </header>

      {/* 四柱展示 */}
      <section className={styles.baziSection} aria-label="四柱">
        <h2 className={styles.sectionTitle}>四柱命盤</h2>
        <div className={styles.pillars}>
          {data.bazi.pillars.map((pillar) => (
            <div
              key={pillar.name}
              className={styles.pillar}
              style={{ borderColor: pillar.elementColor }}
            >
              <div className={styles.pillarName}>{pillar.name}</div>
              <div className={styles.pillarStemBranch}>
                {pillar.stem}
                <br />
                {pillar.branch}
              </div>
              <div className={styles.pillarElement}>{pillar.element}</div>
            </div>
          ))}
        </div>
        <article className={styles.baziAnalysis}>
          {/* 純照印，不做任何處理 */}
          {data.bazi.analysis}
        </article>
      </section>

      {/* 第二層：命理融合 */}
      {data.ziwei && (
        <section className={styles.ziweiSection} aria-label="命理融合">
          <h2 className={styles.sectionTitle}>命理融合層</h2>
          {data.ziwei.verification.status === 'MISMATCH' && (
            <div className={styles.warning} role="alert">
              ⚠️ {data.ziwei.verification.message}
            </div>
          )}
          <article className={styles.ziweiAnalysis}>
            {data.ziwei.chart.analysis}
          </article>
        </section>
      )}

      {/* 特星神煞 */}
      {data.shensha && (
        <section className={styles.shenShaSection} aria-label="特星神煞">
          <h2 className={styles.sectionTitle}>特星神煞</h2>
          <div className={styles.shenShaGrid}>
            {data.shensha.items.map((item) => (
              <div key={item.id} className={styles.shenShaItem}>
                <h3 className={styles.shenShaName}>{item.name}</h3>
                <div className={styles.shenShaCategory}>{item.category}</div>
                <div className={styles.shenShaPillar}>{item.pillar}</div>
                <p className={styles.shenShaDesc}>{item.description}</p>
                {item.psychology && (
                  <details className={styles.psychology}>
                    <summary>心理學視角</summary>
                    <div className={styles.psychologyContent}>
                      <p>
                        <strong>殼：</strong>
                        {item.psychology.shell}
                      </p>
                      <p>
                        <strong>心：</strong>
                        {item.psychology.heart}
                      </p>
                      <p>
                        <strong>禮物：</strong>
                        {item.psychology.gift}
                      </p>
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
          {data.shensha.combo && (
            <article className={styles.shenShaCombo}>
              <h3>整盤神煞組合</h3>
              {data.shensha.combo}
            </article>
          )}
        </section>
      )}

      {/* 易經卜卦 */}
      {data.iching && (
        <section className={styles.ichingSection} aria-label="易經卜卦">
          <h2 className={styles.sectionTitle}>易經卜卦</h2>
          <div className={styles.ichingHexagram}>
            <h3>
              {data.iching.result.hexagram}. {data.iching.result.name}
            </h3>
          </div>
          <article className={styles.ichingContent}>
            {data.iching.result.judgment && (
              <div className={styles.ichingJudgment}>
                <h4>爻位解讀</h4>
                {data.iching.result.judgment}
              </div>
            )}
            {data.iching.result.guidance && (
              <div className={styles.ichingGuidance}>
                <h4>人生指引</h4>
                {data.iching.result.guidance}
              </div>
            )}
            {data.iching.result.psychology && (
              <div className={styles.ichingPsychology}>
                <h4>心理學視角</h4>
                {data.iching.result.psychology}
              </div>
            )}
          </article>
        </section>
      )}

      {/* 阿修羅老師解盤 */}
      {data.teacherReading && (
        <section className={styles.teacherSection} aria-label="阿修羅老師解盤">
          <h2 className={styles.sectionTitle}>阿修羅老師解盤</h2>
          <article className={styles.teacherContent}>
            {data.teacherReading.opening && (
              <p className={styles.teacherOpening}>
                {data.teacherReading.opening}
              </p>
            )}
            {data.teacherReading.mainInsight && (
              <div className={styles.teacherInsight}>
                {data.teacherReading.mainInsight}
              </div>
            )}
            {data.teacherReading.lifeGuidance && (
              <div className={styles.teacherGuidance}>
                {data.teacherReading.lifeGuidance}
              </div>
            )}
            {data.teacherReading.closing && (
              <p className={styles.teacherClosing}>
                {data.teacherReading.closing}
              </p>
            )}
          </article>
        </section>
      )}

      {/* 頁尾 */}
      <footer className={styles.footer}>
        <time>{new Date(data.meta.timestamp).toLocaleString('zh-TW')}</time>
      </footer>
    </div>
  );
}
