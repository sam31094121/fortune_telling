/**
 * 「四大神獸・點擊直接強化」頁的資料（只在伺服器算；前端只照著畫）。
 *
 * 不新增任何規則：
 * - 誰能吃誰：沿用 cultivation.ts 的 cultivationTarget（同宿幼子 → 本體；本體 → 所屬四大神獸）。
 * - 能不能真的合體、加多少：直接拿 fuseCultivation 試算（不寫入），失敗就標成不能。
 * - 卡片來源：只認伺服器發卡時寫進副本 id 的來源——神獸戰鬥勝利（duel:）與寶珠連線勝利（orb-win: 或舊進度帶上來的寶珠獎卡）。
 *   其他來源（首戰禮、成長卡、碎片兌換）照業主「強化卡片只有兩種來源」不列為這頁的材料。
 */
import 'server-only';
import { createHash } from 'node:crypto';
import { GUARDIANS } from '../beast-guardians';
import { cultivationTarget, exactBonus, fuseCultivation } from './cultivation';
import type { CultivationSnapshot } from './cultivation-transaction';
import { getCard, playableCards } from './registry';

export type EnhanceSource = 'DUEL' | 'ORB' | 'OTHER';
/** READY 可直接強化；LOCKED 是鎖定主力；NO_TARGET 還沒有大卡；NO_MAIN 尚未鎖定五隻主力；PENDING 戰鬥未結算；BLOCKED 試算不通過（例如合體後不足五種卡型）。 */
export type EnhanceStatus = 'READY' | 'LOCKED' | 'NO_TARGET' | 'NO_MAIN' | 'PENDING' | 'BLOCKED';

export interface EnhanceMaterial { copyId: string; cardId: string; thumb: string; source: Exclude<EnhanceSource, 'OTHER'>; tier: 'YOUNG_TO_ADULT' | 'ADULT_TO_GUARDIAN'; targetCardId: string; targetCopyId: string | null; status: EnhanceStatus; addedBonus: string | null }
export interface EnhanceNode { cardId: string; thumb: string; owned: number; bonus: string; ready: number; waiting: number }
export interface FourBeastsView {
  revision: string;
  enhanceableCount: number;
  materialCount: number;
  sources: { duel: number; orb: number };
  mainTeamReady: boolean;
  pendingBattle: boolean;
  guardians: (EnhanceNode & { key: string; element: string; mansions: (EnhanceNode & { mansionId: number; young: EnhanceNode })[] })[];
  materials: EnhanceMaterial[];
}

const orbRewardId = (matchId: string) => createHash('sha256').update('orb-reward').update('\0').update(matchId).digest('hex');

export function copySource(snapshot: CultivationSnapshot, copy: { id: string; origin?: { kind?: string } }, orbIds: Set<string>): EnhanceSource {
  if (copy.id.startsWith('duel:')) return 'DUEL';
  if (copy.id.startsWith('orb-win:') || copy.origin?.kind === 'ORB_REWARD' || orbIds.has(copy.id)) return 'ORB';
  return 'OTHER';
}

const thumbOf = (cardId: string) => getCard(cardId)?.art.thumbnail ?? '';

export function fourBeastsView(snapshot: CultivationSnapshot): FourBeastsView {
  const { state } = snapshot;
  const orbIds = new Set((snapshot.orbLedger?.rewards ?? []).map(r => orbRewardId(r.matchId)));
  const mainTeamReady = state.protectedIds.length === 5;
  const pendingBattle = !!snapshot.pendingBattle;
  // 大卡選擇：同卡型持有多張時，強化加成最高那張（同分取主力，再取 id），只是顯示用的預設，不是規則。
  const bestCopy = (cardId: string) => state.cards.filter(c => c.cardId === cardId)
    .toSorted((a, b) => { const d = exactBonus(b.bonus) - exactBonus(a.bonus); return d ? (d > 0n ? 1 : -1) : Number(state.protectedIds.includes(b.id)) - Number(state.protectedIds.includes(a.id)) || a.id.localeCompare(b.id); })[0] ?? null;
  const materials: EnhanceMaterial[] = [];
  for (const copy of state.cards) {
    const source = copySource(snapshot, copy as { id: string; origin?: { kind?: string } }, orbIds);
    if (source === 'OTHER') continue;
    const card = getCard(copy.cardId), targetCardId = cultivationTarget(copy.cardId);
    if (!card || !targetCardId) continue; // 四大神獸本身是最大卡，不當材料
    const target = bestCopy(targetCardId);
    let status: EnhanceStatus, addedBonus: string | null = null;
    if (state.protectedIds.includes(copy.id)) status = 'LOCKED';
    else if (!target) status = 'NO_TARGET';
    else if (pendingBattle) status = 'PENDING';
    else if (!mainTeamReady) status = 'NO_MAIN';
    else {
      try { addedBonus = fuseCultivation(state, [{ targetId: target.id, materialId: copy.id }]).changes[0].addedBonus; status = 'READY'; }
      catch { status = 'BLOCKED'; }
    }
    materials.push({ copyId: copy.id, cardId: copy.cardId, thumb: thumbOf(copy.cardId), source, tier: card.form === 'YOUNG' ? 'YOUNG_TO_ADULT' : 'ADULT_TO_GUARDIAN', targetCardId, targetCopyId: target?.id ?? null, status, addedBonus });
  }
  const node = (cardId: string): EnhanceNode => {
    const best = bestCopy(cardId), into = materials.filter(m => m.targetCardId === cardId);
    return { cardId, thumb: thumbOf(cardId), owned: state.cards.filter(c => c.cardId === cardId).length, bonus: best ? exactBonus(best.bonus).toString() : '0',
      ready: into.filter(m => m.status === 'READY').length, waiting: into.filter(m => m.status !== 'READY').length };
  };
  const cards = playableCards();
  const guardians = GUARDIANS.map(g => ({ ...node(g.cardId), key: g.key, element: g.element,
    mansions: g.mansions.map(mansionId => {
      const adult = cards.find(c => c.form === 'ADULT' && c.mansionId === mansionId), young = cards.find(c => c.form === 'YOUNG' && c.mansionId === mansionId);
      return adult && young ? { ...node(adult.id), mansionId, young: node(young.id) } : null;
    }).filter((m): m is NonNullable<typeof m> => m !== null) }));
  return { revision: snapshot.revision, enhanceableCount: materials.filter(m => m.status === 'READY').length, materialCount: materials.length,
    sources: { duel: materials.filter(m => m.source === 'DUEL').length, orb: materials.filter(m => m.source === 'ORB').length },
    mainTeamReady, pendingBattle, guardians, materials };
}
