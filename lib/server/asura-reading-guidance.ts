import type { AsuraDisplayColumn, AsuraDisplaySection } from '../ghost-asura-display-contract';

/** Navigation from existing backend output; no new age or fortune calculation. */
export function buildReadingGuidance(columns: AsuraDisplayColumn[], referencedIds: string[], includeCurrentStage: boolean): NonNullable<AsuraDisplaySection['guidance']> {
  const ids = new Set(referencedIds);
  const current = includeCurrentStage ? columns.find(column => column.life?.tenseLabel === '現在') : undefined;
  return {
    ...(current ? { stage: { key: current.key, ageText: current.life!.ageText, seals: current.seals.map(({ id, name }) => ({ id, name })) } } : {}),
    related: columns.flatMap(column => column.seals.filter(seal => ids.has(seal.id)).map(seal => ({ columnKey: column.key, ageText: column.life?.ageText ?? column.heading, id: seal.id, name: seal.name }))),
  };
}
