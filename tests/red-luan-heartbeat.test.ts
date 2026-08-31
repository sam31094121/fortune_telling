import assert from 'node:assert/strict';
import {
  annualBranchOf,
  buildBaziLovePersonSignal,
  buildSingleRedLuanHeartbeat,
  buildZiweiLovePersonSignal,
  redLuanBranchOf,
  tianXiBranchOf,
} from '../lib/red-luan-heartbeat-engine';

const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
const redLuan = ['卯', '寅', '丑', '子', '亥', '戌', '酉', '申', '未', '午', '巳', '辰'];
const tianXi = ['酉', '申', '未', '午', '巳', '辰', '卯', '寅', '丑', '子', '亥', '戌'];

for (let index = 0; index < branches.length; index += 1) {
  assert.equal(redLuanBranchOf(branches[index]), redLuan[index]);
  assert.equal(tianXiBranchOf(branches[index]), tianXi[index]);
}
assert.equal(annualBranchOf(2026), '午');
assert.equal(annualBranchOf(2027), '未');

const full = buildBaziLovePersonSignal({
  yearBranch: '子', dayBranch: '申', annualYear: 2026, hourKnown: true,
  presentBranches: [{ pillar: '年', branch: '子' }, { pillar: '月', branch: '卯' }, { pillar: '日', branch: '申' }, { pillar: '時', branch: '酉' }],
});
assert.equal(full.annualTriggers.length, 0);
assert.ok(full.natalEvidence.some((item) => item.label === '紅鸞' && item.targetBranch === '卯'));

const unknownHour = buildBaziLovePersonSignal({
  yearBranch: '巳', dayBranch: '午', annualYear: 2026, hourKnown: false,
  presentBranches: [{ pillar: '年', branch: '巳' }, { pillar: '月', branch: '子' }, { pillar: '日', branch: '午' }, { pillar: '時', branch: '酉' }],
});
assert.equal(unknownHour.annualTriggers[0]?.label, '桃花');
assert.equal(unknownHour.natalEvidence.some((item) => item.evidence.includes('時支')), false);
assert.ok(unknownHour.limitations.some((item) => item.includes('時柱不納入')));

const missingZiwei = buildZiweiLovePersonSignal({ birth: null });
assert.equal(missingZiwei.status, 'UNAVAILABLE_BIRTH_TIME_REQUIRED');
assert.equal(missingZiwei.annualStatus, 'UNAVAILABLE_RULE_SOURCE_REQUIRED');

const knownZiwei = buildZiweiLovePersonSignal({ birth: { calendarType: 'solar', date: '1990-05-12', gender: '男', timeIndex: 6 } });
assert.equal(knownZiwei.status, 'READY');
assert.equal(knownZiwei.annualStatus, 'UNAVAILABLE_RULE_SOURCE_REQUIRED');
assert.ok(knownZiwei.palaces?.some((palace) => palace.palace === '夫妻宮'));

const singleUnknownHour = buildSingleRedLuanHeartbeat({
  yearBranch: '巳',
  dayBranch: '午',
  annualYear: 2026,
  hourKnown: false,
  presentBranches: [
    { pillar: '年', branch: '巳' },
    { pillar: '月', branch: '子' },
    { pillar: '日', branch: '午' },
    { pillar: '時', branch: '酉' },
  ],
  ziweiBirth: null,
});
assert.equal(singleUnknownHour.ziwei.status, 'UNAVAILABLE_BIRTH_TIME_REQUIRED');
assert.equal(singleUnknownHour.crossCheck.status, 'PARTIAL');
assert.ok(singleUnknownHour.iching.limitation.includes('不生成卦象'));

console.log('Red Luan heartbeat rules passed');
