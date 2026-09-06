/** Pure inventory ledger. Battle outcomes come from the game API; this only moves owned copies. */
export interface CollectionEntry {
  id: string;
  cardId: string;
  at: string;
  source: 'GROWTH' | 'DUEL_WIN';
}
export interface CollectionHistoryItem {
  at: string;
  kind: 'WON' | 'FORFEITED' | 'RETURNED';
  cardId: string | null;
  note: string;
  remaining?: number;
}
export interface StakeOutcome {
  verdict: 'WON' | 'LOST' | 'RETURNED';
  gainedCardId: string | null;
  forfeitedCardId: string | null;
  message: string;
  stakes: { player: string; opponent: string };
}
export interface CollectionReceipt {
  matchId: string;
  verdict: StakeOutcome['verdict'];
  cardId: string | null;
  remaining: number;
  total: number;
}
export interface BeastCollection {
  cards: CollectionEntry[];
  history: CollectionHistoryItem[];
  /** Growth grants stay claimed even after the actual copy is lost. */
  granted?: string[];
  receipts?: Record<string, CollectionReceipt>;
  pending?: { id: string; cardId: string; entryId: string; at: string } | null;
  storageError?: string;
  /** 完成使命後躺在獎項格子裡、還沒被領走的獎勵。 */
  rewards?: PendingReward[];
  /** 已經領過的獎勵 id。擋重複領，也擋重複發。 */
  claimedRewards?: string[];
  starterPack?: string;
}

export function isBeastCardId(value: unknown): value is string {
  return typeof value === 'string' && (/^beast_[ay](0[1-9]|1[0-9]|2[0-8])$/.test(value)
    || /^beast_g_(qinglong|zhuque|baihu|xuanwu)$/.test(value));
}

/** Keep old won copies; give each one a stable instance ID. Never infer past losses. */
export function migrateCollection(value: unknown): BeastCollection {
  if (!value || typeof value !== 'object') throw new Error('收藏資料無法讀取，請先保留資料。');
  const old = value as BeastCollection;
  if (!Array.isArray(old.cards) || !Array.isArray(old.history)) throw new Error('收藏格式無法讀取，暫不開放押注。');
  if (old.cards.some((card) => !isBeastCardId(card?.cardId))) throw new Error('收藏中有無法辨識的卡，暫不開放押注。');
  return {
    cards: old.cards.map((card, index) => ({ ...card, id: card.id || `legacy:${index}:${card.cardId}`, source: card.source === 'GROWTH' ? 'GROWTH' : 'DUEL_WIN' })),
    history: old.history.slice(0, 60),
    granted: Array.isArray(old.granted) ? old.granted : [],
    receipts: old.receipts && typeof old.receipts === 'object' ? old.receipts : {},
    pending: old.pending ?? null,
    starterPack: typeof old.starterPack === 'string' ? old.starterPack : undefined,
  };
}

export function grantGrowthCards(current: BeastCollection, cardIds: string[], at: string): BeastCollection {
  const granted = new Set(current.granted ?? []);
  const cards = [...current.cards];
  for (const cardId of new Set(cardIds)) {
    if (!isBeastCardId(cardId) || granted.has(cardId)) continue;
    granted.add(cardId);
    cards.push({ id: `growth:${cardId}`, cardId, at, source: 'GROWTH' });
  }
  return { ...current, cards, granted: [...granted] };
}

export function grantStarterPack(current: BeastCollection, receipt: string, at: string): BeastCollection {
  if (current.starterPack) return current;
  if (!receipt) throw new Error('獎勵收據不存在');
  const cards = Array.from({length:28}, (_, i) => ({id:`starter:${receipt}:${i+1}`,cardId:`beast_y${String(i+1).padStart(2,'0')}`,at,source:'GROWTH' as const}));
  return {...current,starterPack:receipt,cards:[...current.cards,...cards]};
}

export function reserveCard(current: BeastCollection, cardId: string, matchId: string, at: string, entryId?: string): BeastCollection {
  if (current.pending) throw new Error('上一場尚待結算，請先處理上一場。');
  if (current.receipts?.[matchId]) throw new Error('這一場已經結算。');
  const card = current.cards.find((entry) => entry.cardId === cardId && (!entryId || entry.id === entryId));
  if (!card) throw new Error('這張卡已不在你的成長收藏，請重新選擇。');
  return { ...current, pending: { id: matchId, cardId, entryId: card.id, at } };
}

export function settleCard(current: BeastCollection, matchId: string, outcome: StakeOutcome, at: string): {
  collection: BeastCollection; receipt: CollectionReceipt; duplicate: boolean;
} {
  const previous = current.receipts?.[matchId];
  if (previous) return { collection: current, receipt: previous, duplicate: true };
  const pending = current.pending;
  if (!pending || pending.id !== matchId || pending.cardId !== outcome.stakes?.player) throw new Error('押注紀錄不一致，暫停結算。');
  const index = current.cards.findIndex((card) => card.id === pending.entryId && card.cardId === pending.cardId);
  if (index < 0) throw new Error('押注卡不存在，沒有扣卡或發獎。');
  if (!isBeastCardId(outcome.stakes.opponent)
    || (outcome.verdict === 'WON' && (outcome.gainedCardId !== outcome.stakes.opponent || outcome.forfeitedCardId !== null))
    || (outcome.verdict === 'LOST' && (outcome.forfeitedCardId !== pending.cardId || outcome.gainedCardId !== null))
    || (outcome.verdict === 'RETURNED' && (outcome.gainedCardId !== null || outcome.forfeitedCardId !== null))
    || !['WON', 'LOST', 'RETURNED'].includes(outcome.verdict)) throw new Error('戰果資料不完整，暫停結算。');
  const cards = [...current.cards];
  if (outcome.verdict === 'WON') cards.unshift({ id: `duel:${matchId}`, cardId: outcome.gainedCardId!, at, source: 'DUEL_WIN' });
  if (outcome.verdict === 'LOST') cards.splice(index, 1);
  const cardId = outcome.gainedCardId ?? outcome.forfeitedCardId ?? pending.cardId;
  const receipt: CollectionReceipt = { matchId, verdict: outcome.verdict, cardId, remaining: cards.filter((card) => card.cardId === cardId).length, total: cards.length };
  const kind: CollectionHistoryItem['kind'] = outcome.verdict === 'WON' ? 'WON' : outcome.verdict === 'LOST' ? 'FORFEITED' : 'RETURNED';
  return {
    collection: { ...current, cards, pending: null, receipts: { ...current.receipts, [matchId]: receipt }, history: [{ at, kind, cardId, note: outcome.message, remaining: receipt.remaining }, ...current.history].slice(0, 60) },
    receipt, duplicate: false,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   待領取獎勵：完成使命 → 出現在獎項格子 → 客戶親手收下
   ──────────────────────────────────────────────────────────────────────── */

/**
 * 一份還沒被領走的獎勵。
 *
 * 業主定調：「只要完成任務，就送一張卡片當獎勵。只要有使命未完成的，
 * 去把它完成，就會有獎勵跑出來，會顯示在獎項的格子裡。
 * 客戶要去把它收集起來，才算是真正的收藏的過程，有儀式感。」
 *
 * 【為什麼不直接放進收藏】
 *
 * 原本 grantGrowthCards() 是完成就自動入袋。那樣效率最高，
 * 但客戶少了「我把它收下來」的那一下——**收藏的重量來自親手拿到**，
 * 不是來自數字變大。東西悄悄多一張，跟自己去領一張，是兩種感受。
 *
 * 所以中間多一個狀態：獎勵先躺在格子裡等你，領了才進收藏。
 */
export interface PendingReward {
  /** 這一份獎勵的識別。重複領取靠它擋。 */
  id: string;
  cardId: string;
  /** 為什麼給你——「完成八關探索」之類。格子上要說得出來。 */
  reason: string;
  at: string;
}

/**
 * 完成使命，把獎勵放進格子。
 *
 * **不進收藏**——只是出現在那裡等人來領。
 * 同一個 id 只會出現一次：任務重複回報不會變成兩份獎勵。
 */
export function offerReward(
  current: BeastCollection,
  reward: { id: string; cardId: string; reason: string },
  at: string,
): BeastCollection {
  if (!isBeastCardId(reward.cardId)) throw new Error('獎勵卡片不存在');
  if (!reward.id) throw new Error('獎勵需要識別碼，否則擋不住重複發放');
  const rewards = current.rewards ?? [];
  // 已經在格子裡，或已經領過了，都不再發一次。
  if (rewards.some((item) => item.id === reward.id)) return current;
  if ((current.claimedRewards ?? []).includes(reward.id)) return current;
  return { ...current, rewards: [...rewards, { ...reward, at }] };
}

/**
 * 領取獎勵：從格子移進收藏。
 *
 * 這一步是儀式的核心，所以它做的事很單純也很明確——
 * 格子裡少一份，收藏裡多一張，並記下這份獎勵已經領過。
 *
 * 領一份不存在的獎勵會丟例外，不是靜靜忽略：
 * 靜靜忽略會讓「我明明按了」變成無從查起。
 */
export function claimReward(
  current: BeastCollection,
  rewardId: string,
  at: string,
): { collection: BeastCollection; claimed: PendingReward } {
  const rewards = current.rewards ?? [];
  const reward = rewards.find((item) => item.id === rewardId);
  if (!reward) throw new Error('這份獎勵不在格子裡，可能已經領過了。');

  const claimedRewards = new Set(current.claimedRewards ?? []);
  claimedRewards.add(reward.id);

  return {
    collection: {
      ...current,
      rewards: rewards.filter((item) => item.id !== rewardId),
      claimedRewards: [...claimedRewards],
      cards: [
        ...current.cards,
        { id: `reward:${reward.id}`, cardId: reward.cardId, at, source: 'GROWTH' },
      ],
    },
    claimed: reward,
  };
}

/** 格子裡還有幾份沒領。畫面用它決定要不要提示。 */
export function unclaimedRewardCount(current: BeastCollection): number {
  return (current.rewards ?? []).length;
}
