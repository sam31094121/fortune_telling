import 'server-only';
import { exactBonus, cultivationTarget, type CultivationChange } from './cultivation';
import type { CultivationSnapshot } from './cultivation-transaction';
import { getCard } from './registry';
import { newMatch } from './interactive';

/** Both game-specific original attack bases are preserved; the owned-copy bonus is shared. */
export function cultivationView(snapshot: CultivationSnapshot) {
  const seen=new Map<string,number>();
  const totals=new Map<string,number>();
  for(const copy of snapshot.state.cards)totals.set(copy.cardId,(totals.get(copy.cardId)??0)+1);
  const cards = snapshot.state.cards.map(copy => {
    const card = getCard(copy.cardId)!;
    const bonus = exactBonus(copy.bonus);
    const copyNumber=(seen.get(copy.cardId)??0)+1;seen.set(copy.cardId,copyNumber);
    return { id: copy.id, cardId: copy.cardId, name: card.name, form: card.form, copyLabel:`同款第 ${copyNumber} 張／共 ${totals.get(copy.cardId)} 張`,
      protected: snapshot.state.protectedIds.includes(copy.id), materialTargetCardId: cultivationTarget(copy.cardId),
      bonus: bonus.toString(), orbAttack: (BigInt(card.stats.attack) + bonus).toString(),
      battleAttack: (BigInt(newMatch([card.id], [card.id], 0).player.team[0].attack) + bonus).toString() };
  });
  return { revision: snapshot.revision, cards, collectionCards: cards.map(c=>({id:c.id,cardId:c.cardId,source:'DUEL_WIN' as const,at:''})), protectedIds: snapshot.state.protectedIds,
    pendingBattle: snapshot.pendingBattle,
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
