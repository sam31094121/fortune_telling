/** Read-only combat information. Values come from the same profile and stats used by the match. */
import { interactiveCatalog, rageMaterialFor, rageUnavailableReason, RAGE_ATTACK_BONUS, type Match, type Side, type Fighter } from './interactive';
import { effectiveStat } from './effects';
import { ELEMENT_LABEL, ELEMENTS, ELEMENT_COUNTER, ELEMENT_GENERATES, WUXING_TO_ELEMENT, elementMultiplier, type BeastElement } from './elements';
import { guardianOf } from '../beast-guardians';
import { describeCardElement } from '../beast-element-guide';
import { weaponFor } from './weapons';
import { cardTactics } from './card-tactics';

const catalog = new Map(interactiveCatalog().map(card => [card.id, card]));
const FORM_LABEL = { YOUNG: '幼子', ADULT: '成獸', GUARDIAN: '四象' } as const;

export function combatGuideFor(cardId: string, fighter?: Fighter, context?: { match: Match; side: Side }) {
  const card = catalog.get(cardId);
  if (!card) return null;
  // A previously inspected reserve must never borrow the active fighter's values.
  const current = fighter?.cardId === cardId ? fighter : undefined;
  const element = current?.element ?? card.element;
  const wuxing = Object.entries(WUXING_TO_ELEMENT).find(([, value]) => value === element)?.[0] ?? '';
  const source = ELEMENTS.find(candidate => ELEMENT_GENERATES[candidate] === element)!;
  const active = context?.match[context.side].team[context.match[context.side].active];
  const isActive = active?.cardId === cardId;
  const partner = context && isActive ? rageMaterialFor(context.match, context.side) : null;
  return {
    id: card.id, name: card.name, thumbnail: card.thumbnail, front: card.front,
    system: '五元素回合制', form: FORM_LABEL[card.form], role: card.role,
    guardian: guardianOf(cardId)?.name ?? '四象神獸',
    element, elementLabel: ELEMENT_LABEL[element], wuxing,
    relation: describeCardElement(element),
    baseStats: card.stats,
    comparisonRange: Object.fromEntries((['hp', 'attack', 'defense', 'speed'] as const).map(stat => {
      const values = [...catalog.values()].map(item => item.stats[stat]);
      return [stat, { min: Math.min(...values), max: Math.max(...values) }];
    })) as Record<'hp' | 'attack' | 'defense' | 'speed', { min: number; max: number }>,
    generating: { source, sourceLabel: ELEMENT_LABEL[source], target: ELEMENT_GENERATES[element], targetLabel: ELEMENT_LABEL[ELEMENT_GENERATES[element]],
      bonus: RAGE_ATTACK_BONUS, partner: partner?.name ?? null,
      reason: context ? isActive ? rageUnavailableReason(context.match, context.side) : '這張是後備，換上主戰後再判定' : null,
      hasContext: Boolean(context),
    },
    stats: {
      hp: current?.hp ?? card.stats.hp,
      maxHp: current?.maxHp ?? card.stats.hp,
      attack: current ? effectiveStat(current, 'attack') : card.stats.attack,
      defense: current ? effectiveStat(current, 'defense') : card.stats.defense,
      speed: current ? effectiveStat(current, 'speed') : card.stats.speed,
      shield: current?.shield ?? 0,
    },
    modifiers: current?.modifiers.map(modifier => ({ ...modifier })) ?? [],
    skill: { name: card.skillName, description: card.description, cost: card.cost, cooldown: current?.cooldown ?? 0 },
    passive: card.passive,
    tactics: cardTactics(card.id),
    weapon: weaponFor(card.id, card.name, element),
  };
}

/** Every cell calls the combat engine's element lookup; no second matchup table. */
export function elementGuideRows() {
  return ELEMENTS.map(element => ({
    element, label: ELEMENT_LABEL[element], beats: ELEMENT_LABEL[ELEMENT_COUNTER[element]],
    cells: ELEMENTS.map(defender => ({ defender, multiplier: elementMultiplier(element, defender) })),
  }));
}

export function elementPercent(attacker: BeastElement, defender: BeastElement) {
  return `${Math.round(elementMultiplier(attacker, defender) * 100)}%`;
}
