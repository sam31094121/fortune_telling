import { getNumerologyExtremeCopy, getNumerologyExtremeVisual } from '../lib/numerology-extreme-visual';
if (getNumerologyExtremeVisual('大吉') !== 'auspicious') throw new Error('大吉 must enable auspicious visual');
if (getNumerologyExtremeVisual('大凶') !== 'reflective') throw new Error('大凶 must enable reflective visual');
if (getNumerologyExtremeVisual('大凶') !== 'reflective') throw new Error('retry action must be restricted to 大凶');
for (const label of ['大吉帶吉', '吉', '半吉', '凶帶吉', '凶', '大凶帶凶']) if (getNumerologyExtremeVisual(label) !== null) throw new Error(`${label} must not enable extreme visual`);
if (!getNumerologyExtremeCopy('reflective')?.includes('不是對未來的預告')) throw new Error('reflective copy must state its non-predictive boundary');
console.log('numerology extreme-visual tests passed');
