/**
 * 食物鏈（卡吃卡）規則參數——全部是「待平衡暫定值」，使用者 2026-11-15 22:20 拍板採計畫推薦做法：
 *   1A 每吃一張的加成維持現行（材料卡面攻擊 ÷10 取整、至少 +1），畫面另外換算「約 +X%」
 *   2B 加成總和上限＝目標卡面攻擊 50%
 *   3B 本體被四大神獸吃掉時，傳承它已累積加成的 50%（取整）
 *   4A 無同屬性加成　6A 不給開局能量　7A 嚴格逐層　8A 被吃卡消耗　10A 百分比以卡面原始攻擊為基準
 * 22:22 追加「五顆星封頂」：每張卡依被餵張數累進五顆星，第五星佔封頂張數一半；分配模式 A／B 與封頂張數都是參數。
 *
 * 規則版本寫進每張收據：v1＝37c5820f／ec138627 時的原規則（沒有上限、不傳承、沒有星級），
 * v2＝本檔參數。舊收據永遠照 v1 重播；已存在的加成不扣回（超過上限的卡保留現值，只是不能再加）。
 * 伺服端專用：客戶端只照印伺服端算好的數字。
 */
import 'server-only';

export type FoodChainRule = 'v1' | 'v2';
export type StarSplitMode = 'A' | 'B';
export type FeedTargetForm = 'ADULT' | 'GUARDIAN';

export interface FoodChainParams {
  /** 待平衡暫定值：加成總和上限＝卡面攻擊 × num / den（取整）。 */
  attackCap: { num: number; den: number };
  /** 待平衡暫定值：本體被吃時傳承其累積加成 × num / den（取整）。 */
  inherit: { num: number; den: number };
  /** 待平衡暫定值：五顆星封頂（各層封頂張數、前四顆星分配模式）。 */
  stars: { mode: StarSplitMode; capFeeds: Record<FeedTargetForm, number> };
  /**
   * 待平衡暫定值：攻擊加成已到上限、但星級還沒封頂時，是否仍可吃卡（本次加成 +0，只累積星級）。
   * 依 22:22 指示「先保留 50% 上限，星級只管吃卡張數與封頂」兩者獨立，預設 true；預覽會清楚寫出 +0。
   */
  feedAtAttackCap: boolean;
}

/**
 * 待平衡暫定值。星級：22:39 使用者定案 B（第五星 1/2、第四 1/4、第三 1/8、第一二各 1/16），四大神獸封頂 1000、本體暫定 100。
 */
export const FOOD_CHAIN_V2: FoodChainParams = {
  attackCap: { num: 1, den: 2 },
  inherit: { num: 1, den: 2 },
  stars: { mode: 'B', capFeeds: { GUARDIAN: 1000, ADULT: 100 } },
  feedAtAttackCap: true,
};

/** 新操作用的規則：預設 v2；伺服端環境變數 BEAST_FOOD_CHAIN_RULE=v1 可整條退回原規則（緊急開關）。 */
export function activeFoodChainRule(): FoodChainRule {
  return process.env.BEAST_FOOD_CHAIN_RULE === 'v1' ? 'v1' : 'v2';
}

/** 收據上的規則版本；沒有寫的舊收據一律是 v1。 */
export function receiptRule(value: unknown): FoodChainRule {
  return value === 'v2' ? 'v2' : 'v1';
}

/**
 * 五顆星的「累計」門檻（第 n 顆星要累計被餵幾張）。第五星佔封頂一半，所以四星滿＝封頂一半。
 *   A：前四顆平分剩下一半 → 累計 1/8、2/8、3/8、4/8、1
 *   B：依序減半 → 第四星 1/4、第三 1/8、第二與第一各 1/16 → 累計 1/16、1/8、1/4、1/2、1
 * 取整（22:39 使用者定案 B；取整須保證五顆星張數總和＝封頂）：累計值無條件進位、最後一顆固定到封頂，
 *   例 1000 張 B → 累計 63、125、250、500、1000（各星 63＋62＋125＋250＋500＝1000）；100 張 → 7、13、25、50、100（7＋6＋12＋25＋50＝100）。
 */
export function starThresholds(capFeeds: number, mode: StarSplitMode): number[] {
  if (!Number.isSafeInteger(capFeeds) || capFeeds < 1) throw new Error('星級封頂張數無效。');
  const fractions = mode === 'A' ? [[1, 8], [2, 8], [3, 8], [4, 8]] : [[1, 16], [1, 8], [1, 4], [1, 2]];
  const cumulative = fractions.map(([n, d]) => Math.ceil(capFeeds * n / d));
  return [...cumulative, capFeeds].map((v, i, all) => Math.max(v, i ? all[i - 1] : 1));
}

/**
 * ascension：預留給日後「突破線」的欄位，本輪不啟用、沒有任何規格，一律 null（天賦網格、技能打扮同樣不做）。
 */
export interface StarProgress { stars: number; fed: number; capFeeds: number; nextAt: number | null; toNext: number | null; maxed: boolean; thresholds: number[]; mode: StarSplitMode; ascension: null }

export function starProgress(form: FeedTargetForm, fed: number, params: FoodChainParams = FOOD_CHAIN_V2): StarProgress {
  const capFeeds = params.stars.capFeeds[form], thresholds = starThresholds(capFeeds, params.stars.mode);
  const count = Math.max(0, Math.floor(fed));
  const stars = thresholds.filter(t => count >= t).length, nextAt = stars < 5 ? thresholds[stars] : null;
  return { stars, fed: count, capFeeds, nextAt, toNext: nextAt === null ? null : nextAt - count, maxed: count >= capFeeds, thresholds, mode: params.stars.mode, ascension: null };
}

/** 加成上限（以卡面原始攻擊為基準，取整）。 */
export function attackBonusCap(baseAttack: number, params: FoodChainParams = FOOD_CHAIN_V2): bigint {
  return BigInt(Math.floor(baseAttack * params.attackCap.num / params.attackCap.den));
}

/** 1A：材料卡面攻擊 ÷10 取整、至少 +1（v1 與 v2 共用）。 */
export function baseFeedGain(materialBaseAttack: number): bigint {
  return BigInt(Math.max(1, Math.floor(materialBaseAttack / 10)));
}

export interface FeedGain { raw: bigint; inherited: bigint; added: bigint; cap: bigint | null; capped: boolean }

/**
 * v1：原公式，不傳承、不封頂。
 * v2：原公式 ＋（本體材料）累積加成 × 50% 傳承，再以「目標卡面 50% − 目前加成」封頂；已超過上限的卡保留現值、本次 +0。
 */
export function feedGain(rule: FoodChainRule, input: { materialForm: string; materialBaseAttack: number; materialBonus: bigint; targetBaseAttack: number; targetBonus: bigint }, params: FoodChainParams = FOOD_CHAIN_V2): FeedGain {
  const base = baseFeedGain(input.materialBaseAttack);
  if (rule === 'v1') return { raw: base, inherited: 0n, added: base, cap: null, capped: false };
  const inherited = input.materialForm === 'ADULT' ? input.materialBonus * BigInt(params.inherit.num) / BigInt(params.inherit.den) : 0n;
  const raw = base + inherited, cap = attackBonusCap(input.targetBaseAttack, params);
  const room = cap > input.targetBonus ? cap - input.targetBonus : 0n;
  const added = raw < room ? raw : room;
  return { raw, inherited, added, cap, capped: added < raw };
}
