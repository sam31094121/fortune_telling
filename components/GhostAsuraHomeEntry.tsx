/**
 * 鬼魅阿修羅 — 主頁唯一獨立入口（080-16）
 *
 * 視覺：深黑墨色、金屬邊、少量暗紅；手機優先。
 * 連結：/ghost-asura（獨立解盤頁，非 dual-chart 附屬分頁）。
 *
 * 功能法術融入 · 2026-10-05：核心印記多層展示
 * - 主要印記：featured 印記完整展示
 * - 次要印記：網格快速預覽（點擊快速瀏覽）
 */

'use client';

import { useMemo, useState } from 'react';
import React from 'react';
import Link from 'next/link';
import HomeTranslatedText from '@/components/HomeTranslatedText';
import { stableHash } from '@/features/ghost-asura/language';
import styles from './GhostAsuraHomeEntry.module.css';
import brandStyles from './AsuraBrandTitle.module.css';

interface AsuraImpression {
  title: string;
  description: string;
  status: string;
}

/** 主頁展示用核心印記（對齊固定映射；非總數上限） */
const ASURA_CORE_IMPRESSIONS: AsuraImpression[] = [
  { title: '裂天劫印', description: '破局之力已甦醒，命運從此刻起向上翻轉', status: '力量覺醒' },
  { title: '五陰纏影', description: '靈魂之敵已現，用阿修羅之力反制與超越', status: '力量覺醒' },
  { title: '血刃之鋒', description: '行動力爆發，成就與威力俱在此刻', status: '力量覺醒' },
  { title: '魅生之印', description: '人緣與魅力的覺醒，吸引力進入新紀元', status: '力量覺醒' },
  { title: '天赦神契', description: '天佑之力護佑，逆轉與救贖同時啟動', status: '力量覺醒' },
  { title: '逐界行者', description: '超越界限的力量，向新世界展開行進', status: '力量覺醒' },
  { title: '鎮軍之魂', description: '領導力與號召力同步激活，掌控局勢', status: '力量覺醒' },
  { title: '虛界空印', description: '虛空的回聲中，重建與新生的機會浮現', status: '力量蟄伏' },
];

/** 穩定挑選 featured 印記：同環境每次一致，禁止 Math.random */
function pickStableFeaturedImpression(): AsuraImpression {
  const seed = stableHash('ghost-asura-home-entry|v1');
  return ASURA_CORE_IMPRESSIONS[seed % ASURA_CORE_IMPRESSIONS.length];
}

/** 取得次要印記（featured 除外） */
function getSecondaryImpressions(featured: AsuraImpression, count: number = 4): AsuraImpression[] {
  const others = ASURA_CORE_IMPRESSIONS.filter(imp => imp.title !== featured.title);
  return others.slice(0, count);
}

export default function GhostAsuraHomeEntry() {
  const featuredImpression = useMemo(() => pickStableFeaturedImpression(), []);
  const secondaryImpressions = useMemo(() => getSecondaryImpressions(featuredImpression, 4), [featuredImpression]);
  const [selectedImpression, setSelectedImpression] = useState<string | null>(null);
  const [hoveredSecondary, setHoveredSecondary] = useState<string | null>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);

  const displayedImpression = selectedImpression
    ? ASURA_CORE_IMPRESSIONS.find(imp => imp.title === selectedImpression) || featuredImpression
    : hoveredSecondary
      ? ASURA_CORE_IMPRESSIONS.find(imp => imp.title === hoveredSecondary) || featuredImpression
      : featuredImpression;

  // 鍵盤導航（↑↓←→）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();

      const allImpressions = [featuredImpression, ...secondaryImpressions];
      const currentIndex = selectedImpression
        ? allImpressions.findIndex(imp => imp.title === selectedImpression)
        : 0;

      let nextIndex = currentIndex;
      const itemsPerRow = 5;

      if (e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % allImpressions.length;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + allImpressions.length) % allImpressions.length;
      } else if (e.key === 'ArrowDown') {
        nextIndex = Math.min(currentIndex + itemsPerRow, allImpressions.length - 1);
      } else if (e.key === 'ArrowUp') {
        nextIndex = Math.max(currentIndex - itemsPerRow, 0);
      }

      setSelectedImpression(allImpressions[nextIndex].title);
    }
  };

  return (
    <div
      className={styles.wrapper}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="鬼魅阿修羅主頁卡片"
      tabIndex={0}
    >
      <Link
        href="/ghost-asura"
        className={`${styles.entry} home-feature-launch home-feature-tier-primary order-9 w-full`}
        data-card-type="ghost-asura-home-entry"
        aria-label="鬼魅阿修羅｜開啟阿修羅秘卷"
        onClick={(e) => {
          if (selectedImpression || hoveredSecondary) e.preventDefault();
        }}
      >
      <div className={styles.content}>
        <span className={styles.emblem} aria-hidden="true">修</span>
        <div className={styles.copy}>
          <span className={styles.eyebrow}><HomeTranslatedText text="本命阿修羅 · 四柱隱影解盤" /></span>
          <h2 className={brandStyles.brush} data-asura-brand-title><HomeTranslatedText text="鬼魅阿修羅" /></h2>
          <p><HomeTranslatedText text="剖析四柱陰影、隱性衝突與內在力量。找到駕馭自己的方式。" /></p>
          <p className={styles.impression}>
            <HomeTranslatedText text={`印記示意：${displayedImpression.title}`} />
          </p>
        </div>
      </div>

      {/* 核心印記快速預覽網格 */}
      <div className={styles.impressionGrid} ref={gridRef}>
        <div className={styles.gridLabel}>
          <HomeTranslatedText text="核心印記" />
        </div>
        <div className={styles.gridContainer} role="group" aria-label="核心印記選擇">
          <button
            type="button"
            className={`${styles.gridItem} ${selectedImpression === null || selectedImpression === featuredImpression.title ? styles.active : ''} ${selectedImpression === featuredImpression.title ? styles.clicked : ''}`}
            onMouseEnter={() => setHoveredSecondary(null)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedImpression(featuredImpression.title);
            }}
            title={featuredImpression.title}
            aria-label={`選擇 ${featuredImpression.title}`}
          >
            <span className={styles.gridTitle}>{featuredImpression.title.slice(0, 3)}</span>
            <span className={styles.gridStatus}>{featuredImpression.status}</span>
          </button>
          {secondaryImpressions.map((imp) => (
            <button
              key={imp.title}
              type="button"
              className={`${styles.gridItem} ${selectedImpression === imp.title ? styles.active : ''} ${selectedImpression === imp.title ? styles.clicked : ''}`}
              onMouseEnter={() => setHoveredSecondary(imp.title)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedImpression(imp.title);
              }}
              title={imp.title}
              aria-label={`選擇 ${imp.title}`}
            >
              <span className={styles.gridTitle}>{imp.title.slice(0, 3)}</span>
              <span className={styles.gridStatus}>{imp.status}</span>
            </button>
          ))}
        </div>

        {/* 印記完整描述 + 功能層擴展 */}
        <div className={`${styles.descriptionBox} ${selectedImpression || hoveredSecondary ? styles.show : ''}`}>
          <div className={styles.descriptionHeader}>
            <p className={styles.descriptionTitle}><HomeTranslatedText text={displayedImpression.title} /></p>
            <span className={`${styles.statusBadge} ${displayedImpression.status === '力量覺醒' ? styles.awakened : styles.dormant}`}>
              <HomeTranslatedText text={displayedImpression.status} />
            </span>
          </div>
          <p className={styles.descriptionText}><HomeTranslatedText text={displayedImpression.description} /></p>

          {/* 功能特性預覽 */}
          <div className={styles.featurePreview}>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>⚔️</span>
              <span className={styles.featureLabel}><HomeTranslatedText text="法術特性" /></span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>📊</span>
              <span className={styles.featureLabel}><HomeTranslatedText text="命盤影響" /></span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>🎯</span>
              <span className={styles.featureLabel}><HomeTranslatedText text="轉化方式" /></span>
            </div>
          </div>

          {/* 快速行動按鈕 */}
          <button
            type="button"
            className={styles.learnMoreBtn}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = '/ghost-asura';
            }}
            aria-label={`深入了解 ${displayedImpression.title}`}
          >
            <HomeTranslatedText text="深入解析此印記" />
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div className={styles.meta}>
        <span><HomeTranslatedText text="免費" /></span>
        <span><HomeTranslatedText text="3 分鐘" /></span>
        <span><HomeTranslatedText text="立即解盤" /></span>
      </div>
      <div className={`${styles.cta} home-feature-cta`}>
        <HomeTranslatedText text="立即解盤" /><span aria-hidden="true">→</span>
      </div>
      </Link>
    </div>
  );
}
