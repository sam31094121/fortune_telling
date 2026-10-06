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

// 用戶交互追蹤 + 快取策略 (localStorage)
const STORAGE_KEY = 'asura_impression_analytics';
const CACHE_VERSION = 'v1'; // 快取版本控制
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 天過期

interface InteractionData {
  title: string;
  clicks: number;
  hovers: number;
  lastInteraction: number;
}

interface CachedData {
  version: string;
  timestamp: number;
  data: Record<string, InteractionData>;
}

function getCachedAnalytics(): Record<string, InteractionData> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};

    const cached: CachedData = JSON.parse(stored);

    // 檢查快取版本和過期時間
    if (cached.version !== CACHE_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return {};
    }

    if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(STORAGE_KEY);
      return {};
    }

    return cached.data || {};
  } catch (e) {
    return {};
  }
}

function trackInteraction(title: string, type: 'click' | 'hover') {
  try {
    const data = getCachedAnalytics();

    if (!data[title]) {
      data[title] = { title, clicks: 0, hovers: 0, lastInteraction: 0 };
    }

    if (type === 'click') {
      data[title].clicks += 1;
    } else {
      data[title].hovers += 1;
    }
    data[title].lastInteraction = Date.now();

    // 寫回快取
    const cached: CachedData = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      data,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch (e) {
    // 如果 localStorage 不可用，靜默失敗
  }
}

function getInteractionScore(imp: AsuraImpression): number {
  try {
    const data = getCachedAnalytics();
    const record = data[imp.title];
    if (!record) return 0;
    return (record.clicks * 3) + (record.hovers * 1); // 點擊權重更高
  } catch (e) {
    return 0;
  }
}

interface AsuraImpression {
  title: string;
  description: string;
  status: string;
  symbol?: string;
  backstory?: string;
}

/** 主頁展示用核心印記（對齊固定映射；非總數上限） */
const ASURA_CORE_IMPRESSIONS: AsuraImpression[] = [
  {
    title: '裂天劫印',
    description: '破局之力已甦醒，命運從此刻起向上翻轉',
    status: '力量覺醒',
    symbol: '⚡',
    backstory: '天劫之力，破開一切迷障，帶來命運的轉機。'
  },
  {
    title: '五陰纏影',
    description: '靈魂之敵已現，用阿修羅之力反制與超越',
    status: '力量覺醒',
    symbol: '🌑',
    backstory: '五蘊之影糾纏心靈，唯有直面方能超越。'
  },
  {
    title: '血刃之鋒',
    description: '行動力爆發，成就與威力俱在此刻',
    status: '力量覺醒',
    symbol: '🗡️',
    backstory: '銳利如刃，勇氣化作行動的力量。'
  },
  {
    title: '魅生之印',
    description: '人緣與魅力的覺醒，吸引力進入新紀元',
    status: '力量覺醒',
    symbol: '✨',
    backstory: '魅力綻放，人心所向，成為中心的力量。'
  },
  {
    title: '天赦神契',
    description: '天佑之力護佑，逆轉與救贖同時啟動',
    status: '力量覺醒',
    symbol: '🙏',
    backstory: '天意垂憐，眾生得救贖，一切皆有轉機。'
  },
  {
    title: '逐界行者',
    description: '超越界限的力量，向新世界展開行進',
    status: '力量覺醒',
    symbol: '🌍',
    backstory: '跨越疆界，探索未知，成為冒險家的象徵。'
  },
  {
    title: '鎮軍之魂',
    description: '領導力與號召力同步激活，掌控局勢',
    status: '力量覺醒',
    symbol: '👑',
    backstory: '掌控全局，領導眾人，成為眾星之王。'
  },
  {
    title: '虛界空印',
    description: '虛空的回聲中，重建與新生的機會浮現',
    status: '力量蟄伏',
    symbol: '🌀',
    backstory: '空無亦是力量，等待中醞釀重生。'
  },
];

/** 穩定挑選 featured 印記：同環境每次一致，禁止 Math.random */
function pickStableFeaturedImpression(): AsuraImpression {
  const seed = stableHash('ghost-asura-home-entry|v1');
  return ASURA_CORE_IMPRESSIONS[seed % ASURA_CORE_IMPRESSIONS.length];
}

/** 取得次要印記（featured 除外，根據交互頻率排序） */
function getSecondaryImpressions(featured: AsuraImpression, count: number = 4): AsuraImpression[] {
  const others = ASURA_CORE_IMPRESSIONS.filter(imp => imp.title !== featured.title);

  // 按交互分數降序排列（個性化推薦）
  const sorted = [...others].sort((a, b) => {
    const scoreA = getInteractionScore(a);
    const scoreB = getInteractionScore(b);
    if (scoreA !== scoreB) return scoreB - scoreA; // 高分優先
    // 若分數相同，保持原始順序
    return ASURA_CORE_IMPRESSIONS.indexOf(a) - ASURA_CORE_IMPRESSIONS.indexOf(b);
  });

  return sorted.slice(0, count);
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
            onMouseEnter={() => {
              setHoveredSecondary(null);
              trackInteraction(featuredImpression.title, 'hover');
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              trackInteraction(featuredImpression.title, 'click');
              setSelectedImpression(featuredImpression.title);
            }}
            title={featuredImpression.backstory || featuredImpression.title}
            aria-label={`選擇 ${featuredImpression.title}`}
          >
            <span className={styles.gridSymbol} aria-hidden="true">{featuredImpression.symbol}</span>
            <span className={styles.gridTitle}>{featuredImpression.title.slice(0, 3)}</span>
            <span className={styles.gridStatus}>{featuredImpression.status}</span>
          </button>
          {secondaryImpressions.map((imp) => (
            <button
              key={imp.title}
              type="button"
              className={`${styles.gridItem} ${selectedImpression === imp.title ? styles.active : ''} ${selectedImpression === imp.title ? styles.clicked : ''}`}
              onMouseEnter={() => {
                setHoveredSecondary(imp.title);
                trackInteraction(imp.title, 'hover');
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                trackInteraction(imp.title, 'click');
                setSelectedImpression(imp.title);
              }}
              title={imp.backstory || imp.title}
              aria-label={`選擇 ${imp.title}`}
            >
              <span className={styles.gridSymbol} aria-hidden="true">{imp.symbol}</span>
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
