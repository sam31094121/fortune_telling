/**
 * 「四大神獸・點擊直接強化」頁的資料（只在伺服器算；前端只照著畫）。
 *
 * 不新增任何規則：
 * - 誰能吃誰：沿用 cultivation.ts 的 canCultivatePair；v3接受各卡種材料。
 * - 能不能真的合體、加多少：直接拿 fuseSnapshot（和 PREVIEW／FUSE 同一套當前升星規則：元素增量、傳承、五星封頂）試算，不寫入；失敗就標成不能。
 * - 卡片來源：伺服器發卡時寫進副本 id 的來源只拿來「顯示計數」（神獸戰鬥 duel:、寶珠連線 orb-win: 或舊進度帶上來的寶珠獎卡，其餘＝OTHER）。
 * 2026-11-16 整合（使用者 00:35 授權，以正式站共同卡庫為準）：
 * - 拿掉「未鎖定五隻主力不能強化」（NO_MAIN／mainTeamReady）：正式站 d9bce150 起新玩家不必先鎖五隻也能吃卡；已鎖定主力仍不能當材料（LOCKED）。
 * - 材料不再只限兩種來源：FUSE 與神獸戰鬥強化面板都接受所有自己的副本（新玩家的成長卡也能吃），這頁和面板列出同一批，才不會互相矛盾。
 */
import 'server-only';
import { createHash } from 'node:crypto';
import { activeFoodChainRule, starProgress } from './cultivation-rules';
import { fedCounter } from './cultivation-transaction';
import { GUARDIANS } from '../beast-guardians';
import { cultivationTarget, canCultivatePair, exactBonus } from './cultivation';
import { fuseSnapshot, type CultivationSnapshot } from './cultivation-transaction';
import { getCard, playableCards } from './registry';

export type EnhanceSource = 'DUEL' | 'ORB' | 'OTHER';
/** READY 可直接強化；LOCKED 是鎖定主力；NO_TARGET 還沒有大卡；PENDING 戰鬥未結算；BLOCKED 試算不通過（例如五星封頂、或已滿五種的收藏吃完會不足五種）。 */
export type EnhanceStatus = 'READY' | 'LOCKED' | 'NO_TARGET' | 'PENDING' | 'BLOCKED';

export interface EnhanceMaterial { copyId: string; cardId: string; thumb: string; source: EnhanceSource; tier: 'YOUNG_TO_ADULT' | 'ADULT_TO_GUARDIAN' | 'CULTIVATION'; targetCardId: string; targetCopyId: string | null; status: EnhanceStatus; addedBonus: string | null }
export interface EnhanceNode { cardId: string; thumb: string; owned: number; bonus: string; ready: number; waiting: number }
export interface FourBeastsView {
  revision: string;
  enhanceableCount: number;
  materialCount: number;
  sources: { duel: number; orb: number; other: number };
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
  const pendingBattle = !!snapshot.pendingBattle;
  // 大卡選擇：同卡型持有多張時，強化加成最高那張（同分取主力，再取 id），只是顯示用的預設，不是規則。
  const bestCopy = (cardId: string) => state.cards.filter(c => c.cardId === cardId)
    .sort((a, b) => { const d = exactBonus(b.bonus) - exactBonus(a.bonus); return d ? (d > 0n ? 1 : -1) : Number(state.protectedIds.includes(b.id)) - Number(state.protectedIds.includes(a.id)) || a.id.localeCompare(b.id); })[0] ?? null;
  const materials: EnhanceMaterial[] = [];
  const rule=activeFoodChainRule(),fedOf=fedCounter(snapshot);
  const targets=state.cards.filter(c=>getCard(c.cardId)?.form!=='YOUNG');
  const hasRoom=new Set(targets.filter(c=>{const form=getCard(c.cardId)!.form;return (form==='ADULT'||form==='GUARDIAN')&&!starProgress(form,fedOf(c.id)).maxed;}).map(c=>c.id));
  for (const copy of state.cards) {
    const source = copySource(snapshot, copy as { id: string; origin?: { kind?: string } }, orbIds);
    const card = getCard(copy.cardId);
    if (!card) continue;
    const preferred = cultivationTarget(copy.cardId);
    const candidates = targets.filter(c=>c.id!==copy.id&&canCultivatePair(copy.cardId,c.cardId,rule)).sort((a,b)=>Number(b.cardId===preferred)-Number(a.cardId===preferred));
    const target = candidates.find(c=>hasRoom.has(c.id))??candidates[0]??null;
    const targetCardId = target?.cardId ?? preferred ?? '';
    if (!targetCardId) continue;
    let status: EnhanceStatus, addedBonus: string | null = null;
    if (state.protectedIds.includes(copy.id)) status = 'LOCKED';
    else if (!target) status = 'NO_TARGET';
    else if (pendingBattle) status = 'PENDING';
    else {
      try { addedBonus = fuseSnapshot(snapshot, [{ targetId: target.id, materialId: copy.id }]).changes[0].addedBonus; status = 'READY'; }
      catch { status = 'BLOCKED'; }
    }
    materials.push({ copyId: copy.id, cardId: copy.cardId, thumb: thumbOf(copy.cardId), source, tier: rule === 'v3' ? 'CULTIVATION' : card.form === 'YOUNG' ? 'YOUNG_TO_ADULT' : 'ADULT_TO_GUARDIAN', targetCardId, targetCopyId: target?.id ?? null, status, addedBonus });
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
    sources: { duel: materials.filter(m => m.source === 'DUEL').length, orb: materials.filter(m => m.source === 'ORB').length, other: materials.filter(m => m.source === 'OTHER').length },
    pendingBattle, guardians, materials };
}
