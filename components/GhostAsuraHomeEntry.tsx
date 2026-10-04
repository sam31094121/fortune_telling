/**
 * 鬼魅阿修羅 — 主頁唯一獨立入口（080-16）
 *
 * 視覺：深黑墨色、金屬邊、少量暗紅；手機優先。
 * 連結：/ghost-asura（獨立解盤頁，非 dual-chart 附屬分頁）。
 */

'use client';

import { useMemo } from 'react';
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

export default function GhostAsuraHomeEntry() {
  const featuredImpression = useMemo(() => pickStableFeaturedImpression(), []);

  return (
    <Link
      href="/ghost-asura"
      className={`${styles.entry} home-feature-launch home-feature-tier-primary order-9 w-full`}
      data-card-type="ghost-asura-home-entry"
      aria-label="鬼魅阿修羅｜開啟阿修羅秘卷"
    >
      <div className={styles.content}>
        <span className={styles.emblem} aria-hidden="true">修</span>
        <div className={styles.copy}>
          <span className={styles.eyebrow}><HomeTranslatedText text="本命阿修羅 · 四柱隱影解盤" /></span>
          <h2 className={brandStyles.brush} data-asura-brand-title><HomeTranslatedText text="鬼魅阿修羅" /></h2>
          <p><HomeTranslatedText text="剖析四柱陰影、隱性衝突與內在力量。找到駕馭自己的方式。" /></p>
          <p className={styles.impression}><HomeTranslatedText text={`印記示意：${featuredImpression.title}`} /></p>
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
  );
}
