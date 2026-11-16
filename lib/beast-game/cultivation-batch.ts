import 'server-only';
/**
 * 2026-11-16 批次吃卡（使用者定案）：長按／連點一口氣加入大量材料，最後一個 ✓ 一次結算。
 * 全部在伺服端算：材料按卡種疊成一堆（照「累積加成最低」排序，訓練過的副本最後才被吃）、每堆最多能吃幾張、
 * 還能吃幾張到五星封頂；預覽與結算只回一份批次總結，不回逐張陣列（1000 張從約 1.6 MB 降到幾 KB）。
 * 規則本身（星級常數、50% 上限、50% 傳承、五星封頂整批拒絕、五種卡型保護）都不在這裡改，仍由 fuseCultivation 判定。
 */
import { cultivationTarget, exactBonus, type CultivationChange } from './cultivation';
import type { CultivationSnapshot } from './cultivation-transaction';
import { fedCounter } from './cultivation-transaction';
import { describeCultivationChange, percentOf } from './cultivation-view';
import { activeFoodChainRule, starProgress } from './cultivation-rules';
import { getCard } from './registry';

export interface MaterialPile { cardId: string; ids: string[]; max: number }
export interface BatchLimits { targetId: string; room: number | null; max: number; piles: MaterialPile[] }

/**
 * 給前端的上限（只讀）：
 * - room：還能吃幾張到五星封頂（v2 的本體／四大神獸；v1 沒有星級＝null）。
 * - 每堆 max：已湊滿五種卡型時，吃光一整種會讓收藏少於五種（伺服端會整批拒絕）；
 *   保守做法＝能整堆吃光的種數不夠時，每堆都留一張。伺服端判定不變，這裡只讓前端提前停。
 * - max：單次上限＝min(room, 各堆 max 總和)。
 */
export function batchLimits(snapshot: CultivationSnapshot, targetId: string): BatchLimits {
  const state = snapshot.state, target = state.cards.find(c => c.id === targetId);
  if (!target) throw new Error('材料或目標已不存在，未扣材料。');
  const targetCard = getCard(target.cardId);
  const fed = fedCounter(snapshot)(target.id);
  const room = activeFoodChainRule() === 'v2' && targetCard && (targetCard.form === 'ADULT' || targetCard.form === 'GUARDIAN') ? Math.max(0, starProgress(targetCard.form, fed).capFeeds - fed) : null;
  const groups = new Map<string, { id: string; bonus: bigint; order: number }[]>();
  state.cards.forEach((c, order) => {
    if (c.id === target.id || state.protectedIds.includes(c.id) || cultivationTarget(c.cardId) !== target.cardId) return;
    const list = groups.get(c.cardId) ?? []; list.push({ id: c.id, bonus: exactBonus(c.bonus), order }); groups.set(c.cardId, list);
  });
  const types = new Set(state.cards.filter(c => getCard(c.cardId)).map(c => c.cardId)).size;
  const total = (cardId: string) => state.cards.filter(c => c.cardId === cardId).length;
  const entries = [...groups.entries()].map(([cardId, list]) => ({ cardId, list: list.sort((a, b) => (a.bonus < b.bonus ? -1 : a.bonus > b.bonus ? 1 : a.order - b.order)), complete: total(cardId) === list.length }));
  const completeCount = entries.filter(e => e.complete).length;
  const fullyEatable = types < 5 ? Infinity : types - 5;
  const keepOne = completeCount > fullyEatable;
  const piles = entries.map(e => ({ cardId: e.cardId, ids: e.list.map(x => x.id), max: Math.max(0, e.list.length - (keepOne && e.complete ? 1 : 0)) }));
  const sum = piles.reduce((a, p) => a + p.max, 0);
  return { targetId: target.id, room, max: room === null ? sum : Math.min(room, sum), piles };
}

/** 一批（同一張目標）的總結：第一張之前 → 最後一張之後；加成、傳承、+0 張數累加。只照印伺服端數字。 */
export function summarizeCultivationChanges(changes: readonly CultivationChange[]) {
  if (!changes.length) throw new Error('請選擇合體材料。');
  if (changes.some(c => c.targetId !== changes[0].targetId)) throw new Error('一次只能強化一張卡。');
  const first = describeCultivationChange(changes[0]), last = changes.length === 1 ? first : describeCultivationChange(changes[changes.length - 1]);
  let added = 0n, inherited = 0n, raw = 0n, zeroCount = 0;
  const counts = new Map<string, number>();
  for (const c of changes) {
    const a = exactBonus(c.addedBonus); added += a; if (a === 0n) zeroCount++;
    if (c.inheritedBonus) inherited += exactBonus(c.inheritedBonus);
    if (c.rawBonus) raw += exactBonus(c.rawBonus);
    counts.set(c.materialCardId, (counts.get(c.materialCardId) ?? 0) + 1);
  }
  const materials = [...counts.entries()].map(([cardId, count]) => ({ cardId, name: getCard(cardId)?.name ?? '', count })).sort((a, b) => b.count - a.count);
  const lead = materials[0], target = getCard(first.targetCardId)!;
  const capBonus = last.capBonus;
  return {
    ...last,
    materialId: changes[0].materialId, materialCardId: lead.cardId, materialName: lead.name,
    beforeBonus: first.beforeBonus, addedBonus: added.toString(), afterBonus: last.afterBonus,
    ...(first.rule === 'v2' ? { inheritedBonus: inherited.toString(), rawBonus: raw.toString(), fedBefore: first.fedBefore } : {}),
    capped: changes.some(c => c.capped === true),
    addedPercent: percentOf(added, target.stats.attack), totalPercentBefore: first.totalPercentBefore,
    beforeOrbAttack: first.beforeOrbAttack, beforeBattleAttack: first.beforeBattleAttack,
    starsBefore: first.starsBefore,
    count: changes.length, zeroCount, materials,
    atBonusCap: capBonus !== undefined && exactBonus(last.afterBonus) >= exactBonus(capBonus),
  };
}
export type CultivationBatchSummary = ReturnType<typeof summarizeCultivationChanges>;
