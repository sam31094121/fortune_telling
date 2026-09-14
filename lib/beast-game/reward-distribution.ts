import {getCard, playableCards} from './registry';
import type {BeastCard, CardForm, Rarity} from './schema';

const rarityOrder: Rarity[] = ['N', 'R', 'SR', 'SSR', 'UR'];
const formOrder: CardForm[] = ['YOUNG', 'ADULT', 'GUARDIAN'];

function distance<T>(order: T[], left: T, right: T): number {
  return Math.abs(order.indexOf(left) - order.indexOf(right));
}

function rewardWeight(card: BeastCard, anchor: BeastCard): number {
  const rarityDistance = distance(rarityOrder, card.rarity, anchor.rarity);
  const formDistance = distance(formOrder, card.form, anchor.form);
  return 100 - rarityDistance * 18 - formDistance * 12;
}

/**
 * Build a deterministic reward stream from the legal card registry.
 * The first card is always the opponent's staked card; later cards rotate
 * through nearby rarity and form bands instead of cloning one card 100 times.
 */
export function distributeRewardCards(anchorId: string, count: number): string[] {
  const anchor = getCard(anchorId);
  if (!anchor || count <= 0) return [];
  const pool = playableCards()
    .slice()
    .sort((left, right) => rewardWeight(right, anchor) - rewardWeight(left, anchor) || left.id.localeCompare(right.id));
  const result = [anchor.id];
  for (let index = 1; index < count; index += 1) {
    result.push(pool[(index - 1) % pool.length].id);
  }
  return result;
}