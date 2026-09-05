'use client';

// 羈絆解鎖與決鬥贏來的卡共用同一份收藏；不可每次重算羈絆就補回已輸掉的卡。
import { countByCard, readCollection } from './beast-collection';
export { MODULE_CARD_IDS, WEEKLY_CARD_ID_POOL, BOND_STEPS_PER_CARD, gameCardIdsForMansion } from './beast-growth-rewards';

export interface OwnedCards {
  all: string[];
  fromBond: string[];
  fromDuel: string[];
  counts: Map<string, number>;
  storageError?: string;
}

export function readOwnedCards(): OwnedCards {
  const collection = readCollection();
  const counts = countByCard(collection);
  return {
    all: [...counts.keys()],
    fromBond: collection.cards.filter((entry) => entry.source === 'GROWTH').map((entry) => entry.cardId),
    fromDuel: collection.cards.filter((entry) => entry.source === 'DUEL_WIN').map((entry) => entry.cardId),
    counts,
    storageError: collection.storageError,
  };
}

export const NO_OWNED_CARDS_GUIDE = {
  headline: '先領一張自己的神獸卡',
  body: '完成首頁探索，或累計完成四次每日任務，收下一組本體與幼子。',
  action: '去成長中心領卡',
  href: '/growth-center#beast-rewards',
} as const;
