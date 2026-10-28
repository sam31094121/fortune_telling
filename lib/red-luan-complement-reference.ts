import registry from '../docs/技能戰鬥檔案/鬼魅阿修羅/權威來源/紅鸞-主星互補參考.json';

/** Match the author's complete natal combination, not an invented dominant star. */
export function buildComplementReference(lifeStars: string[], context?: {
  confirmedEmptyLifePalace: boolean;
  spouseStars: string[];
  migrationStars?: string[];
  lifeEarthlyBranch?: string;
  spouseOppositeStars?: string[];
}) {
  const actualNames = [...new Set(lifeStars)];
  const useMigration = actualNames.length === 0 && context?.confirmedEmptyLifePalace === true;
  const names = useMigration ? [...new Set(context.migrationStars ?? [])] : actualNames;
  // Empty natal palace borrows the complete opposite-palace set, never spouse stars.
  if (useMigration && (names.length < 1 || names.length > 2)) return null;
  const rule = registry.rules.find((entry) => entry.lifeStarSets.some((set) =>
    set.length === names.length && set.every((name) => names.includes(name))));
  if (!rule) return null;
  if ('requiredLifeBranches' in rule) {
    const spouseNames = [...new Set(context?.spouseStars ?? [])];
    if (useMigration || !rule.requiredLifeBranches?.includes(context?.lifeEarthlyBranch ?? '') ||
        rule.requiredSpouseStars?.length !== spouseNames.length ||
        !rule.requiredSpouseStars?.every((name) => spouseNames.includes(name))) return null;
    if ('requiredSpouseOppositeStars' in rule) {
      const opposite = [...new Set(context?.spouseOppositeStars ?? [])];
      if (rule.requiredSpouseOppositeStars?.length !== opposite.length ||
          !rule.requiredSpouseOppositeStars?.every((name) => opposite.includes(name))) return null;
    }
  }
  return {
    ruleId: rule.id, version: registry.version, sourceStatus: registry.sourceStatus,
    title: rule.title, quote: rule.quote, statusLabel: rule.statusLabel,
    scopeLabel: rule.scopeLabel, matchedStars: names,
    actualLifeStars: actualNames,
    basis: useMigration ? 'EMPTY_LIFE_MIGRATION_REFERENCE' as const : 'LIFE_PALACE' as const,
    basisLabel: useMigration ? registry.emptyLifeMethod.basisLabel : '本次命宮主星',
    methodSourceUrl: useMigration ? registry.emptyLifeMethod.sourceUrl : 'methodSourceUrl' in rule ? rule.methodSourceUrl : null,
    referenceStars: rule.referenceStars.filter((name) => !names.includes(name)), sourceTitle: rule.sourceTitle ?? registry.sourceTitle,
    sourceUrl: rule.sourceUrl ?? registry.sourceUrl,
    sourceScope: useMigration ? registry.emptyLifeMethod.sourceScope : rule.sourceScope ?? registry.scope,
    quoteLocation: rule.quoteLocation,
  };
}
