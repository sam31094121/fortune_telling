/**
 * 寶珠闖關「餵食／合體鏈」規則（DESIGN.md v1＋v2；P0＝結構與規則）。
 *
 * 只有一個入口規則函式（previewFeed），同時給 ①畫面預覽 ②寫入存檔前（applyFeed）③讀檔重播（readFeedChainState）使用。
 * 功能開關 NEXT_PUBLIC_M3_FEED_CHAIN 未設定或不是 '1' 時：不讀新欄位、不寫存檔、預覽一律拒絕（FLAG_OFF）。
 * 卡面數值（CARD_FACE_STATS／cards/beasts）只讀不改；暴怒合體（fusion.ts）、押卡帳本、碎片完全不碰。
 *
 * P0 已知界線（誠實標示，不假裝做完）：
 * - 幼子餵食仍寫入既有 enhancementReceipts（只有攻擊）；幼子 +2 開局能量是 P1，P0 的預覽與實際一律為 0。
 * - 匯入卡（import-ledger.ts）只計入卡池與排名，不能當材料（IMPORT_MATERIAL_PENDING）；PLAN-v2 定案「待餵區只收寶珠闖關結算的卡」。
 * - 鏈加成已接進戰鬥：campaignBattleStats() 是出戰攻擊與開局能量的唯一來源（Match3Board 開局、選隊卡「攻 X ▲N」、強化頁共用）。
 *   （AUDIT-2 M10 更正：舊註解寫「還沒接進」，與程式不符。）
 */
import { getCard } from '../registry';
import { CARD_FACE_STATS } from '../card-face-stats';
import { campaignCardAttack, enhanceCampaignProfile, enhancementBonus, parseCampaign, previewCampaignEnhancement, type ChainReceipt, type HardCampaign, type ResonanceReceipt } from './hard-campaign';
import type { ImportedCardReceipt } from './import-ledger';
import { MERGE_BALANCE, feedChainEnabled } from './merge-balance';
import { FOUR_SYMBOLS, fourSymbolOf, resonanceSlotBonus, tierAttackCap, type FourSymbol } from './merge-tier';

export const FEED_CHAIN_FLAG = 'NEXT_PUBLIC_M3_FEED_CHAIN';
export { feedChainEnabled, FOUR_SYMBOLS, fourSymbolOf, type FourSymbol };

export const FEED_CHAIN_RULES = {
  youngFeedUnlockWins: 4, // 沿用現行融入強化（hard-campaign.ts enhancementUnlocked）
  adultFeedUnlockWins: 8, // 待拍板 3 預設：本體餵四大神獸要贏 8 場
  attackCapRatio: 0.5, // 所有強化合計 ≤ 卡面攻擊 ×50%（幼子＋鏈共用）
  materialAttackRatio: 0.1, // 材料卡面攻擊 ×10%，捨去，至少 +1
  inheritRatio: 0.5, // 本體被吃時傳承它已累積強化的 50%（捨去）
  youngEnergyBonus: 2, // P1 才寫入；P0 預覽與實際皆為 0
  adultEnergyBonus: 5,
  cardEnergyCap: 20,
  teamEnergyCap: 60,
  minPlayableCards: 5,
  topLockCount: 5,
  maxOperationIdLength: 200,
} as const;

type Form = 'YOUNG' | 'ADULT' | 'GUARDIAN';
export type FeedUnitSource = 'YOUNG' | 'REWARD' | 'HERO' | 'IMPORT';
/** 卡池裡的一張實體卡；ref 是唯一識別：young:<id>／reward:<matchId>／hero:<id>／import:<collection:entryId>。 */
export interface FeedUnit { ref: string; cardId: string; form: Form; source: FeedUnitSource }
export interface FeedChainState { enabled: boolean; ok: boolean; error?: string; chainReceipts: ChainReceipt[]; consumedRewardMatchIds: string[]; resonanceReceipts?: ResonanceReceipt[]; spentYoungBonus?: Record<string, number> }
export interface FeedCardStat { cardId: string; form: Form; faceAttack: number; youngBonus: number; chainBonus: number; effectiveAttack: number; startEnergy: number; copies: number; resonanceBonus?: number; resonanceSlots?: number; cap?: number }
export type FeedLockReason = 'GUARDIAN' | 'TEAM' | 'TOP_FIVE' | 'TOP_ENERGY';
export type FeedRejection = 'FLAG_OFF' | 'IN_BATTLE' | 'CHAIN_STATE_INVALID' | 'MATERIAL_UNAVAILABLE' | 'TARGET_UNAVAILABLE' | 'SELF' | 'GUARDIAN_MATERIAL' | 'NOT_UPWARD' | 'LOCKED_BY_WINS' | 'TEAM_MEMBER' | 'TOP_FIVE' | 'TOP_ENERGY' | 'IMPORT_MATERIAL_PENDING' | 'ATTACK_CAP' | 'NO_HERO' | 'MIN_FIVE' | 'RESONANCE_FULL';
export const FEED_REJECTION_TEXT: Record<FeedRejection, string> = {
  FLAG_OFF: '餵食鏈尚未開放',
  IN_BATTLE: '戰鬥中不能餵卡',
  CHAIN_STATE_INVALID: '餵食紀錄無法讀取，已暫停餵食',
  MATERIAL_UNAVAILABLE: '這張材料卡目前不可用',
  TARGET_UNAVAILABLE: '只能強化目前持有的卡',
  SELF: '不能自己吃自己（同一張卡要有第二張才能放進共鳴格）',
  GUARDIAN_MATERIAL: '四大神獸不能被吃',
  NOT_UPWARD: '只能往上吃：幼子→本體／四大神獸，本體→四大神獸',
  LOCKED_BY_WINS: '尚未達到解鎖勝場',
  TEAM_MEMBER: '出戰隊伍的卡不能當材料',
  TOP_FIVE: '攻擊前五名要保留',
  TOP_ENERGY: '開局能量最高的卡要保留',
  IMPORT_MATERIAL_PENDING: '待餵區只收寶珠闖關結算的卡；其他模式的卡不能當材料',
  ATTACK_CAP: '已達強化上限',
  RESONANCE_FULL: '共鳴格已滿',
  NO_HERO: '要先選主角四大神獸',
  MIN_FIVE: '要留五張能打的卡',
};
export type FeedWarning = 'LAST_ELEMENT';
export interface FeedContext { enabled?: boolean; inBattle: boolean; imports?: readonly ImportedCardReceipt[] }

const face = (cardId: string): number => CARD_FACE_STATS[cardId]?.attack ?? 0;
const formOf = (cardId: string): Form | undefined => getCard(cardId)?.form as Form | undefined;
/** 開關開啟時才會走到這裡：跨層級天花板（成獸 ≤ 同方位四象卡面、四象 ≤ 卡面 ×1.5），見 merge-balance.ts。 */
const capOf = (cardId: string): number => tierAttackCap(cardId, true);
const byId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
export const materialAttackBonus = (materialCardId: string): number => Math.max(1, Math.floor(face(materialCardId) * FEED_CHAIN_RULES.materialAttackRatio));
/** 本體 → 四大神獸：卡面 ×10%（捨去、至少 +1）＋ 該本體目前累積強化 ×50%（捨去）。 */
export function adultFeedBonus(p: HardCampaign, adultId: string, state?: FeedChainState): { base: number; inheritedAttack: number; attackBonus: number; spentYoungBonus: number } {
  // 傳承扣回（PLAN-v2 A4）：被吃掉的本體，把它「目前還在」的幼子強化整筆用掉（傳 50% 給四象），同一種卡之後的新副本不會再帶著這筆強化。
  const net = netYoungBonus(p, adultId, state);
  const base = materialAttackBonus(adultId), inheritedAttack = Math.floor(net * FEED_CHAIN_RULES.inheritRatio);
  return { base, inheritedAttack, attackBonus: base + inheritedAttack, spentYoungBonus: net };
}
/** 某種卡「還沒被傳承用掉」的幼子強化＝幼子收據總和 − 被吃掉時已用掉的部分。 */
export function netYoungBonus(p: HardCampaign, cardId: string, state?: FeedChainState): number {
  const spent = state?.spentYoungBonus?.[cardId] ?? spentFromReceipts(p.chainReceipts ?? [])[cardId] ?? 0;
  return Math.max(0, enhancementBonus(p, cardId) - spent);
}
/** 舊收據沒有 spentYoungBonus 欄位時，以 傳承×2 估回（向下相容）。 */
function spentFromReceipts(receipts: readonly ChainReceipt[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of receipts) out[r.materialCardId] = (out[r.materialCardId] ?? 0) + (Number.isSafeInteger(r.spentYoungBonus) ? r.spentYoungBonus! : r.inheritedAttack * 2);
  return out;
}

const EMPTY_STATE = (enabled: boolean): FeedChainState => ({ enabled, ok: true, chainReceipts: [], consumedRewardMatchIds: [] });
const invalidState = (error: string): FeedChainState => ({ enabled: true, ok: false, error, chainReceipts: [], consumedRewardMatchIds: [] });

function validOperationId(id: unknown): id is string {
  return typeof id === 'string' && !!id.trim() && id.length <= FEED_CHAIN_RULES.maxOperationIdLength;
}

/** 讀檔重播：開關關閉時完全不讀新欄位；讀不懂只停用這條線（ok:false），絕不拋錯讓整份寶珠存檔讀不到。 */
export function readFeedChainState(p: HardCampaign, enabled: boolean = feedChainEnabled()): FeedChainState {
  if (!enabled) return EMPTY_STATE(false);
  try {
    const receipts = p.chainReceipts ?? [], consumed = p.consumedRewardMatchIds ?? [], resonance = p.resonanceReceipts ?? [];
    if (!Array.isArray(receipts) || !Array.isArray(consumed) || !Array.isArray(resonance) || consumed.some(id => typeof id !== 'string')) return invalidState('餵食欄位格式無效');
    if (p.startEnergy !== undefined && (typeof p.startEnergy !== 'object' || p.startEnergy === null || Array.isArray(p.startEnergy))) return invalidState('開局能量快取格式無效');
    const consumedSet = new Set(consumed);
    if (consumedSet.size !== consumed.length) return invalidState('被吃掉的獎勵卡重複');
    const rewards = new Map(p.rewards.map(r => [r.matchId, r]));
    const operations = new Set((p.enhancementReceipts ?? []).map(r => r.operationId)), rewardMaterials = new Set<string>();
    const chainTotals: Record<string, number> = {};
    for (const r of receipts) {
      if (!r || !validOperationId(r.operationId) || operations.has(r.operationId)) return invalidState('餵食收據識別無效');
      operations.add(r.operationId);
      if (!r.material || r.material.kind !== 'REWARD') return invalidState('P0 只接受獎勵卡收據');
      const reward = rewards.get(r.material.matchId);
      if (!reward || reward.cardId !== r.materialCardId || !consumedSet.has(r.material.matchId) || rewardMaterials.has(r.material.matchId)) return invalidState('餵食材料紀錄不一致');
      rewardMaterials.add(r.material.matchId);
      if (formOf(r.materialCardId) !== 'ADULT' || formOf(r.targetId) !== 'GUARDIAN' || p.wins < FEED_CHAIN_RULES.adultFeedUnlockWins) return invalidState('餵食方向或解鎖紀錄不一致');
      const maxInherited = Math.floor(enhancementBonus(p, r.materialCardId) * FEED_CHAIN_RULES.inheritRatio);
      if (!Number.isSafeInteger(r.inheritedAttack) || r.inheritedAttack < 0 || r.inheritedAttack > maxInherited || r.attackBonus !== materialAttackBonus(r.materialCardId) + r.inheritedAttack || r.energyBonus !== FEED_CHAIN_RULES.adultEnergyBonus) return invalidState('餵食加成與收據不一致');
      if (r.spentYoungBonus !== undefined && (!Number.isSafeInteger(r.spentYoungBonus) || r.spentYoungBonus < 0 || r.inheritedAttack !== Math.floor(r.spentYoungBonus * FEED_CHAIN_RULES.inheritRatio))) return invalidState('傳承扣回紀錄不一致');
      chainTotals[r.targetId] = (chainTotals[r.targetId] ?? 0) + r.attackBonus;
    }
    const spent = spentFromReceipts(receipts);
    if (Object.entries(spent).some(([id, n]) => n > enhancementBonus(p, id))) return invalidState('傳承扣回超過原有強化');
    // 共鳴格（PLAN-v2 B9）：同一種成獸的重複副本，放進自己的共鳴格；每格加成與其他強化共用同一個上限。
    const resonanceTotals: Record<string, number> = {}, resonanceSlots: Record<string, number> = {};
    for (const r of resonance) {
      if (!r || !validOperationId(r.operationId) || operations.has(r.operationId)) return invalidState('共鳴收據識別無效');
      operations.add(r.operationId);
      const reward = rewards.get(r.matchId);
      if (!reward || reward.cardId !== r.cardId || formOf(r.cardId) !== 'ADULT' || !consumedSet.has(r.matchId) || rewardMaterials.has(r.matchId) || r.attackBonus !== resonanceSlotBonus(r.cardId)) return invalidState('共鳴紀錄不一致');
      rewardMaterials.add(r.matchId);
      resonanceSlots[r.cardId] = (resonanceSlots[r.cardId] ?? 0) + 1;
      resonanceTotals[r.cardId] = (resonanceTotals[r.cardId] ?? 0) + r.attackBonus;
      if (resonanceSlots[r.cardId] > MERGE_BALANCE.resonanceSlots) return invalidState('共鳴格超過上限');
      if (!p.rewards.some(x => x.cardId === r.cardId && !consumedSet.has(x.matchId))) return invalidState('共鳴卡沒有留下本體');
    }
    if (rewardMaterials.size !== consumedSet.size) return invalidState('被吃掉的獎勵卡缺少收據');
    const ids = new Set([...Object.keys(chainTotals), ...Object.keys(resonanceTotals)]);
    if ([...ids].some(id => Math.max(0, enhancementBonus(p, id) - (spent[id] ?? 0)) + (chainTotals[id] ?? 0) + (resonanceTotals[id] ?? 0) > capOf(id))) return invalidState('強化合計超過上限');
    // 新欄位只有在有資料時才帶出，舊存檔讀回的狀態物件與 P0 完全相同。
    return { enabled: true, ok: true, chainReceipts: receipts, consumedRewardMatchIds: consumed, ...(resonance.length ? { resonanceReceipts: resonance } : {}), ...(Object.keys(spent).length ? { spentYoungBonus: spent } : {}) };
  } catch {
    return invalidState('餵食紀錄無法讀取');
  }
}

/** 合併後的實際出戰卡池：未消耗幼子＋未被吃的獎勵成獸（逐張）＋主角＋還有效的匯入卡。 */
export function feedPool(p: HardCampaign, state: FeedChainState, imports: readonly ImportedCardReceipt[] = []): FeedUnit[] {
  const consumedYoung = new Set(p.consumedYoungIds ?? []), consumedRewards = new Set(state.consumedRewardMatchIds);
  const units: FeedUnit[] = [];
  for (const id of Object.keys(CARD_FACE_STATS).sort(byId)) if (formOf(id) === 'YOUNG' && !consumedYoung.has(id)) units.push({ ref: 'young:' + id, cardId: id, form: 'YOUNG', source: 'YOUNG' });
  for (const r of p.rewards) if (!consumedRewards.has(r.matchId) && formOf(r.cardId)) units.push({ ref: 'reward:' + r.matchId, cardId: r.cardId, form: formOf(r.cardId)!, source: 'REWARD' });
  if (p.heroId && formOf(p.heroId) === 'GUARDIAN') units.push({ ref: 'hero:' + p.heroId, cardId: p.heroId, form: 'GUARDIAN', source: 'HERO' });
  for (const r of imports) if (r.status === 'AVAILABLE' && formOf(r.cardId)) units.push({ ref: 'import:' + r.key, cardId: r.cardId, form: formOf(r.cardId)!, source: 'IMPORT' });
  return units;
}
const playableIds = () => new Set(Object.keys(CARD_FACE_STATS).filter(id => !!getCard(id)));

/** 每張不同卡的有效攻擊（卡面＋幼子強化＋鏈加成）與開局能量（鏈收據加總，單卡 ≤20）。 */
export function feedCardStats(p: HardCampaign, state: FeedChainState, pool: readonly FeedUnit[]): FeedCardStat[] {
  const copies = new Map<string, number>();
  pool.forEach(u => copies.set(u.cardId, (copies.get(u.cardId) ?? 0) + 1));
  const known = playableIds();
  return [...copies.keys()].filter(id => known.has(id)).map(cardId => {
    const youngBonus = netYoungBonus(p, cardId, state);
    const chain = state.chainReceipts.filter(r => r.targetId === cardId);
    const chainBonus = chain.reduce((sum, r) => sum + r.attackBonus, 0);
    const res = (state.resonanceReceipts ?? []).filter(r => r.cardId === cardId);
    const resonanceBonus = res.reduce((sum, r) => sum + r.attackBonus, 0);
    const startEnergy = Math.min(FEED_CHAIN_RULES.cardEnergyCap, chain.reduce((sum, r) => sum + r.energyBonus, 0));
    const cap = capOf(cardId);
    const effectiveAttack = face(cardId) + Math.min(cap, youngBonus + chainBonus + resonanceBonus);
    return { cardId, form: formOf(cardId)!, faceAttack: face(cardId), youngBonus, chainBonus, effectiveAttack, startEnergy, copies: copies.get(cardId)!, resonanceBonus, resonanceSlots: res.length, cap };
  });
}

/** 排名：有效攻擊高→開局能量高→卡片 ID 字母序。 */
export function compareFeedRank(a: FeedCardStat, b: FeedCardStat): number {
  return b.effectiveAttack - a.effectiveAttack || b.startEnergy - a.startEnergy || byId(a.cardId, b.cardId);
}
/** 前五名＋開局能量第一名（同能量依排名順序取一張，所以最多鎖 6 張）。 */
export function rankFeedCards(stats: readonly FeedCardStat[]): { ranked: FeedCardStat[]; topFive: string[]; energyLeader: string | null } {
  const ranked = [...stats].sort(compareFeedRank);
  const leader = [...ranked].sort((a, b) => b.startEnergy - a.startEnergy || compareFeedRank(a, b))[0];
  return { ranked, topFive: ranked.slice(0, FEED_CHAIN_RULES.topLockCount).map(s => s.cardId), energyLeader: leader?.cardId ?? null };
}
/** 鎖定清單：前五＋能量第一＋出戰隊伍（teamIds）＋全部四大神獸。鎖定卡仍可當接收者。 */
export function feedLocks(p: HardCampaign, stats: readonly FeedCardStat[]): Map<string, FeedLockReason[]> {
  const { topFive, energyLeader } = rankFeedCards(stats), locks = new Map<string, FeedLockReason[]>();
  const add = (id: string, reason: FeedLockReason) => locks.set(id, [...(locks.get(id) ?? []), reason]);
  for (const id of Object.keys(CARD_FACE_STATS).sort(byId)) if (formOf(id) === 'GUARDIAN') add(id, 'GUARDIAN');
  for (const id of p.teamIds) add(id, 'TEAM');
  topFive.forEach(id => add(id, 'TOP_FIVE'));
  if (energyLeader) add(energyLeader, 'TOP_ENERGY');
  return locks;
}

export interface FeedSide { attack: number; energy: number }
export interface FeedPreview {
  allowed: boolean; reason?: FeedRejection; reasonText?: string; reasons: FeedRejection[];
  kind: 'YOUNG_TO_TARGET' | 'ADULT_TO_GUARDIAN' | 'RESONANCE' | null; material?: FeedUnit; targetId: string;
  attackBonus: number; inheritedAttack: number; energyBonus: number; maxBonus: number;
  before: FeedSide; after: FeedSide; topFiveBefore: string[]; topFiveAfter: string[]; rankingAfter: string[];
  remainingPlayable: number; warnings: FeedWarning[];
}

function ctxState(p: HardCampaign, ctx: FeedContext): FeedChainState {
  const enabled = ctx.enabled ?? feedChainEnabled();
  return readFeedChainState(p, enabled);
}

/** 唯一規則函式：預覽「前→後」並列出所有違反的規則（reasons），reason 為第一條。 */
export function previewFeed(p: HardCampaign, materialRef: string, targetId: string, ctx: FeedContext): FeedPreview {
  const state = ctxState(p, ctx), reasons: FeedRejection[] = [], warnings: FeedWarning[] = [];
  const base: FeedPreview = { allowed: false, reasons, kind: null, targetId, attackBonus: 0, inheritedAttack: 0, energyBonus: 0, maxBonus: capOf(targetId), before: { attack: face(targetId), energy: 0 }, after: { attack: face(targetId), energy: 0 }, topFiveBefore: [], topFiveAfter: [], rankingAfter: [], remainingPlayable: 0, warnings };
  const reject = (r: FeedRejection) => { if (!reasons.includes(r)) reasons.push(r); };
  const finish = (): FeedPreview => ({ ...base, allowed: reasons.length === 0, reason: reasons[0], reasonText: reasons[0] && FEED_REJECTION_TEXT[reasons[0]] });
  if (!state.enabled) { reject('FLAG_OFF'); return finish(); }
  if (ctx.inBattle) reject('IN_BATTLE');
  if (!state.ok) { reject('CHAIN_STATE_INVALID'); return finish(); }
  const pool = feedPool(p, state, ctx.imports ?? []);
  const stats = feedCardStats(p, state, pool), statOf = new Map(stats.map(s => [s.cardId, s]));
  const material = pool.find(u => u.ref === materialRef), targetStat = statOf.get(targetId);
  base.material = material;
  base.topFiveBefore = rankFeedCards(stats).topFive;
  if (targetStat) base.before = { attack: targetStat.effectiveAttack, energy: targetStat.startEnergy };
  if (!material) reject('MATERIAL_UNAVAILABLE');
  if (!targetStat) reject('TARGET_UNAVAILABLE');
  if (!material || !targetStat) return finish();
  // 共鳴格（PLAN-v2 B9）：同一種成獸的「重複副本」放進自己的共鳴格；至少要留下一張本體。
  if (material.cardId === targetId && material.form === 'ADULT' && material.source === 'REWARD' && targetStat.copies >= 2) {
    base.kind = 'RESONANCE';
    if (!Number.isSafeInteger(p.wins) || p.wins < FEED_CHAIN_RULES.youngFeedUnlockWins) reject('LOCKED_BY_WINS');
    if ((targetStat.resonanceSlots ?? 0) >= MERGE_BALANCE.resonanceSlots) reject('RESONANCE_FULL');
    const bonusR = resonanceSlotBonus(targetId), totalR = targetStat.youngBonus + targetStat.chainBonus + (targetStat.resonanceBonus ?? 0) + bonusR;
    base.attackBonus = bonusR;
    if (totalR > capOf(targetId)) reject('ATTACK_CAP');
    base.after = { attack: face(targetId) + Math.min(capOf(targetId), totalR), energy: targetStat.startEnergy };
    base.remainingPlayable = new Set(pool.filter(u => u.ref !== material.ref).map(u => u.cardId)).size;
    base.topFiveAfter = base.topFiveBefore;
    return finish();
  }
  // 第 10 點 1：不能自己吃自己（同一張卡，包含重複的同一張；待拍板 4 預設不開放成獸橫向互吃）
  if (material.cardId === targetId) reject('SELF');
  // 第 10 點 2：四大神獸是最上層，不能被吃
  if (material.form === 'GUARDIAN') reject('GUARDIAN_MATERIAL');
  // 只能往上吃
  const kind = material.form === 'YOUNG' && (targetStat.form === 'ADULT' || targetStat.form === 'GUARDIAN') ? 'YOUNG_TO_TARGET'
    : material.form === 'ADULT' && targetStat.form === 'GUARDIAN' ? 'ADULT_TO_GUARDIAN' : null;
  if (!kind && material.form !== 'GUARDIAN' && material.cardId !== targetId) reject('NOT_UPWARD');
  if (!kind) return finish();
  base.kind = kind;
  const needWins = kind === 'YOUNG_TO_TARGET' ? FEED_CHAIN_RULES.youngFeedUnlockWins : FEED_CHAIN_RULES.adultFeedUnlockWins;
  if (!Number.isSafeInteger(p.wins) || p.wins < needWins) reject('LOCKED_BY_WINS');
  const locks = feedLocks(p, stats).get(material.cardId) ?? [];
  // 第 10 點 3：出戰隊伍五張
  if (locks.includes('TEAM')) reject('TEAM_MEMBER');
  // 第 10 點 4：攻擊前五名
  if (locks.includes('TOP_FIVE')) reject('TOP_FIVE');
  // 第 10 點 5：開局能量第一名
  if (locks.includes('TOP_ENERGY')) reject('TOP_ENERGY');
  if (material.source === 'IMPORT') reject('IMPORT_MATERIAL_PENDING');
  // 數值：前→後
  const bonus = kind === 'YOUNG_TO_TARGET' ? { attackBonus: materialAttackBonus(material.cardId), inheritedAttack: 0, energyBonus: 0 }
    : { ...adultFeedBonus(p, material.cardId, state), energyBonus: FEED_CHAIN_RULES.adultEnergyBonus };
  base.attackBonus = bonus.attackBonus; base.inheritedAttack = bonus.inheritedAttack; base.energyBonus = bonus.energyBonus;
  const newTotal = targetStat.youngBonus + targetStat.chainBonus + (targetStat.resonanceBonus ?? 0) + bonus.attackBonus;
  if (bonus.attackBonus <= 0 || newTotal > capOf(targetId)) reject('ATTACK_CAP');
  // 幼子收據另外受「同一種卡終身幼子強化 ≤ 上限」約束（舊存檔驗證規則不變）。
  if (kind === 'YOUNG_TO_TARGET' && !reasons.includes('ATTACK_CAP') && enhancementBonus(p, targetId) + bonus.attackBonus > capOf(targetId)) reject('ATTACK_CAP');
  base.after = { attack: face(targetId) + Math.min(capOf(targetId), newTotal), energy: Math.min(FEED_CHAIN_RULES.cardEnergyCap, targetStat.startEnergy + bonus.energyBonus) };
  // 第 10 點 6：吃完後至少 5 張不同的可出戰卡，其中 1 張是主角四大神獸
  const remainingPool = pool.filter(u => u.ref !== material.ref);
  const remainingIds = new Set(remainingPool.map(u => u.cardId));
  base.remainingPlayable = remainingIds.size;
  if (!p.heroId || !remainingIds.has(p.heroId)) reject('NO_HERO');
  if (remainingIds.size < FEED_CHAIN_RULES.minPlayableCards) reject('MIN_FIVE');
  // 排名即時重算：預覽顯示吃完以後的排名
  const afterStats = feedCardStats(p, state, remainingPool).map(s => s.cardId === targetId ? { ...s, effectiveAttack: base.after.attack, startEnergy: base.after.energy } : s);
  const afterRank = rankFeedCards(afterStats);
  base.topFiveAfter = afterRank.topFive; base.rankingAfter = afterRank.ranked.map(s => s.cardId);
  // 元素：只提醒、不鎖（待拍板 6 預設）
  const element = getCard(material.cardId)?.element;
  if (element && !remainingPool.some(u => getCard(u.cardId)?.element === element)) warnings.push('LAST_ELEMENT');
  return finish();
}

/** 寫入前的同一套規則；同一 operationId 重送不重複扣卡。 */
export function applyFeed(p: HardCampaign, operationId: string, materialRef: string, targetId: string, ctx: FeedContext): { profile: HardCampaign; preview: FeedPreview | null; duplicate: boolean } {
  if (!validOperationId(operationId)) throw new Error('餵食操作識別無效');
  const state = ctxState(p, ctx);
  if (!state.enabled) throw new Error(FEED_REJECTION_TEXT.FLAG_OFF);
  if (!state.ok) throw new Error(FEED_REJECTION_TEXT.CHAIN_STATE_INVALID);
  const chainDup = state.chainReceipts.find(r => r.operationId === operationId);
  if (chainDup) {
    if ('reward:' + (chainDup.material.kind === 'REWARD' ? chainDup.material.matchId : '') !== materialRef || chainDup.targetId !== targetId) throw new Error('餵食操作識別不一致');
    return { profile: p, preview: null, duplicate: true };
  }
  const youngDup = (p.enhancementReceipts ?? []).find(r => r.operationId === operationId);
  if (youngDup) {
    if ('young:' + youngDup.youngId !== materialRef || youngDup.targetId !== targetId) throw new Error('餵食操作識別不一致');
    return { profile: p, preview: null, duplicate: true };
  }
  const resDup = (state.resonanceReceipts ?? []).find(r => r.operationId === operationId);
  if (resDup) {
    if ('reward:' + resDup.matchId !== materialRef || resDup.cardId !== targetId) throw new Error('餵食操作識別不一致');
    return { profile: p, preview: null, duplicate: true };
  }
  const preview = previewFeed(p, materialRef, targetId, ctx);
  if (!preview.allowed || !preview.material) throw new Error(preview.reasonText ?? FEED_REJECTION_TEXT.MATERIAL_UNAVAILABLE);
  let next: HardCampaign;
  if (preview.kind === 'YOUNG_TO_TARGET') {
    next = enhanceCampaignProfile(p, operationId, preview.material.cardId, targetId).profile;
  } else if (preview.kind === 'RESONANCE') {
    const matchId = preview.material.ref.slice('reward:'.length);
    const receipt: ResonanceReceipt = { operationId, matchId, cardId: targetId, attackBonus: preview.attackBonus };
    next = { ...p, resonanceReceipts: [...(state.resonanceReceipts ?? []), receipt], consumedRewardMatchIds: [...state.consumedRewardMatchIds, matchId] };
  } else {
    const matchId = preview.material.ref.slice('reward:'.length);
    const spentYoungBonus = netYoungBonus(p, preview.material.cardId, state);
    const receipt: ChainReceipt = { operationId, material: { kind: 'REWARD', matchId }, materialCardId: preview.material.cardId, targetId, inheritedAttack: preview.inheritedAttack, attackBonus: preview.attackBonus, energyBonus: preview.energyBonus, spentYoungBonus };
    next = { ...p, chainReceipts: [...state.chainReceipts, receipt], consumedRewardMatchIds: [...state.consumedRewardMatchIds, matchId] };
  }
  parseCampaign(JSON.stringify(next));
  { const chk = readFeedChainState(next, true); if (!chk.ok) throw new Error(FEED_REJECTION_TEXT.CHAIN_STATE_INVALID + (process.env.M3_DEBUG ? "：" + chk.error : "")); }
  return { profile: next, preview, duplicate: false };
}

/** 疊卡 ×N：只算還能用的張數。 */
export function stackAvailableCopies(pool: readonly FeedUnit[]): { cardId: string; count: number }[] {
  const counts = new Map<string, number>();
  pool.forEach(u => counts.set(u.cardId, (counts.get(u.cardId) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => byId(a[0], b[0])).map(([cardId, count]) => ({ cardId, count }));
}
export interface FeedChainViewCard { cardId: string; count: number; locks: FeedLockReason[] }
/** 只讀顯示資料：三排預設畫面（出戰隊伍／鎖定前五／可以餵的建議）＋四象收合組。建議（一鍵整理）是 P2，P0 為空。 */
export function feedChainView(p: HardCampaign, ctx: Omit<FeedContext, 'inBattle'>): { enabled: boolean; ok: boolean; error?: string; team: string[]; lockedTop: string[]; suggestions: never[]; groups: Record<FourSymbol, FeedChainViewCard[]>; groupsCollapsedByDefault: true } {
  const state = ctxState(p, { ...ctx, inBattle: false });
  const groups = { QINGLONG: [], XUANWU: [], BAIHU: [], ZHUQUE: [] } as unknown as Record<FourSymbol, FeedChainViewCard[]>;
  if (!state.enabled || !state.ok) return { enabled: state.enabled, ok: state.ok, error: state.error, team: [], lockedTop: [], suggestions: [], groups, groupsCollapsedByDefault: true };
  const pool = feedPool(p, state, ctx.imports ?? []), stats = feedCardStats(p, state, pool), rank = rankFeedCards(stats), locks = feedLocks(p, stats);
  for (const { cardId, count } of stackAvailableCopies(pool)) { const g = fourSymbolOf(cardId); if (g) groups[g].push({ cardId, count, locks: locks.get(cardId) ?? [] }); }
  const lockedTop = [...rank.topFive, ...(rank.energyLeader && !rank.topFive.includes(rank.energyLeader) ? [rank.energyLeader] : [])];
  return { enabled: true, ok: true, team: [...p.teamIds], lockedTop, suggestions: [], groups, groupsCollapsedByDefault: true };
}

// ── PLAN-v2 B1：出戰數值（攻擊＋開局能量）單一來源 ─────────────────────
export interface CampaignBattleStat { cardId: string; faceAttack: number; bonus: number; attack: number; startEnergy: number; cap: number }
/**
 * 寶珠闖關出戰用的攻擊與開局能量。開關關閉或餵食紀錄讀不懂時，退回現行 campaignCardAttack（開局能量 0），與舊版相同。
 * 開關開啟時：卡面＋（幼子淨值＋鏈加成＋共鳴）且不超過跨層級天花板；開局能量單卡 ≤20、全隊 ≤60（依出戰順序扣）。
 */
export function campaignBattleStats(p: HardCampaign, teamIds: readonly string[], enabled: boolean = feedChainEnabled()): CampaignBattleStat[] {
  const legacy = () => teamIds.map(id => { const a = campaignCardAttack(p, id); return { cardId: id, faceAttack: a.baseAttack, bonus: a.bonus, attack: a.attack, startEnergy: 0, cap: tierAttackCap(id, false) }; });
  if (!enabled) return legacy();
  const state = readFeedChainState(p, true);
  if (!state.ok || p.wins < FEED_CHAIN_RULES.youngFeedUnlockWins) return legacy();
  const stats = new Map(feedCardStats(p, state, feedPool(p, state)).map(s => [s.cardId, s]));
  let teamEnergy = FEED_CHAIN_RULES.teamEnergyCap;
  return teamIds.map(id => {
    const s = stats.get(id);
    if (!s) { const a = campaignCardAttack(p, id); return { cardId: id, faceAttack: a.baseAttack, bonus: a.bonus, attack: a.attack, startEnergy: 0, cap: capOf(id) }; }
    const startEnergy = Math.max(0, Math.min(s.startEnergy, teamEnergy)); teamEnergy -= startEnergy;
    return { cardId: id, faceAttack: s.faceAttack, bonus: s.effectiveAttack - s.faceAttack, attack: s.effectiveAttack, startEnergy, cap: s.cap ?? capOf(id) };
  });
}

// ── PLAN-v2 B3：一鍵吃到封頂（先預覽、再確認） ─────────────────────
export interface FeedToCapStep { materialRef: string; materialCardId: string; kind: NonNullable<FeedPreview['kind']>; attackBonus: number }
export interface FeedToCapPlan {
  targetId: string; steps: FeedToCapStep[]; before: number; after: number; capAttack: number; full: boolean;
  usedYoung: number; usedAdult: number; usedResonance: number; materialsBefore: number; materialsAfter: number; reason?: string;
}
/** 卡池裡可以當材料的張數（幼子＋未被吃的獎勵副本）。 */
function materialCount(p: HardCampaign, enabled: boolean): number {
  if (!enabled) return enhancementOptionsYoung(p).length;
  const state = readFeedChainState(p, true);
  return state.ok ? feedPool(p, state).filter(u => u.source === 'YOUNG' || u.source === 'REWARD').length : 0;
}
function enhancementOptionsYoung(p: HardCampaign): string[] {
  const consumed = new Set(p.consumedYoungIds ?? []);
  return Object.keys(CARD_FACE_STATS).filter(id => formOf(id) === 'YOUNG' && !consumed.has(id) && !p.teamIds.includes(id));
}
/**
 * 貪婪挑材料：每一步都用「同一套規則」（開關開＝previewFeed／applyFeed；開關關＝previewCampaignEnhancement）模擬，
 * 先重複副本（共鳴／重複本體餵四象）、最後幼子；同類中挑加成最大且不超過剩餘上限的那張，直到再也放不進去。純函式，不寫存檔。
 */
export function planFeedToCap(p: HardCampaign, targetId: string, ctx: Omit<FeedContext, 'inBattle'> = {}): FeedToCapPlan {
  // 兩種順序各算一次，取「攻擊較高」者；同分取用掉幼子較少者（幼子不會補，比重複副本珍貴）。
  const dupFirst = planWithOrder(p, targetId, ctx, { RESONANCE: 0, ADULT_TO_GUARDIAN: 1, YOUNG_TO_TARGET: 2 });
  const youngFirst = planWithOrder(p, targetId, ctx, { YOUNG_TO_TARGET: 0, RESONANCE: 1, ADULT_TO_GUARDIAN: 2 });
  return youngFirst.after > dupFirst.after || (youngFirst.after === dupFirst.after && youngFirst.usedYoung < dupFirst.usedYoung) ? youngFirst : dupFirst;
}
function planWithOrder(p: HardCampaign, targetId: string, ctx: Omit<FeedContext, 'inBattle'>, order: Record<string, number>): FeedToCapPlan {
  const enabled = ctx.enabled ?? feedChainEnabled();
  const attackOf = (q: HardCampaign) => enabled ? (feedCardStats(q, readFeedChainState(q, true), feedPool(q, readFeedChainState(q, true))).find(s => s.cardId === targetId)?.effectiveAttack ?? face(targetId)) : campaignCardAttack(q, targetId).attack;
  const capAttack = face(targetId) + (enabled ? capOf(targetId) : tierAttackCap(targetId, false));
  const before = attackOf(p), steps: FeedToCapStep[] = [];
  const plan: FeedToCapPlan = { targetId, steps, before, after: before, capAttack, full: before >= capAttack, usedYoung: 0, usedAdult: 0, usedResonance: 0, materialsBefore: materialCount(p, enabled), materialsAfter: 0 };
  let q = p;
  // 一鍵規劃絕不吃掉某種成獸的最後一張（要吃最後一張只能手動單張確認）。
  for (let guard = 0; guard < 200; guard++) {
    let best: { ref: string; cardId: string; kind: FeedToCapStep['kind']; bonus: number } | null = null;
    if (enabled) {
      const state = readFeedChainState(q, true);
      if (!state.ok) { plan.reason = FEED_REJECTION_TEXT.CHAIN_STATE_INVALID; break; }
      const seen = new Set<string>(), poolNow = feedPool(q, state, ctx.imports ?? []);
      const copies = new Map<string, number>(); poolNow.forEach(u => { if (u.source === 'REWARD') copies.set(u.cardId, (copies.get(u.cardId) ?? 0) + 1); });
      for (const u of poolNow) {
        if (u.source !== 'YOUNG' && u.source !== 'REWARD') continue;
        if (u.source === 'REWARD' && (copies.get(u.cardId) ?? 0) < 2) continue;
        const key = u.source + ':' + u.cardId; if (seen.has(key)) continue; seen.add(key);
        const pv = previewFeed(q, u.ref, targetId, { ...ctx, enabled: true, inBattle: false });
        if (!pv.allowed || !pv.kind) continue;
        if (!best || order[pv.kind] < order[best.kind] || (order[pv.kind] === order[best.kind] && pv.attackBonus > best.bonus)) best = { ref: u.ref, cardId: u.cardId, kind: pv.kind, bonus: pv.attackBonus };
      }
      if (!best) break;
      q = applyFeed(q, `plan:${guard}`, best.ref, targetId, { ...ctx, enabled: true, inBattle: false }).profile;
    } else {
      for (const id of enhancementOptionsYoung(q)) {
        const pv = previewCampaignEnhancement(q, id, targetId);
        if (pv.allowed && (!best || pv.attackBonus > best.bonus)) best = { ref: 'young:' + id, cardId: id, kind: 'YOUNG_TO_TARGET', bonus: pv.attackBonus };
      }
      if (!best) break;
      q = enhanceCampaignProfile(q, `plan:${guard}`, best.cardId, targetId).profile;
    }
    steps.push({ materialRef: best.ref, materialCardId: best.cardId, kind: best.kind, attackBonus: best.bonus });
    if (best.kind === 'YOUNG_TO_TARGET') plan.usedYoung++; else if (best.kind === 'RESONANCE') plan.usedResonance++; else plan.usedAdult++;
  }
  plan.after = attackOf(q); plan.full = plan.after >= capAttack; plan.materialsAfter = materialCount(q, enabled);
  if (!steps.length && !plan.reason) plan.reason = plan.full ? `已滿（${plan.after}／${capAttack}）` : '目前沒有能放進去的材料（材料都被鎖住，或每張都會超過上限）';
  return plan;
}
