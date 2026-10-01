/**
 * 首頁獨立阿修羅卡片 — 純阿修羅版本
 *
 * 工程師專用｜直接開工版
 *
 * 特徵：
 * ✅ 不顯示八字四柱
 * ✅ 不顯示紫微斗數
 * ✅ 只顯示阿修羅內容
 * ✅ 完全獨立元件
 * ✅ featured 印記以 stableHash 固定挑選，禁止隨機
 * ✅ 視覺：深黑墨色、微霧、金屬邊框、少量暗紅（附件十五）
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import HomeTranslatedText from '@/components/HomeTranslatedText';
import HomeTrustEvidence from '@/components/HomeTrustEvidence';
import { FIXED_ASURA_MAP, stableHash } from '@/lib/asura-name-map';

interface AsuraImpression {
  title: string;
  description: string;
  status: string;
}

/**
 * 主頁展示用核心印記（對齊固定映射；非總數上限）
 */
const ASURA_CORE_IMPRESSIONS: AsuraImpression[] = [
  { title: '裂天劫印', description: '劫勢未成形，先布防、先斬斷、先破局', status: '印記覺醒' },
  { title: '五陰纏影', description: '陰氣已纏命魂，陰影合圍前先鎮碎', status: '印記覺醒' },
  { title: '血刃之鋒', description: '爆發與鋒利的行動力', status: '印記覺醒' },
  { title: '魅生之印', description: '魅力與人緣的印記', status: '印記覺醒' },
  { title: '天赦神契', description: '化解劫勢的護佑之力', status: '印記覺醒' },
  { title: '逐界行者', description: '打破界限的移動力量', status: '印記覺醒' },
  { title: '鎮軍之魂', description: '領導與掌控的戰魂', status: '印記覺醒' },
  { title: '虛界空印', description: '空白本身就是劫難，先看清再填補', status: '印記沉眠' },
];

/**
 * 穩定挑選 featured 印記：同環境每次一致，禁止 Math.random
 */
function pickStableFeaturedImpression(): AsuraImpression {
  const seed = stableHash('ghost-asura-home-featured|v1');
  return ASURA_CORE_IMPRESSIONS[seed % ASURA_CORE_IMPRESSIONS.length];
}

/**
 * 首頁獨立卡片
 */
export default function GhostAsuraHomeStandalone() {
  const [isHovered, setIsHovered] = useState(false);

  const featuredImpression = useMemo(() => pickStableFeaturedImpression(), []);

  // 守門：featured 必須來自固定映射或核心展示清單
  const featuredIsKnown =
    Object.values(FIXED_ASURA_MAP).includes(featuredImpression.title) ||
    ASURA_CORE_IMPRESSIONS.some((item) => item.title === featuredImpression.title);

  if (!featuredIsKnown) {
    console.error('[GhostAsuraHomeStandalone] featured 印記不在固定映射', featuredImpression.title);
  }

  return (
    <Link
      href="/dual-chart"
      className="home-feature-launch home-feature-tier-primary order-9 w-full relative group overflow-hidden rounded-3xl border border-zinc-500/45 bg-[radial-gradient(circle_at_18%_28%,rgba(127,29,29,0.22),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(63,63,70,0.18),transparent_30%),linear-gradient(115deg,rgba(8,8,10,0.99),rgba(18,14,16,0.97),rgba(8,8,10,0.99))] p-6 text-left shadow-[0_0_34px_rgba(127,29,29,0.18)] transition-[border-color,box-shadow,transform] duration-500 hover:border-red-800/55 hover:shadow-[0_0_48px_rgba(127,29,29,0.28)] active:scale-[0.99] flex items-center justify-between gap-6 flex-wrap"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-card-type="ghost-asura-home-standalone"
      aria-label="鬼魅阿修羅｜命魂戰局入口"
    >
      {/* 微霧／金屬邊線 */}
      <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-soft-light bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_55%)]" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-300/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-red-900/35 to-transparent" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-950/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2.4s_infinite] pointer-events-none" />

      {/* 左側：名稱 → 印記狀態 → 簡述 */}
      <div className="relative flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
        <div
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-zinc-400/40 bg-gradient-to-br from-zinc-800/80 to-red-950/40 font-serif text-2xl font-black text-zinc-100 shadow-[0_0_28px_rgba(127,29,29,0.28)] transition-transform duration-300 group-hover:scale-105"
          aria-hidden="true"
        >
          ⚡
        </div>

        <div className="min-w-0 flex-1">
          <div className="inline-block rounded-full bg-zinc-900/70 border border-zinc-500/40 px-3 py-0.5 text-[10px] font-bold tracking-widest text-zinc-200 uppercase mb-1">
            <HomeTranslatedText text={"本命阿修羅"} />
          </div>
          <h2 className="mt-1.5 font-serif text-xl sm:text-2xl font-black text-zinc-50 tracking-wide">
            <HomeTranslatedText text={"命魂戰局"} />
          </h2>
          <p className="mt-1 text-[11px] leading-5 text-red-200/80">
            <HomeTranslatedText text={`${featuredImpression.status}｜${featuredImpression.title}`} />
          </p>
          <p className="mt-0.5 text-xs leading-5 text-zinc-300/80">
            <HomeTranslatedText text={featuredImpression.description} />
          </p>
        </div>
      </div>

      {/* 右側：信任徽章 + CTA */}
      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        <HomeTrustEvidence items={["免費", "一鍵查詢", "阿修羅秘卷"]} />

        <div className="home-feature-cta relative flex items-center gap-2 rounded-xl border border-zinc-400/40 bg-zinc-900/60 px-5 py-3 text-xs font-bold text-zinc-100 transition group-hover:bg-red-950/35 group-hover:border-red-800/50">
          <span>
            <HomeTranslatedText text={"開啟命魂戰局"} />
          </span>
          <span className="transition-transform group-hover:translate-x-1.5">
            ➜
          </span>
        </div>
      </div>

      {isHovered && (
        <div className="absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-t from-red-950/25 via-transparent to-transparent" />
      )}
    </Link>
  );
}
