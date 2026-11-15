/**
 * 合併強化體系（神獸戰鬥 × 寶石捷連線）PLAN-v2 的平衡參數與共用規則。
 *
 * ‧ 本檔所有數字一律是【待平衡暫定值】，不是最終規格；要改只改這裡。
 * ‧ 全部只在功能開關 NEXT_PUBLIC_M3_FEED_CHAIN === '1' 時生效；開關關閉時，寶珠闖關數值與舊版完全相同。
 * ‧ 只讀新正式卡 cards/beasts（卡面相關規則在 merge-tier.ts）；不改卡面數值。
 * ‧ 本檔刻意不引用卡片登錄，讓 progression／card-attack 這類純規則檔可以單獨編譯。
 * ‧ 魔珠效果與計算尚未定稿，本檔不碰魔珠。
 */
import { elementMultiplier, type BeastElement } from '../elements';

/** 未設定時等於關閉；沿用 config.ts 的 '1' 慣例。 */
export function feedChainEnabled(value: string | undefined = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_M3_FEED_CHAIN : undefined): boolean {
  return value === '1';
}

export const MERGE_BALANCE = {
  /** 【待平衡暫定值】連結攻擊（只在寶珠闖關 hard45／hard45b 生效）：每張卡用自己的主屬性對目標套克制，再乘這兩個係數。 */
  linkBaseMultiplier: 1,
  linkBonusPerExtra: 0.25,
  /** 【待平衡暫定值】前 5 關（勝場 0–4）敵方壓力：反擊攻擊與血量倍率。第 6 關起不變，第 8 關起的總預算也不變。 */
  earlyPressureStages: 5,
  earlyAttackMultiplier: 2.5,
  earlyHpMultiplier: 1.15,
  /** 【待平衡暫定值】共鳴格：每張成獸最多幾格、每格加卡面攻擊幾成（捨去、至少 +1）。共鳴與其他強化共用同一個上限，不另外乘。 */
  resonanceSlots: 3,
  resonanceRatio: 0.05,
  /** 單卡強化上限＝卡面攻擊 ×50%（沿用現行規則）。 */
  attackCapRatio: 0.5,
} as const;

/**
 * 寶珠闖關連結攻擊（開關開啟時）：每張卡＝攻擊 × 自己主屬性對目標的克制倍率，合計後 × 基礎係數 × (1 + (張數−2) × 每多一張加成)。
 * 只有卡片主屬性參與（不是無屬性傷害）。
 */
export function campaignLinkDamage(cards: readonly { attack: number; element: BeastElement }[], defender: BeastElement): number {
  const sum = cards.reduce((s, c) => s + c.attack * elementMultiplier(c.element, defender), 0);
  return Math.round(sum * MERGE_BALANCE.linkBaseMultiplier * (1 + Math.max(0, cards.length - 2) * MERGE_BALANCE.linkBonusPerExtra));
}

/** 前 5 關壓力倍率；勝場 ≥5 一律 1（舊值）。 */
export function earlyPressure(wins: number, enabled: boolean = feedChainEnabled()): { attack: number; hp: number } {
  if (!enabled || !Number.isFinite(wins) || wins >= MERGE_BALANCE.earlyPressureStages) return { attack: 1, hp: 1 };
  return { attack: MERGE_BALANCE.earlyAttackMultiplier, hp: MERGE_BALANCE.earlyHpMultiplier };
}
