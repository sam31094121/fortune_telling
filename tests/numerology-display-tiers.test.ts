import { getNumerologyDisplayTier, NUMEROLOGY_ENERGY_LINE_STEPS } from '../lib/numerology-display-tiers';

const expectedLineLabels = ['大吉', '大吉帶吉', '吉', '半吉', '凶帶吉', '凶', '大凶帶凶', '大凶'];

if (NUMEROLOGY_ENERGY_LINE_STEPS.map((tier) => tier.label).join('|') !== expectedLineLabels.join('|')) {
  throw new Error('numerology energy line must preserve all eight original visual positions');
}

for (const [score, label] of [[72, '大吉'], [66, '大吉帶吉'], [60, '吉'], [55, '吉'], [54, '凶'], [50, '凶'], [45, '凶'], [40, '大凶帶凶'], [0, '大凶']] as const) {
  if (getNumerologyDisplayTier(score).label !== label) {
    throw new Error(`score ${score} should display ${label}`);
  }
}

const activeLabels = new Set([44, 45, 50, 54, 55, 59, 60, 66, 72].map((score) => getNumerologyDisplayTier(score).label));
if (activeLabels.has('半吉') || activeLabels.has('凶帶吉')) {
  throw new Error('intermediate visual positions must never be active result states');
}

console.log('numerology display-tier tests passed');
