import type { CollectionReceipt, StakeOutcome } from './beast-collection-ledger';

export type NamedStakeOutcome = Pick<StakeOutcome, 'verdict'> & Partial<StakeOutcome> & {
  playerStakeName: string; opponentStakeName: string;
  gainedCardName: string | null; forfeitedCardName: string | null;
};

/** Read committed receipts; older receipts retain their original one-card / multi-card contract. */
export function stakeReceiptSummary(outcome: NamedStakeOutcome, receipt: CollectionReceipt) {
  const staked = receipt.stakedCount ?? outcome.selectedEntries?.length ?? 1;
  const gained = receipt.gainedCount ?? (receipt.verdict === 'WON' ? 1 : 0);
  const lost = receipt.lostCount ?? (receipt.verdict === 'LOST' ? (receipt.forfeitedEntryIds?.length || 1) : 0);
  const before = receipt.beforeTotal ?? receipt.total - gained + lost;
  return { staked, gained, lost, retained: staked - lost, before, total: receipt.total };
}

export function namedStakeOutcome(outcome: StakeOutcome, name: (id: string) => string): NamedStakeOutcome {
  return { ...outcome, playerStakeName: name(outcome.stakes.player), opponentStakeName: name(outcome.stakes.opponent),
    gainedCardName: outcome.gainedCardId ? name(outcome.gainedCardId) : null,
    forfeitedCardName: outcome.forfeitedCardId ? name(outcome.forfeitedCardId) : null };
}
