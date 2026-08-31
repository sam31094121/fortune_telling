import { buildNumberCrossVerdict } from '../lib/number-cross-verdict';
import { getNumerologyDisplayTier } from '../lib/numerology-display-tiers';

const reading = (chainScore: number, elements: string[], upper: string, lower: string) => ({
  chainScore,
  digitReadings: elements.map((element, index) => ({ digit: String(index), element })),
  crossChain: [{ kind: '相生' }, { kind: '相剋' }],
  hexagram: { kingWen: 1, upper: { name: upper }, lower: { name: lower } },
}) as Parameters<typeof buildNumberCrossVerdict>[1];

const first = buildNumberCrossVerdict(58, reading(68, ['金', '水', '土'], '乾', '坎'));
const repeated = buildNumberCrossVerdict(58, reading(68, ['金', '水', '土'], '乾', '坎'));
const second = buildNumberCrossVerdict(58, reading(42, ['火'], '離', '乾'));

if (JSON.stringify(first) !== JSON.stringify(repeated)) throw new Error('cross verdict must be deterministic');
if (first.iching.score === second.iching.score && first.score === second.score) throw new Error('different inputs must expose different I Ching signals');
if (first.matrix.weight !== 60 || first.iching.weight !== 40) throw new Error('cross verdict weights must remain 60/40');
for (const score of [50, 54, 55, 59]) {
  const label = getNumerologyDisplayTier(score).label;
  if (label === '半吉' || label === '凶帶吉') throw new Error('intermediate line steps must never be result states');
}
console.log('number cross-verdict tests passed');
