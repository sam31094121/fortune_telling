/** A battlefield deck is built from twenty different cards in the sixty-card pool. */
export const BATTLEFIELD_DECK_SIZE = 20;

export function sanitizeDeckSelection(
  selectedIds: readonly string[],
  availableIds: readonly string[],
  size = BATTLEFIELD_DECK_SIZE,
): string[] {
  const available = new Set(availableIds);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const id of selectedIds) {
    if (!available.has(id) || seen.has(id) || unique.length >= size) continue;
    seen.add(id);
    unique.push(id);
  }
  return unique;
}

export function buildUniqueDeck(
  availableIds: readonly string[],
  rng: () => number,
  size = BATTLEFIELD_DECK_SIZE,
): string[] {
  const pool = [...new Set(availableIds)];
  const deck: string[] = [];
  while (deck.length < size && pool.length) {
    deck.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return deck;
}

export function isCompleteDeckSelection(
  selectedIds: readonly string[],
  availableIds: readonly string[],
  size = BATTLEFIELD_DECK_SIZE,
): boolean {
  return sanitizeDeckSelection(selectedIds, availableIds, size).length === size;
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice();
  for (let index = out.length - 1; index > 0; index -= 1) {
    const target = Math.floor(rng() * (index + 1));
    [out[index], out[target]] = [out[target], out[index]];
  }
  return out;
}

/**
 * Keep the last opening hand at the back of the deck. With at least ten cards,
 * the next five-card opening hand therefore cannot repeat the previous one.
 */
export function buildFreshOpeningDeck(
  deckIds: readonly string[],
  previousOpeningIds: readonly string[],
  rng: () => number,
): string[] {
  const previous = new Set(previousOpeningIds);
  const fresh = deckIds.filter(id => !previous.has(id));
  const recent = deckIds.filter(id => previous.has(id));
  return [...shuffled(fresh, rng), ...shuffled(recent, rng)];
}
