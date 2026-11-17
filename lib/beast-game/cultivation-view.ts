import 'server-only';
import { exactBonus, cultivationTarget, cultivationProtection, type CultivationChange } from './cultivation';
import { fedCounter, type CultivationSnapshot } from './cultivation-transaction';
import { attackBonusCap, starProgress, activeFoodChainRule, type StarProgress } from './cultivation-rules';
import { getCard, playableCards } from './registry';
import { newMatch } from './interactive';

/** 神獸戰鬥的卡面原始攻擊（與寶石捷連線的卡面攻擊分開保存）。 */
export function battleBaseAttack(cardId: string): bigint {
  return BigInt(newMatch([cardId], [cardId], 0).player.team[0].attack);
}
/** 百分比以目標卡面原始攻擊為基準（10A），伺服端換算好給畫面照印：bps＝萬分比整數，label＝四捨五入整數百分比（>0 但不到 1% 印「<1」）。 */
export function percentOf(bonus: bigint, baseAttack: number): { bps: string; label: string } {
  if (baseAttack <= 0) return { bps: '0', label: '0' };
  const bps = bonus * 10000n / BigInt(baseAttack), rounded = (bonus * 100n * 2n + BigInt(baseAttack)) / (BigInt(baseAttack) * 2n);
  return { bps: bps.toString(), label: bonus > 0n && rounded === 0n ? '<1' : rounded.toString() };
}
/** 能餵給 cardId 的所有材料卡名稱（依 cultivationTarget 反查，規則只有一份）。 */
function feederNames(cardId: string): string {
  return playableCards().filter(c => cultivationTarget(c.id) === cardId).map(c => c.name).join('、');
}
function stars(form: string, fed: number): StarProgress | null {
  return form === 'ADULT' || form === 'GUARDIAN' ? starProgress(form, fed) : null;
}

/**
 * 吃卡回饋（預覽與存檔後共用）：吃了誰、攻擊加幾成、兩款遊戲攻擊前後、星級前後。
 * 只補顯示欄位，不改寫收據；舊收據（v1、沒有新欄位）也能補算顯示。
 */
export function describeCultivationChange(change: CultivationChange) {
  const target = getCard(change.targetCardId)!, material = getCard(change.materialCardId)!;
  const before = exactBonus(change.beforeBonus), after = exactBonus(change.afterBonus), added = exactBonus(change.addedBonus);
  const orbBase = BigInt(target.stats.attack), battleBase = battleBaseAttack(target.id);
  const fedBefore = change.fedBefore, fedAfter = change.fedAfter;
  return {
    ...change,
    rule: change.rule ?? 'v1',
    layer: material.form === 'YOUNG' ? 'YOUNG_TO_ADULT' as const : 'ADULT_TO_GUARDIAN' as const,
    materialName: material.name, targetName: target.name, materialForm: material.form, targetForm: target.form,
    targetBaseAttack: String(target.stats.attack),
    addedPercent: percentOf(added, target.stats.attack), totalPercentBefore: percentOf(before, target.stats.attack), totalPercentAfter: percentOf(after, target.stats.attack),
    beforeOrbAttack: (orbBase + before).toString(), afterOrbAttack: (orbBase + after).toString(),
    beforeBattleAttack: (battleBase + before).toString(), afterBattleAttack: (battleBase + after).toString(),
    starsBefore: fedBefore === undefined ? null : stars(target.form, fedBefore),
    starsAfter: fedAfter === undefined ? null : stars(target.form, fedAfter),
    consumed: true as const,
  };
}
export type CultivationFeedback = ReturnType<typeof describeCultivationChange>;

/** Both game-specific original attack bases are preserved; the owned-copy bonus is shared. */
export function cultivationView(snapshot: CultivationSnapshot) {
  const protection = cultivationProtection(snapshot.state);
  const fedOf = fedCounter(snapshot), v2 = activeFoodChainRule() === 'v2';
  const seen=new Map<string,number>();
  const totals=new Map<string,number>();
  for(const copy of snapshot.state.cards)totals.set(copy.cardId,(totals.get(copy.cardId)??0)+1);
  const cards = snapshot.state.cards.map(copy => {
    const card = getCard(copy.cardId)!;
    const bonus = exactBonus(copy.bonus);
    const fed = fedOf(copy.id), cap = attackBonusCap(card.stats.attack);
    const target = cultivationTarget(copy.cardId);
    const copyNumber=(seen.get(copy.cardId)??0)+1;seen.set(copy.cardId,copyNumber);
    return { id: copy.id, cardId: copy.cardId, name: card.name, form: card.form, copyLabel:`同款第 ${copyNumber} 張／共 ${totals.get(copy.cardId)} 張`,
      protected: protection.protectedIds.includes(copy.id), strongestProtected: protection.strongestIds.includes(copy.id), manuallyProtected: snapshot.state.protectedIds.includes(copy.id), materialTargetCardId: target,
      materialTargetName: target ? getCard(target)?.name ?? null : null,
      // 這張卡能吃哪些材料（後端算好的說明，沒有材料可吃時前端照印）：幼子只餵同星宿成獸，成獸只餵所屬四象。
      acceptsMaterialsText: card.form === 'YOUNG' ? null : `只有${feederNames(card.id)}可以吃`,
      bonus: bonus.toString(), orbAttack: (BigInt(card.stats.attack) + bonus).toString(),
      battleAttack: (battleBaseAttack(card.id) + bonus).toString(),
      // 食物鏈顯示欄位（只讀；伺服端算好）。
      bonusPercent: percentOf(bonus, card.stats.attack).label,
      ...(v2 && card.form !== 'YOUNG' ? { bonusCap: cap.toString(), atBonusCap: bonus >= cap, stars: stars(card.form, fed) } : {}),
      fed };
  });
  return { revision: snapshot.revision, cards, collectionCards: cards.map(c=>({id:c.id,cardId:c.cardId,source:'DUEL_WIN' as const,at:''})), protectedIds: snapshot.state.protectedIds,
    strongestProtectedIds: protection.strongestIds, protectionReason: protection.reason, protectionTieBreak: protection.tieBreak,
    pendingBattle: snapshot.pendingBattle,
    foodChainRule: v2 ? 'v2' as const : 'v1' as const,
    shards:snapshot.shards,starterPack:snapshot.starterPack,
    granted:(snapshot.creditedIds??[]).filter(id=>id.startsWith('copy:growth:')).map(id=>id.slice('copy:growth:'.length)),
    canProtectFive: new Set(cards.map(c => c.cardId)).size >= 5,
    reason: snapshot.pendingBattle ? '戰鬥尚未結算，暫不能合體或更換主力。' : snapshot.state.protectedIds.length !== 5 ? '請先親選並鎖定五隻不同卡型的收藏主力。' : null };
}

/** The UI prints these exact server values; it never recomputes attack gains. */
export function cultivationChangeView(change: CultivationChange) {
  const target=getCard(change.targetCardId)!,material=getCard(change.materialCardId)!;
  const before=exactBonus(change.beforeBonus),after=exactBonus(change.afterBonus);
  const orbBase=BigInt(target.stats.attack),battleBase=BigInt(newMatch([target.id],[target.id],0).player.team[0].attack);
  return {...change,targetName:target.name,materialName:material.name,materialCount:1,
    materialBaseAttack:String(material.stats.attack),orbBeforeAttack:String(orbBase+before),orbAfterAttack:String(orbBase+after),
    battleBeforeAttack:String(battleBase+before),battleAfterAttack:String(battleBase+after)};
}
