/**
 * Presentation-only tiers for the numerology page.
 *
 * Scores, the eight original dimensions, and the two-axis grouping remain in
 * Number Core Engine. These tiers only determine the label shown to people.
 */
export const NUMEROLOGY_ENERGY_LINE_STEPS = [
  { min: 72, label: '大吉', feel: '萬事亨通，富貴繁榮。', psychology: '此分數區間可作為檢視目前節奏與資源安排的參考。', tone: 'bg-emerald-300', labelTone: 'text-emerald-100' },
  { min: 66, label: '大吉帶吉', feel: '青雲直上，多得貴人。', psychology: '此分數區間可作為檢視目前節奏與資源安排的參考。', tone: 'bg-emerald-300', labelTone: 'text-emerald-100' },
  { min: 60, label: '吉', feel: '平安順遂，衣食無憂。', psychology: '此分數區間可作為檢視目前節奏與資源安排的參考。', tone: 'bg-cyan-300', labelTone: 'text-cyan-100' },
  { min: 55, label: '半吉', feel: '吉凶參半，三分靠天七分靠人。', psychology: '此分數區間可作為檢視目前節奏與資源安排的參考。', tone: 'bg-cyan-300', labelTone: 'text-cyan-100' },
  { min: 50, label: '凶帶吉', feel: '先苦後甘，外美內苦。', psychology: '此分數區間可作為檢視目前節奏與資源安排的參考。', tone: 'bg-amber-300', labelTone: 'text-amber-100' },
  { min: 45, label: '凶', feel: '阻礙重重，力不從心。', psychology: '此分數區間可作為檢視目前節奏與資源安排的參考。', tone: 'bg-amber-300', labelTone: 'text-amber-100' },
  { min: 40, label: '大凶帶凶', feel: '波折不斷，易招是非。', psychology: '此分數區間可作為檢視目前節奏與資源安排的參考。', tone: 'bg-rose-300', labelTone: 'text-rose-100' },
  { min: 0, label: '大凶', feel: '萬事休止，前途坎坷。', psychology: '此分數區間可作為檢視目前節奏與資源安排的參考。', tone: 'bg-rose-300', labelTone: 'text-rose-100' },
] as const;

export type NumerologyDisplayTier = (typeof NUMEROLOGY_ENERGY_LINE_STEPS)[number];

export function getNumerologyDisplayTier(score: number): NumerologyDisplayTier {
  // Keep all eight visual positions. The two intermediate positions remain a
  // visible scale reference but are deliberately never active result states.
  if (score >= 72) return NUMEROLOGY_ENERGY_LINE_STEPS[0];
  if (score >= 66) return NUMEROLOGY_ENERGY_LINE_STEPS[1];
  if (score >= 55) return NUMEROLOGY_ENERGY_LINE_STEPS[2];
  if (score >= 45) return NUMEROLOGY_ENERGY_LINE_STEPS[5];
  if (score >= 40) return NUMEROLOGY_ENERGY_LINE_STEPS[6];
  return NUMEROLOGY_ENERGY_LINE_STEPS[7];
}
