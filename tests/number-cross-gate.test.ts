import { hasCompleteNumberCrossVerdict } from '../lib/number-cross-gate';
const cross = { version: 'number-cross-verdict-v1', score: 60, matrix: { score: 60, weight: 60, contribution: 36 }, iching: { score: 60, weight: 40, contribution: 24, signalSummary: 'ok' } };
const iching = { hexagram: { kingWen: 1 }, chainScore: 60, digitReadings: [], crossChain: [] };
if (!hasCompleteNumberCrossVerdict(cross, iching)) throw new Error('complete cross response must pass');
if (hasCompleteNumberCrossVerdict(undefined, iching)) throw new Error('missing cross verdict must fail');
if (hasCompleteNumberCrossVerdict(cross, undefined)) throw new Error('missing I Ching input must fail');
if (hasCompleteNumberCrossVerdict(cross, { chainScore: 60, digitReadings: [], crossChain: [] })) throw new Error('missing nested hexagram must fail');
if (hasCompleteNumberCrossVerdict({ ...cross, matrix: { ...cross.matrix, weight: 0 } }, iching)) throw new Error('invalid cross verdict must fail');
console.log('number cross-gate tests passed');
