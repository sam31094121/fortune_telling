import 'server-only';
import { createHash } from 'node:crypto';
import { migrateCollection } from '../beast-collection-ledger';
import { openCardCampaign } from './battle-session';
import { parseCampaign } from './match3/hard-campaign';
import { validateCultivationState, type CultivationCopy, type CultivationState } from './cultivation';

export interface MigratedCultivationCopy extends CultivationCopy {
  origin: { kind: 'COLLECTION' | 'ORB_REWARD'; legacyId: string };
}
export interface CultivationMigration {
  state: CultivationState & { cards: MigratedCultivationCopy[] };
  /** Inventory only. Trial entitlement and its existing profile remain untouched. */
  summary: { collectionCopies: number; orbRewardCopies: number; protectedCopies: 0 };
}
function stableId(kind: string, legacyId: string): string {
  return createHash('sha256').update(kind).update('\0').update(legacyId).digest('hex');
}

/** A one-time migration of actual saved copies, never the default free card pool. */
export function prepareCultivationMigration(collectionValue: unknown, savedOrbProfile: string | null): CultivationMigration {
  const collection = migrateCollection(collectionValue);
  if (collection.pending || collection.cardCampaign?.pendingToken) throw new Error('請先完成原戰鬥結算，再接通共同卡庫。');
  const campaign = collection.cardCampaign ? openCardCampaign(collection.cardCampaign.token) : null;
  if (collection.cardCampaign && (!campaign || campaign.pending || JSON.stringify(campaign.enhancements) !== JSON.stringify(collection.cardCampaign.fusionReceipts))) throw new Error('原培養憑證無法核對，原存檔未變更。');
  const cards: MigratedCultivationCopy[] = collection.cards.map(c => {
    const matching = campaign?.enhancements.filter(r => r.targetEntryId === c.id) ?? [];
    if (matching.some(r => r.targetCardId !== c.cardId) || campaign?.enhancements.some(r => r.materialEntryId === c.id)) throw new Error('原卡庫與培養扣料紀錄不一致。');
    const bonus = matching.reduce((total, r) => total + BigInt(r.attackBonus), 0n).toString();
    return { id: c.id, cardId: c.cardId, bonus, origin: { kind: 'COLLECTION', legacyId: c.id } };
  });
  let orbRewardCopies = 0;
  if (savedOrbProfile !== null) {
    const orb = parseCampaign(savedOrbProfile);
    // heroId and all unconsumed starter young cards are trial entitlements, not copies.
    for (const reward of orb.rewards) {
      cards.push({ id: stableId('orb-reward', reward.matchId), cardId: reward.cardId,
        bonus: String(orb.enhancements?.[reward.cardId] ?? 0), origin: { kind: 'ORB_REWARD', legacyId: reward.matchId } });
      orbRewardCopies++;
    }
  }
  const state = { cards, protectedIds: [] };
  validateCultivationState(state);
  return { state, summary: { collectionCopies: collection.cards.length, orbRewardCopies, protectedCopies: 0 } };
}
