/**
 * 鬼魅阿修羅 — 主頁唯一獨立入口（080-16）
 *
 * 視覺：深黑墨色、金屬邊、少量暗紅；手機優先。
 * 連結：/ghost-asura（獨立解盤頁，非 dual-chart 附屬分頁）。
 */

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import HomeTranslatedText from '@/components/HomeTranslatedText';
import HomeTrustEvidence from '@/components/HomeTrustEvidence';
import { FIXED_ASURA_MAP, stableHash } from '@/lib/asura-name-map';

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
  const [isHovered, setIsHovered] = useState(false);
  const featuredImpression = useMemo(() => pickStableFeaturedImpression(), []);

  const featuredIsKnown =
    Object.values(FIXED_ASURA_MAP).includes(featuredImpression.title) ||
    ASURA_CORE_IMPRESSIONS.some((item) => item.title === featuredImpression.title);

  if (!featuredIsKnown) {
    console.error('[GhostAsuraHomeEntry] featured 印記不在固定映射', featuredImpression.title);
  }

  return (
    <Link
      href="/ghost-asura"
      className="home-feature-launch home-feature-tier-primary order-9 w-full relative group overflow-hidden rounded-3xl border border-amber-500/65 bg-[radial-gradient(circle_at_18%_28%,rgba(217,119,6,0.25),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(120,53,15,0.22),transparent_30%),linear-gradient(115deg,rgba(20,13,10,0.97),rgba(28,20,15,0.95),rgba(20,13,10,0.97))] p-5 sm:p-6 text-left shadow-[0_0_52px_rgba(217,119,6,0.35)] transition-[border-color,box-shadow,transform] duration-500 hover:border-amber-400/75 hover:shadow-[0_0_68px_rgba(217,119,6,0.48)] active:scale-[0.99] flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-card-type="ghost-asura-home-entry"
      aria-label="鬼魅阿修羅｜開啟阿修羅秘卷"
    >
      {/* 微霧／金屬邊線 */}
      <div className="absolute inset-0 pointer-events-none opacity-50 mix-blend-soft-light bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_55%)]" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-700/35 to-transparent" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-600/12 to-transparent -translate-x-full group-hover:animate-[shimmer_2.4s_infinite] pointer-events-none" />

      {/* 表格式網格佈局（借鑒八字命盤） */}
      <div className="relative w-full">
        {/* 第一行：圖標、狀態、免費、時間 */}
        <div className="grid grid-cols-4 gap-0 border-b border-amber-500/30 pb-3">
          {/* 左：圖標 */}
          <div className="col-span-1 flex items-center justify-center">
            <div
              className="grid h-12 w-12 place-items-center rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-700/60 to-orange-900/40 font-serif text-2xl font-black text-amber-100 shadow-[0_0_24px_rgba(217,119,6,0.3)] transition-transform duration-300 group-hover:scale-105 group-active:scale-85"
              aria-hidden="true"
            >
              ⚡
            </div>
          </div>

          {/* 中左：狀態標籤 */}
          <div className="col-span-1 flex items-center pl-2">
            <span className="text-[10px] font-black tracking-widest text-amber-200">
              <HomeTranslatedText text={`${featuredImpression.status}`} />
            </span>
          </div>

          {/* 中右：免費 */}
          <div className="col-span-1 flex items-center justify-center">
            <div className="inline-flex items-center rounded-full bg-amber-950/60 border border-amber-600/50 px-2.5 py-1 text-[8px] font-bold tracking-widest text-amber-200 uppercase">
              <HomeTranslatedText text={'免費'} />
            </div>
          </div>

          {/* 右：時間 */}
          <div className="col-span-1 flex items-center justify-end">
            <span className="text-[10px] font-bold text-amber-200/70 px-2.5 py-1 rounded-full border border-amber-400/30 bg-amber-950/40">
              <HomeTranslatedText text={'3 分鐘'} />
            </span>
          </div>
        </div>

        {/* 第二行：主標題「命魂戰局」跨越全寬 */}
        <div className="grid grid-cols-1 gap-0 border-b border-amber-500/30 py-3">
          <h2 className="font-serif text-3xl sm:text-4xl font-black text-amber-50 text-center tracking-tight drop-shadow-lg">
            <HomeTranslatedText text={'命魂戰局'} />
          </h2>
        </div>

        {/* 第三行：印記名稱 */}
        <div className="grid grid-cols-1 gap-0 border-b border-amber-500/30 py-2.5">
          <p className="text-[12px] sm:text-[13px] font-semibold text-amber-300 text-center">
            <HomeTranslatedText text={featuredImpression.title} />
          </p>
        </div>

        {/* 第四行：CTA 按鈕 */}
        <div className="grid grid-cols-1 gap-0 pt-3">
          <div className="home-feature-cta flex items-center justify-center gap-2.5 rounded-2xl border-2 border-amber-400/75 bg-gradient-to-r from-amber-600/55 to-orange-600/45 px-6 py-4 sm:py-5 text-sm sm:text-base font-bold text-amber-50 shadow-[0_0_28px_rgba(217,119,6,0.4)] transition-all duration-300 group-hover:border-amber-300/90 group-hover:shadow-[0_0_44px_rgba(217,119,6,0.55)] group-hover:bg-gradient-to-r group-hover:from-amber-600/70 group-hover:to-orange-600/60 active:scale-95 active:shadow-[0_0_18px_rgba(217,119,6,0.25)]">
            <span>
              <HomeTranslatedText text={'開啟秘卷'} />
            </span>
            <span className="transition-transform duration-300 group-hover:translate-x-2 group-active:translate-x-0">→</span>
          </div>
        </div>
      </div>

      {isHovered && (
        <div className="absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-t from-amber-600/15 via-transparent to-transparent" />
      )}
    </Link>
  );
}
