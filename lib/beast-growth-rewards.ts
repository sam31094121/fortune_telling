import starBeastsData from '@/data/star-beasts.json';

export const MODULE_CARD_IDS: Record<string, number> = {
  number: 1, ziwei: 2, bazi: 3, nameology: 4, zodiac: 5, soul_match: 6, music: 7, tarot: 8,
};
export const WEEKLY_CARD_ID_POOL = starBeastsData.items.map((beast) => beast.id)
  .filter((id) => !Object.values(MODULE_CARD_IDS).includes(id));
export const BOND_STEPS_PER_CARD = 4;

export function deriveUnlockedMansions(modules: unknown, checkIns: unknown): number[] {
  const moduleCards = (Array.isArray(modules) ? modules : [])
    .filter((id): id is string => typeof id === 'string' && Object.hasOwn(MODULE_CARD_IDS, id))
    .map((id) => MODULE_CARD_IDS[id]);
  const completed = checkIns && typeof checkIns === 'object' && !Array.isArray(checkIns)
    ? Object.values(checkIns).filter((at) => typeof at === 'string' && Number.isFinite(Date.parse(at))).length : 0;
  return [...new Set([...moduleCards, ...WEEKLY_CARD_ID_POOL.slice(0, Math.floor(completed / BOND_STEPS_PER_CARD))])].sort((a, b) => a - b);
}

export function gameCardIdsForMansion(id: number): string[] {
  const n = String(id).padStart(2, '0');
  return [`beast_a${n}`, `beast_y${n}`];
}
