import 'server-only';
import { exactBonus, cultivationTarget } from './cultivation';
import type { CultivationSnapshot } from './cultivation-transaction';
import { getCard } from './registry';
import { newMatch } from './interactive';

/** Both game-specific original attack bases are preserved; the owned-copy bonus is shared. */
export function cultivationView(snapshot: CultivationSnapshot) {
  const cards = snapshot.state.cards.map(copy => {
    const card = getCard(copy.cardId)!;
    const bonus = exactBonus(copy.bonus);
    return { id: copy.id, cardId: copy.cardId, name: card.name, form: card.form,
      protected: snapshot.state.protectedIds.includes(copy.id), materialTargetCardId: cultivationTarget(copy.cardId),
      bonus: bonus.toString(), orbAttack: (BigInt(card.stats.attack) + bonus).toString(),
      battleAttack: (BigInt(newMatch([card.id], [card.id], 0).player.team[0].attack) + bonus).toString() };
  });
  return { revision: snapshot.revision, cards, collectionCards: cards.map(c=>({id:c.id,cardId:c.cardId,source:'DUEL_WIN' as const,at:''})), protectedIds: snapshot.state.protectedIds,
    pendingBattle: snapshot.pendingBattle,
    canProtectFive: new Set(cards.map(c => c.cardId)).size >= 5,
    reason: snapshot.pendingBattle ? '戰鬥尚未結算，暫不能合體或更換主力。' : snapshot.state.protectedIds.length !== 5 ? '請先親選並鎖定五隻不同卡型的收藏主力。' : null };
}
