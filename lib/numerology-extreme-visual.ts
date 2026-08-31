export type NumerologyExtremeVisual = 'auspicious' | 'reflective' | null;

export function getNumerologyExtremeVisual(label: string): NumerologyExtremeVisual {
  if (label === '大吉') return 'auspicious';
  if (label === '大凶') return 'reflective';
  return null;
}

export function getNumerologyExtremeCopy(visual: NumerologyExtremeVisual) {
  if (visual === 'auspicious') return '極位提示：可把眼前可運用的條件，轉成一個清楚的小行動。';
  if (visual === 'reflective') return '極位提示：先收束步調、整理可調整的地方；這是文化反思，不是對未來的預告。';
  return null;
}
