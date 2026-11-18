/**
 * 歷史 v2 食物鏈參數（供舊收據重播）；2026-11-18 新操作改用下方 v3，權威規格見神獸合體五星強化.md。
 * 以下為 2026-11-15 歷史決議：
 *   1A 每吃一張的加成維持現行（材料卡面攻擊 ÷10 取整、至少 +1），畫面另外換算「約 +X%」
 *   2B 加成總和上限＝目標卡面攻擊 50%
 *   3B 本體被四大神獸吃掉時，傳承它已累積加成的 50%（取整）
 *   4A 無同屬性加成　6A 不給開局能量　7A 嚴格逐層　8A 被吃卡消耗　10A 百分比以卡面原始攻擊為基準
 * 22:22 追加「五顆星封頂」：每張卡依被餵張數累進五顆星，第五星佔封頂張數一半；各星份數 STAR_SHARES 與封頂張數 STAR_CAP_FEEDS 是程式碼常數。
 *
 * 規則版本寫進每張收據：v1＝37c5820f／ec138627 時的原規則（沒有上限、不傳承、沒有星級），
 * v2＝歷史參數；v3＝2026-11-18 升星技能檔。舊收據按原版本重播；已存在的加成不扣回；v3不受歷史攻擊上限限制。
 * 伺服端專用：客戶端只照印伺服端算好的數字。
 */
import 'server-only';
import { ELEMENT_GENERATES, type BeastElement } from './elements';

export type FoodChainRule = 'v1' | 'v2' | 'v3' | 'v4';
export type FeedTargetForm = 'ADULT' | 'GUARDIAN';

/**
 * 待平衡暫定值：五顆星各自的「份數」（第一～第五星），單一常數陣列；第五星固定佔封頂一半。
 * 22:47 使用者定案＝一路減半（第一二星各 1/16、第三 1/8、第四 1/4、第五 1/2）。
 */
export const STAR_SHARES: readonly [number, number, number, number, number] = [1, 1, 2, 4, 8];

/** 待平衡暫定值：各層五星封頂張數（22:47 使用者定：四大神獸 1000、本體 500）。 */
export const STAR_CAP_FEEDS: Readonly<Record<FeedTargetForm, number>> = { GUARDIAN: 1000, ADULT: 500 };

export interface FoodChainParams {
  /** 待平衡暫定值：加成總和上限＝卡面攻擊 × num / den（取整）。 */
  attackCap: { num: number; den: number };
  /** 待平衡暫定值：本體被吃時傳承其累積加成 × num / den（取整）。 */
  inherit: { num: number; den: number };
  /** 待平衡暫定值：五顆星封頂（各層封頂張數、各星份數）。 */
  stars: { shares: readonly number[]; capFeeds: Readonly<Record<FeedTargetForm, number>> };
  /**
   * 待平衡暫定值：攻擊加成已到上限、但星級還沒封頂時，是否仍可吃卡（本次加成 +0，只累積星級）。
   * 依 22:22 指示「先保留 50% 上限，星級只管吃卡張數與封頂」兩者獨立，設 true；預覽會清楚顯示 +0。
   */
  feedAtAttackCap: boolean;
}

/**
 * 規則全部寫死在程式碼常數（22:47 使用者指示）：沒有後台可調參數、環境變數或資料庫設定。全部是待平衡暫定值。
 */
export const FOOD_CHAIN_V2: FoodChainParams = Object.freeze({
  attackCap: Object.freeze({ num: 1, den: 2 }),
  inherit: Object.freeze({ num: 1, den: 2 }),
  stars: Object.freeze({ shares: STAR_SHARES, capFeeds: STAR_CAP_FEEDS }),
  feedAtAttackCap: true,
});

/** 新操作一律用 v4：五星比例成長（cultivation-balance）；v1/v2/v3 僅供歷史收據重播。 */
export const ACTIVE_FOOD_CHAIN_RULE: FoodChainRule = 'v4';
export function activeFoodChainRule(): FoodChainRule {
  return ACTIVE_FOOD_CHAIN_RULE;
}

/** 收據上的規則版本；沒有寫的舊收據一律是 v1。 */
export function receiptRule(value: unknown): FoodChainRule {
  return value === 'v4' ? 'v4' : value === 'v3' ? 'v3' : value === 'v2' ? 'v2' : 'v1';
}

/**
 * 各星張數（使用者 22:47 定案）：依 STAR_SHARES 份數取整數（無條件捨去），五星總和必須剛好等於封頂，
 * 餘數放在低星（從第二星起：第二 → 第一 → 第三 → 第四 → 第五）。
 *   1000 張 → 62／63／125／250／500（累計 62、125、250、500、1000）
 *    500 張 → 31／32／62／125／250（累計 31、63、125、250、500）
 */
export const STAR_REMAINDER_ORDER: readonly number[] = [1, 0, 2, 3, 4];
export function starFeedsPerStar(capFeeds: number, shares: readonly number[] = STAR_SHARES): number[] {
  if (!Number.isSafeInteger(capFeeds) || capFeeds < 5) throw new Error('星級封頂張數無效。');
  if (shares.length !== 5 || shares.some(v => !Number.isSafeInteger(v) || v < 1)) throw new Error('星級份數無效。');
  const total = shares.reduce((a, b) => a + b, 0);
  const per = shares.map(v => Math.floor(capFeeds * v / total));
  let left = capFeeds - per.reduce((a, b) => a + b, 0);
  for (let i = 0; left > 0; i = (i + 1) % 5, left--) per[STAR_REMAINDER_ORDER[i]]++;
  return per;
}
/** 五顆星的「累計」門檻（第 n 顆星要累計被餵幾張）；最後一顆＝封頂。 */
export function starThresholds(capFeeds: number, shares: readonly number[] = STAR_SHARES): number[] {
  let sum = 0;
  return starFeedsPerStar(capFeeds, shares).map(v => (sum += v));
}

/** ascension：預留給日後「突破線」的欄位，本輪不啟用、沒有任何規格，一律 null（天賦網格、技能打扮同樣不做）。 */
export interface StarProgress { stars: number; fed: number; capFeeds: number; nextAt: number | null; toNext: number | null; maxed: boolean; thresholds: number[]; ascension: null }

export function starProgress(form: FeedTargetForm, fed: number, params: FoodChainParams = FOOD_CHAIN_V2): StarProgress {
  const capFeeds = params.stars.capFeeds[form], thresholds = starThresholds(capFeeds, params.stars.shares);
  const count = Math.max(0, Math.floor(fed));
  const stars = thresholds.filter(t => count >= t).length, nextAt = stars < 5 ? thresholds[stars] : null;
  return { stars, fed: count, capFeeds, nextAt, toNext: nextAt === null ? null : nextAt - count, maxed: count >= capFeeds, thresholds, ascension: null };
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
 * v3：不限材料卡種；同屬性／材料生目標，基本增量1.5倍向上取整；成獸傳承50%；沒有攻擊上限。
 * v1：原公式，不傳承、不封頂。
 * v2：原公式 ＋（本體材料）累積加成 × 50% 傳承，再以「目標卡面 50% − 目前加成」封頂；已超過上限的卡保留現值、本次 +0。
 */
export function feedGain(rule: FoodChainRule, input: { materialForm: string; materialBaseAttack: number; materialBonus: bigint; targetBaseAttack: number; targetBonus: bigint; materialElement?: BeastElement; targetElement?: BeastElement }, params: FoodChainParams = FOOD_CHAIN_V2): FeedGain {
  const base = baseFeedGain(input.materialBaseAttack);
  if (rule === 'v1') return { raw: base, inherited: 0n, added: base, cap: null, capped: false };
  if (rule === 'v3') {
    const affinity = !!input.materialElement && !!input.targetElement && (input.materialElement === input.targetElement || ELEMENT_GENERATES[input.materialElement] === input.targetElement);
    const inherited = input.materialForm === 'ADULT' ? input.materialBonus * BigInt(params.inherit.num) / BigInt(params.inherit.den) : 0n;
    const raw = (affinity ? (base * 3n + 1n) / 2n : base) + inherited;
    return { raw, inherited, added: raw, cap: null, capped: false };
  }
  const inherited = input.materialForm === 'ADULT' ? input.materialBonus * BigInt(params.inherit.num) / BigInt(params.inherit.den) : 0n;
  const raw = base + inherited, cap = attackBonusCap(input.targetBaseAttack, params);
  const room = cap > input.targetBonus ? cap - input.targetBonus : 0n;
  const added = raw < room ? raw : room;
  return { raw, inherited, added, cap, capped: added < raw };
}
