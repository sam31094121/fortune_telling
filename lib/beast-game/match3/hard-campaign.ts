import { getCard, playableCards } from '../registry';
import { CARD_FACE_STATS } from '../card-face-stats';

export interface CampaignReward { matchId: string; cardId: string; win: number }
export interface EnhancementReceipt { operationId: string; youngId: string; targetId: string; attackBonus: number }
export interface HardCampaign {
  version: 1;
  wins: number;
  heroId: string | null;
  heroChoiceUsed: boolean;
  teamIds: string[];
  rewards: CampaignReward[];
  receipts: CampaignReward[];
  consumedYoungIds?: string[];
  enhancements?: Record<string, number>;
  enhancementReceipts?: EnhancementReceipt[];
}
export const campaignAdultIds = (): string[] => playableCards().filter(c => c.form === 'ADULT').map(c => c.id).sort();
export const campaignGuardianIds = (): string[] => playableCards().filter(c => c.form === 'GUARDIAN').map(c => c.id).sort();
export function newCampaign(wins = 0): HardCampaign {
  return { version: 1, wins: Number.isSafeInteger(wins) && wins >= 0 ? wins : 0, heroId: null, heroChoiceUsed: false, teamIds: [], rewards: [], receipts: [] };
}
export function campaignHeroChoice(p: HardCampaign): 'initial' | 'milestone' | 'locked' {
  return !p.heroId ? 'initial' : p.wins >= 8 && !p.heroChoiceUsed ? 'milestone' : 'locked';
}
export function campaignAvailableIds(p: HardCampaign): string[] {
  return [...new Set([...playableCards().filter(c => c.form === 'YOUNG' && !(p.consumedYoungIds ?? []).includes(c.id)).map(c => c.id), ...p.rewards.map(r => r.cardId), ...(p.heroId ? [p.heroId] : [])])];
}
export function campaignCollection(p: HardCampaign): { heroId: string | null; adults: { cardId: string; count: number }[]; youngIds: string[] } {
  const counts = new Map<string, number>();
  p.rewards.forEach(r => counts.set(r.cardId, (counts.get(r.cardId) ?? 0) + 1));
  return { heroId: p.heroId, adults: campaignAdultIds().filter(id => counts.has(id)).map(cardId => ({ cardId, count: counts.get(cardId)! })), youngIds: playableCards().filter(c => c.form === 'YOUNG' && !(p.consumedYoungIds ?? []).includes(c.id)).map(c => c.id) };
}
export function enhancementUnlocked(p: HardCampaign): boolean { return Number.isSafeInteger(p.wins) && p.wins >= 4; }
export function enhancementStatus(p: HardCampaign): { unlocked: boolean; requiredWins: number; unlockStage: number } {
  return { unlocked: enhancementUnlocked(p), requiredWins: 4, unlockStage: 5 };
}
export function enhancementBonus(p: HardCampaign, cardId: string): number {
  const bonus = p.enhancements?.[cardId] ?? 0;
  if (!Number.isSafeInteger(bonus) || bonus < 0 || bonus > Math.floor((CARD_FACE_STATS[cardId]?.attack ?? 0) * .5)) throw new Error('強化數值無效');
  return enhancementUnlocked(p) ? bonus : 0;
}
export function campaignAttack(p: HardCampaign, cardId: string): number { return campaignCardAttack(p, cardId).attack; }
export function campaignCardAttack(p: HardCampaign, cardId: string): { baseAttack: number; bonus: number; attack: number } {
  const card = getCard(cardId);
  if (!card) throw new Error('卡片資料不存在');
  const bonus = enhancementBonus(p, cardId);
  const baseAttack = CARD_FACE_STATS[cardId].attack;
  return { baseAttack, bonus, attack: baseAttack + bonus };
}
export function enhancementOptions(p: HardCampaign): { youngIds: string[]; targetIds: string[] } {
  return { youngIds: campaignCollection(p).youngIds.filter(id => !p.teamIds.includes(id)), targetIds: [...new Set([...(p.heroId ? [p.heroId] : []), ...p.rewards.map(r => r.cardId)])] };
}
export function previewCampaignEnhancement(p: HardCampaign, youngId: string, targetId: string) {
  const young = getCard(youngId), target = getCard(targetId);
  const baseAttack = CARD_FACE_STATS[targetId]?.attack ?? 0, currentBonus = enhancementBonus(p, targetId);
  const attackBonus = young ? Math.max(1, Math.floor(CARD_FACE_STATS[young.id].attack * .1)) : 0;
  const maxBonus = Math.floor(baseAttack * .5), newTotal = currentBonus + attackBonus;
  const options = enhancementOptions(p);
  const reason = !enhancementUnlocked(p) ? '通過第四關、進入第五關後才能永久強化'
    : !target || !options.targetIds.includes(targetId) ? '只能強化目前主角或已獲得成獸'
    : !young || young.form !== 'YOUNG' || !options.youngIds.includes(youngId) ? '請使用未出戰、尚未消耗的幼子'
    : campaignAvailableIds(p).filter(id => id !== p.heroId && id !== youngId).length < 4 ? '至少須保留四張可出戰夥伴'
    : newTotal > maxBonus || attackBonus <= 0 ? '已達強化上限，不能消耗幼子' : undefined;
  return { allowed: !reason, reason, baseAttack, currentBonus, attackBonus, newTotal, afterAttack: baseAttack + newTotal, maxBonus };
}
export function enhanceCampaignProfile(p: HardCampaign, operationId: string, youngId: string, targetId: string): { profile: HardCampaign; receipt: EnhancementReceipt; duplicate: boolean } {
  if (!operationId.trim() || operationId.length > 200) throw new Error('強化操作識別無效');
  const existing = p.enhancementReceipts?.find(r => r.operationId === operationId);
  if (existing) {
    if (existing.youngId !== youngId || existing.targetId !== targetId) throw new Error('強化操作識別不一致');
    return { profile: p, receipt: existing, duplicate: true };
  }
  const preview = previewCampaignEnhancement(p, youngId, targetId);
  if (!preview.allowed) throw new Error(preview.reason);
  const receipt = { operationId, youngId, targetId, attackBonus: preview.attackBonus };
  return { profile: { ...p, consumedYoungIds: [...(p.consumedYoungIds ?? []), youngId], enhancements: { ...(p.enhancements ?? {}), [targetId]: preview.newTotal }, enhancementReceipts: [...(p.enhancementReceipts ?? []), receipt] }, receipt, duplicate: false };
}
export function validateCampaignTeam(p: HardCampaign, ids: readonly string[]): boolean {
  const available = new Set(campaignAvailableIds(p));
  return !!p.heroId && ids.length === 5 && ids[0] === p.heroId && new Set(ids).size === 5 && ids.every(id => available.has(id));
}
export function chooseCampaignHero(p: HardCampaign, id: string): HardCampaign {
  const choice = campaignHeroChoice(p);
  if (!campaignGuardianIds().includes(id) || choice === 'locked') throw new Error('主角目前不可更換');
  // Existing players already beyond stage eight confirm their guardian once,
  // rather than receiving an immediate second prompt after initial adoption.
  const next = { ...p, heroId: id, heroChoiceUsed: p.wins >= 8, teamIds: p.teamIds.length === 5 ? [id, ...p.teamIds.slice(1)] : [] };
  if (next.teamIds.length && !validateCampaignTeam(next, next.teamIds)) next.teamIds = [];
  return next;
}
export function campaignWin(p: HardCampaign, matchId: string, winsAtStart: number): { profile: HardCampaign; reward: CampaignReward; duplicate: boolean } {
  if (!matchId.trim() || matchId.length > 200) throw new Error('戰局識別無效');
  const receipt = p.receipts.find(r => r.matchId === matchId);
  if (receipt) return { profile: p, reward: receipt, duplicate: true };
  if (!validateCampaignTeam(p, p.teamIds) || winsAtStart !== p.wins || !Number.isSafeInteger(p.wins + 1)) throw new Error('戰局進度已變更，請重新進入');
  const adults = campaignAdultIds();
  if (adults.length !== 28) throw new Error('成獸牌庫不完整');
  const reward = { matchId, cardId: adults[p.wins % adults.length], win: p.wins + 1 };
  return { profile: { ...p, wins: reward.win, rewards: [...p.rewards, reward], receipts: [...p.receipts, reward] }, reward, duplicate: false };
}
export function parseCampaign(raw: string): HardCampaign {
  const p = JSON.parse(raw) as HardCampaign;
  p.consumedYoungIds ??= [];
  p.enhancements ??= {};
  p.enhancementReceipts ??= [];
  const adults = new Set(campaignAdultIds());
  if (!p || p.version !== 1 || !Number.isSafeInteger(p.wins) || p.wins < 0 || typeof p.heroChoiceUsed !== 'boolean' || (p.heroId !== null && !campaignGuardianIds().includes(p.heroId)) || !Array.isArray(p.teamIds) || !Array.isArray(p.rewards) || !Array.isArray(p.receipts)) throw new Error('寶珠存檔格式不完整');
  if (p.teamIds.length && !validateCampaignTeam(p, p.teamIds)) throw new Error('寶珠隊伍存檔無效');
  if (p.heroChoiceUsed && (!p.heroId || p.wins < 8)) throw new Error('主角選擇紀錄不一致');
  const orderedAdults = campaignAdultIds();
  if (p.rewards.length !== p.receipts.length || new Set(p.receipts.map(r => r.matchId)).size !== p.receipts.length || p.receipts.some((r, i) => !r || typeof r.matchId !== 'string' || !r.matchId.trim() || !adults.has(r.cardId) || !Number.isSafeInteger(r.win) || r.win < 1 || r.win > p.wins || (i > 0 && r.win !== p.receipts[i - 1].win + 1) || r.cardId !== orderedAdults[(r.win - 1) % orderedAdults.length] || JSON.stringify(r) !== JSON.stringify(p.rewards[i]))) throw new Error('寶珠獎勵紀錄不一致');
  if (!Array.isArray(p.consumedYoungIds) || !Array.isArray(p.enhancementReceipts) || !p.enhancements || typeof p.enhancements !== 'object' || Array.isArray(p.enhancements)) throw new Error('強化存檔格式無效');
  const consumed = new Set(p.consumedYoungIds), operations = new Set<string>(), totals: Record<string, number> = {};
  if (consumed.size !== p.consumedYoungIds.length || consumed.size !== p.enhancementReceipts.length) throw new Error('強化材料紀錄重複');
  for (const r of p.enhancementReceipts) {
    const young = r && getCard(r.youngId), target = r && getCard(r.targetId);
    if (!r || typeof r.operationId !== 'string' || !r.operationId.trim() || operations.has(r.operationId) || young?.form !== 'YOUNG' || !target || (target.form !== 'GUARDIAN' && !p.rewards.some(reward => reward.cardId === r.targetId)) || !consumed.has(r.youngId) || r.attackBonus !== Math.max(1, Math.floor(young.stats.attack * .1))) throw new Error('強化收據無效');
    operations.add(r.operationId); consumed.delete(r.youngId);
    totals[r.targetId] = (totals[r.targetId] ?? 0) + r.attackBonus;
  }
  if (consumed.size || Object.keys(p.enhancements).length !== Object.keys(totals).length || Object.entries(totals).some(([id, bonus]) => enhancementBonus(p, id) !== bonus)) throw new Error('強化數值與收據不一致');
  return p;
}
