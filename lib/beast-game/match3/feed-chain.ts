/**
 * 寶珠闖關「餵食／合體鏈」規則（DESIGN.md v1＋v2；P0＝結構與規則）。
 *
 * 只有一個入口規則函式（previewFeed），同時給 ①畫面預覽 ②寫入存檔前（applyFeed）③讀檔重播（readFeedChainState）使用。
 * 功能開關 NEXT_PUBLIC_M3_FEED_CHAIN 未設定或不是 '1' 時：不讀新欄位、不寫存檔、預覽一律拒絕（FLAG_OFF）。
 * 卡面數值（CARD_FACE_STATS／cards/beasts）只讀不改；暴怒合體（fusion.ts）、押卡帳本、碎片完全不碰。
 *
 * P0 已知界線（誠實標示，不假裝做完）：
 * - 幼子餵食仍寫入既有 enhancementReceipts（只有攻擊）；幼子 +2 開局能量是 P1，P0 的預覽與實際一律為 0。
 * - 匯入卡（import-ledger.ts）P0 只計入卡池與排名，不能當材料（IMPORT_MATERIAL_PENDING），P3 才接。
 * - 鏈加成還沒接進 campaignAttack／Match3Board 開局能量（P1／P2 由整合方接線）。
 */
import { getCard } from '../registry';
import { CARD_FACE_STATS } from '../card-face-stats';
import { enhanceCampaignProfile, enhancementBonus, parseCampaign, type ChainReceipt, type HardCampaign } from './hard-campaign';
import type { ImportedCardReceipt } from './import-ledger';

export const FEED_CHAIN_FLAG = 'NEXT_PUBLIC_M3_FEED_CHAIN';
/** 未設定時等於關閉；沿用 config.ts 的 '1' 慣例。 */
export function feedChainEnabled(value: string | undefined = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_M3_FEED_CHAIN : undefined): boolean {
  return value === '1';
}

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
export interface FeedChainState { enabled: boolean; ok: boolean; error?: string; chainReceipts: ChainReceipt[]; consumedRewardMatchIds: string[] }
export interface FeedCardStat { cardId: string; form: Form; faceAttack: number; youngBonus: number; chainBonus: number; effectiveAttack: number; startEnergy: number; copies: number }
export type FeedLockReason = 'GUARDIAN' | 'TEAM' | 'TOP_FIVE' | 'TOP_ENERGY';
export type FeedRejection = 'FLAG_OFF' | 'IN_BATTLE' | 'CHAIN_STATE_INVALID' | 'MATERIAL_UNAVAILABLE' | 'TARGET_UNAVAILABLE' | 'SELF' | 'GUARDIAN_MATERIAL' | 'NOT_UPWARD' | 'LOCKED_BY_WINS' | 'TEAM_MEMBER' | 'TOP_FIVE' | 'TOP_ENERGY' | 'IMPORT_MATERIAL_PENDING' | 'ATTACK_CAP' | 'NO_HERO' | 'MIN_FIVE';
export const FEED_REJECTION_TEXT: Record<FeedRejection, string> = {
  FLAG_OFF: '餵食鏈尚未開放',
  IN_BATTLE: '戰鬥中不能餵卡',
  CHAIN_STATE_INVALID: '餵食紀錄無法讀取，已暫停餵食',
  MATERIAL_UNAVAILABLE: '這張材料卡目前不可用',
  TARGET_UNAVAILABLE: '只能強化目前持有的卡',
  SELF: '不能自己吃自己',
  GUARDIAN_MATERIAL: '四大神獸不能被吃',
  NOT_UPWARD: '只能往上吃：幼子→本體／四大神獸，本體→四大神獸',
  LOCKED_BY_WINS: '尚未達到解鎖勝場',
  TEAM_MEMBER: '出戰隊伍的卡不能當材料',
  TOP_FIVE: '攻擊前五名要保留',
  TOP_ENERGY: '開局能量最高的卡要保留',
  IMPORT_MATERIAL_PENDING: '其他模式的卡尚未開放當材料',
  ATTACK_CAP: '已達強化上限',
  NO_HERO: '要先選主角四大神獸',
  MIN_FIVE: '要留五張能打的卡',
};
export type FeedWarning = 'LAST_ELEMENT';
export interface FeedContext { enabled?: boolean; inBattle: boolean; imports?: readonly ImportedCardReceipt[] }

const face = (cardId: string): number => CARD_FACE_STATS[cardId]?.attack ?? 0;
const formOf = (cardId: string): Form | undefined => getCard(cardId)?.form as Form | undefined;
const capOf = (cardId: string): number => Math.floor(face(cardId) * FEED_CHAIN_RULES.attackCapRatio);
const byId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
export const materialAttackBonus = (materialCardId: string): number => Math.max(1, Math.floor(face(materialCardId) * FEED_CHAIN_RULES.materialAttackRatio));
/** 本體 → 四大神獸：卡面 ×10%（捨去、至少 +1）＋ 該本體目前累積強化 ×50%（捨去）。 */
export function adultFeedBonus(p: HardCampaign, adultId: string): { base: number; inheritedAttack: number; attackBonus: number } {
  const base = materialAttackBonus(adultId), inheritedAttack = Math.floor(enhancementBonus(p, adultId) * FEED_CHAIN_RULES.inheritRatio);
  return { base, inheritedAttack, attackBonus: base + inheritedAttack };
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
    const receipts = p.chainReceipts ?? [], consumed = p.consumedRewardMatchIds ?? [];
    if (!Array.isArray(receipts) || !Array.isArray(consumed) || consumed.some(id => typeof id !== 'string')) return invalidState('餵食欄位格式無效');
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
      chainTotals[r.targetId] = (chainTotals[r.targetId] ?? 0) + r.attackBonus;
    }
    if (rewardMaterials.size !== consumedSet.size) return invalidState('被吃掉的獎勵卡缺少收據');
    if (Object.entries(chainTotals).some(([id, total]) => enhancementBonus(p, id) + total > capOf(id))) return invalidState('強化合計超過上限');
    return { enabled: true, ok: true, chainReceipts: receipts, consumedRewardMatchIds: consumed };
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
    const youngBonus = enhancementBonus(p, cardId);
    const chain = state.chainReceipts.filter(r => r.targetId === cardId);
    const chainBonus = chain.reduce((sum, r) => sum + r.attackBonus, 0);
    const startEnergy = Math.min(FEED_CHAIN_RULES.cardEnergyCap, chain.reduce((sum, r) => sum + r.energyBonus, 0));
    const effectiveAttack = face(cardId) + Math.min(capOf(cardId), youngBonus + chainBonus);
    return { cardId, form: formOf(cardId)!, faceAttack: face(cardId), youngBonus, chainBonus, effectiveAttack, startEnergy, copies: copies.get(cardId)! };
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
  kind: 'YOUNG_TO_TARGET' | 'ADULT_TO_GUARDIAN' | null; material?: FeedUnit; targetId: string;
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
    : { ...adultFeedBonus(p, material.cardId), energyBonus: FEED_CHAIN_RULES.adultEnergyBonus };
  base.attackBonus = bonus.attackBonus; base.inheritedAttack = bonus.inheritedAttack; base.energyBonus = bonus.energyBonus;
  const newTotal = targetStat.youngBonus + targetStat.chainBonus + bonus.attackBonus;
  if (bonus.attackBonus <= 0 || newTotal > capOf(targetId)) reject('ATTACK_CAP');
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
  const preview = previewFeed(p, materialRef, targetId, ctx);
  if (!preview.allowed || !preview.material) throw new Error(preview.reasonText ?? FEED_REJECTION_TEXT.MATERIAL_UNAVAILABLE);
  let next: HardCampaign;
  if (preview.kind === 'YOUNG_TO_TARGET') {
    next = enhanceCampaignProfile(p, operationId, preview.material.cardId, targetId).profile;
  } else {
    const matchId = preview.material.ref.slice('reward:'.length);
    const receipt: ChainReceipt = { operationId, material: { kind: 'REWARD', matchId }, materialCardId: preview.material.cardId, targetId, inheritedAttack: preview.inheritedAttack, attackBonus: preview.attackBonus, energyBonus: preview.energyBonus };
    next = { ...p, chainReceipts: [...state.chainReceipts, receipt], consumedRewardMatchIds: [...state.consumedRewardMatchIds, matchId] };
  }
  parseCampaign(JSON.stringify(next));
  if (!readFeedChainState(next, true).ok) throw new Error(FEED_REJECTION_TEXT.CHAIN_STATE_INVALID);
  return { profile: next, preview, duplicate: false };
}

/** 四象分組（不用元素分組）：mansionId 1–7 青龍、8–14 玄武、15–21 白虎、22–28 朱雀。 */
export type FourSymbol = 'QINGLONG' | 'XUANWU' | 'BAIHU' | 'ZHUQUE';
export const FOUR_SYMBOLS: readonly FourSymbol[] = ['QINGLONG', 'XUANWU', 'BAIHU', 'ZHUQUE'];
export function fourSymbolOf(cardId: string): FourSymbol | null {
  const m = getCard(cardId)?.mansionId;
  return typeof m === 'number' && m >= 1 && m <= 28 ? FOUR_SYMBOLS[Math.floor((m - 1) / 7)] : null;
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
  const groups = { QINGLONG: [], XUANWU: [], BAIHU: [], ZHUQUE: [] } as Record<FourSymbol, FeedChainViewCard[]>;
  if (!state.enabled || !state.ok) return { enabled: state.enabled, ok: state.ok, error: state.error, team: [], lockedTop: [], suggestions: [], groups, groupsCollapsedByDefault: true };
  const pool = feedPool(p, state, ctx.imports ?? []), stats = feedCardStats(p, state, pool), rank = rankFeedCards(stats), locks = feedLocks(p, stats);
  for (const { cardId, count } of stackAvailableCopies(pool)) { const g = fourSymbolOf(cardId); if (g) groups[g].push({ cardId, count, locks: locks.get(cardId) ?? [] }); }
  const lockedTop = [...rank.topFive, ...(rank.energyLeader && !rank.topFive.includes(rank.energyLeader) ? [rank.energyLeader] : [])];
  return { enabled: true, ok: true, team: [...p.teamIds], lockedTop, suggestions: [], groups, groupsCollapsedByDefault: true };
}
