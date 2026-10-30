/**
 * 寶珠精修（奢華感的低調）：畫面節奏與顏色對應的可調參數。只管畫面，不含任何傷害或卡片數值。
 * 顏色一律引用專案既有色票，不新增 hex：
 *  - 元素色：lib/beast-game/element-palette.ts ELEMENT_PALETTE（風 #54d9ad、空 #bd97ff、水 #68b9ff、火 #ff747a、地 #efca77）
 *  - 墨夜底 --ink #14121a、盤面 #1c1922、骨白 --bone #e8e1d3、象牙 --ivory #d9cfbb、火漆金 --seal #b8893a、魔法珠金 #ffe3a1
 *    （components/battlefield/Match3Board.module.css）
 *  - 卡框金 #d6b86a／深金 #8a6c33／淡金 #f6d98f（components/battlefield/BeastCardTile.module.css）
 */
import { ELEMENT_PALETTE, type BeadElement } from '../element-palette';

export const BEAD_TOKENS = {
  ink: '#14121a', boardBg: '#1c1922', bone: '#e8e1d3', ivory: '#d9cfbb', seal: '#b8893a',
  magicGold: '#ffe3a1', frameGold: '#d6b86a', deepGold: '#8a6c33', paleGold: '#f6d98f',
} as const;

/** 珠身：元素色與墨夜底混色（降飽和），全彩只留給小點綴（圖示、線、粒子）。 */
export const BODY_MIX_PCT = 30;
export const beadBody = (el: BeadElement) => `color-mix(in srgb, ${ELEMENT_PALETTE[el]} ${BODY_MIX_PCT}%, ${BEAD_TOKENS.ink})`;

/** 連線分級：3 一般／4 魔珠／5 五珠技／10 普通威力上限。 */
export type LinkTier = 'short' | 'normal' | 'magic' | 'skill5' | 'cap';
export function linkTier(n: number, cap = 10, magicMin = 4, skillLen = 5): LinkTier {
  if (n < 3) return 'short';
  if (n === skillLen) return 'skill5';
  if (n >= cap) return 'cap';
  if (n >= magicMin) return 'magic';
  return 'normal';
}
export const LINK_TIER_LABEL: Record<LinkTier, string> = { short: '', normal: '一般', magic: '魔珠', skill5: '五珠技', cap: '上限 10' };
/** 線色：一般＝元素色、魔珠＝魔法珠金、五珠技＝卡框金、上限＝淡金；未滿 3＝象牙（半透明）。 */
export function linkColor(el: BeadElement, tier: LinkTier): string {
  switch (tier) {
    case 'magic': return BEAD_TOKENS.magicGold;
    case 'skill5': return BEAD_TOKENS.frameGold;
    case 'cap': return BEAD_TOKENS.paleGold;
    case 'short': return BEAD_TOKENS.ivory;
    default: return ELEMENT_PALETTE[el];
  }
}
/** 計數徽章大小隨 N 長大（到 12 顆封頂）。 */
export const badgeScale = (n: number) => 1 + Math.min(Math.max(n - 3, 0), 9) * 0.06;

/** 節奏（毫秒）：依路徑順序逐顆彈出，之後留一拍，再發動攻擊／下一段。 */
export const BEAD_TIMING = {
  popStaggerMs: 34,
  popStaggerMaxMs: 300,
  popMs: 220,
  beatMs: 160,
  fallMs: 380,
  fallRowStaggerMs: 26,
  stepLabelMs: 900,
} as const;
/** 一段消除所需時間（彈出＋一拍），盤面會照這個節奏播放每一段。 */
export function stepDuration(size: number): number {
  const stagger = Math.min(BEAD_TIMING.popStaggerMs * Math.max(size - 1, 0), BEAD_TIMING.popStaggerMaxMs);
  return stagger + BEAD_TIMING.popMs + BEAD_TIMING.beatMs;
}
/** 粒子：少而小。 */
export const PARTICLES_PER_BEAD = 2;
export const PARTICLES_MAX = 18;
/** 魔珠光暈強度 0.25..1，隨威力（顆數）上升，不設上限但畫面到 12 顆封頂。 */
export const magicIntensity = (n: number) => Math.min(1, 0.25 + Math.max(n - 4, 0) * 0.094);

/** v3 精修：連線動態與徽章位置（全部可調）。 */
export const LINK_MOTION = {
  /** 徽章離連線頭的垂直距離（px），避開手指。 */
  badgeOffsetY: 54,
  /** 頭太靠近上緣時改放側邊。 */
  badgeFlipTopPx: 64,
  badgeSideX: 52,
  /** 分級（3→4→5→10）色彩／標籤交叉淡化時間。 */
  tierMs: 240,
  /** 徽章跟隨的過渡時間。 */
  followMs: 140,
} as const;

/** v3 精修：橫幅排隊（五珠技與魔珠同時發生時依序出現，不重疊）。 */
export const BANNER_QUEUE = {
  holdMs: 1400,
  /** 後面還有排隊時，縮短停留。 */
  holdWhenQueuedMs: 1050,
  /** 兩則之間的空檔，讓前一則淡出。 */
  gapMs: 160,
} as const;