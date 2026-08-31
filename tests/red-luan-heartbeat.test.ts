import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  annualBranchOf,
  buildBaziLovePersonSignal,
  buildSingleRedLuanAnnualRhythm,
  buildSingleRedLuanHeartbeat,
  buildZiweiLovePersonSignal,
  RED_LUAN_CURRENT_EXPECTATIONS,
  RED_LUAN_FAMILY_RESPONSIBILITIES,
  RED_LUAN_RELATIONSHIP_STATUSES,
  redLuanBranchOf,
  tianXiBranchOf,
  validateRedLuanSelfReportedContext,
} from '../lib/red-luan-heartbeat-engine';
import { buildRedLuanAiEvidencePayload, inspectRedLuanAiGate } from '../lib/red-luan-cultural-reading';

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
assert.equal(singleUnknownHour.monthlyRhythm.status, 'UNAVAILABLE_RULE_SOURCE_REQUIRED');
assert.equal(singleUnknownHour.monthlyRhythm.precision, 'YEAR_ONLY');

const detailed2026 = buildSingleRedLuanAnnualRhythm({
  yearBranch: '子',
  dayBranch: '子',
  dayMasterStem: '辛',
  presentBranches: [{ pillar: '年', branch: '子' }, { pillar: '月', branch: '卯' }, { pillar: '日', branch: '子' }],
  hourKnown: false,
  fromYear: 2026,
  toYear: 2026,
})[0];
assert.equal(detailed2026.annualBranch, '午');
assert.ok(detailed2026.evidence.some((item) => item.id === 'tianyi' && item.evidenceBranches.join('') === '辛午'));
assert.ok(detailed2026.evidence.some((item) => item.id === 'day_branch_clash' && item.evidenceBranches.join('') === '子午'));
assert.ok(detailed2026.evidence.every((item) => item.ruleId && item.ruleVersion && item.source && item.precision === 'ANNUAL_BRANCH'));

const combine2026 = buildSingleRedLuanAnnualRhythm({
  yearBranch: '子',
  dayBranch: '未',
  presentBranches: [{ pillar: '年', branch: '子' }, { pillar: '月', branch: '辰' }, { pillar: '日', branch: '未' }],
  hourKnown: false,
  fromYear: 2026,
  toYear: 2026,
})[0];
assert.ok(combine2026.evidence.some((item) => item.id === 'day_branch_combine' && item.evidenceBranches.join('') === '未午'));

const oneYearResult = buildSingleRedLuanHeartbeat({
  yearBranch: '子',
  dayBranch: '子',
  dayMasterStem: '辛',
  annualYear: 2026,
  hourKnown: false,
  presentBranches: [{ pillar: '年', branch: '子' }, { pillar: '月', branch: '卯' }, { pillar: '日', branch: '子' }],
  ziweiBirth: null,
  timelineYears: 1,
  validation: {
    primaryEngine: 'TraditionalBaziCore',
    primaryEngineVersion: 'test',
    primaryRuleSet: 'TW_TRADITIONAL_BAZI_V1',
    primaryStatus: 'PASSED',
    qualityGateStatus: 'PASSED',
    independentReference: 'PASSED',
    goldenCases: 'PASSED',
    totalCompared: 3,
    matchedCount: 3,
    differences: [],
    verifiedScope: ['測試規則'],
    unverifiedScope: [],
  },
});
assert.equal(inspectRedLuanAiGate(oneYearResult).status, 'PASSED');
const selfReportedContextA = {
  relationshipStatus: RED_LUAN_RELATIONSHIP_STATUSES[0],
  familyResponsibility: RED_LUAN_FAMILY_RESPONSIBILITIES[0],
  currentExpectation: RED_LUAN_CURRENT_EXPECTATIONS[0],
};
const selfReportedContextB = {
  relationshipStatus: RED_LUAN_RELATIONSHIP_STATUSES[4],
  familyResponsibility: RED_LUAN_FAMILY_RESPONSIBILITIES[2],
  currentExpectation: RED_LUAN_CURRENT_EXPECTATIONS[3],
};
assert.equal(validateRedLuanSelfReportedContext(selfReportedContextA), null);
assert.equal(validateRedLuanSelfReportedContext(selfReportedContextB), null);
assert.match(validateRedLuanSelfReportedContext({ ...selfReportedContextA, relationshipStatus: 'UNKNOWN' }) ?? '', /關係現況/);
assert.match(validateRedLuanSelfReportedContext({ ...selfReportedContextA, familyResponsibility: 'UNKNOWN' }) ?? '', /家庭責任/);
assert.match(validateRedLuanSelfReportedContext({ ...selfReportedContextA, currentExpectation: 'UNKNOWN' }) ?? '', /期待/);

const deterministicBeforeContextValidation = structuredClone(oneYearResult);
validateRedLuanSelfReportedContext(selfReportedContextA);
validateRedLuanSelfReportedContext(selfReportedContextB);
assert.deepEqual(oneYearResult, deterministicBeforeContextValidation, '自述現況驗證不得改寫命盤或年度規則結果');

const aiEvidencePayload = buildRedLuanAiEvidencePayload(oneYearResult);
const serializedAiPayload = JSON.stringify(aiEvidencePayload);
for (const privateField of ['relationshipStatus', 'familyResponsibility', 'currentExpectation', ...Object.values(selfReportedContextA), ...Object.values(selfReportedContextB)]) {
  assert.equal(serializedAiPayload.includes(privateField), false, `AI payload leaked self-reported context: ${privateField}`);
}
const incompleteEvidence = structuredClone(oneYearResult);
incompleteEvidence.annualRhythm[0].evidence[0].ruleId = '';
assert.equal(inspectRedLuanAiGate(incompleteEvidence).status, 'BLOCKED');

const currentProjectGate = structuredClone(oneYearResult);
currentProjectGate.validation.qualityGateStatus = 'NOT_TESTED';
currentProjectGate.validation.independentReference = 'NOT_TESTED_NO_INDEPENDENT_SOURCE';
currentProjectGate.validation.goldenCases = 'NOT_AVAILABLE';
assert.equal(inspectRedLuanAiGate(currentProjectGate).status, 'BLOCKED');
assert.ok(inspectRedLuanAiGate(currentProjectGate).reasons.some((item) => item.includes('獨立第二來源')));

const noEvidenceResult = buildSingleRedLuanHeartbeat({
  yearBranch: '亥',
  dayBranch: '寅',
  annualYear: 2026,
  hourKnown: false,
  presentBranches: [{ pillar: '年', branch: '亥' }, { pillar: '月', branch: '辰' }, { pillar: '日', branch: '寅' }],
  ziweiBirth: null,
  timelineYears: 1,
});
assert.equal(noEvidenceResult.annualRhythm[0].evidence.length, 0);
assert.equal(inspectRedLuanAiGate(noEvidenceResult).status, 'BLOCKED');

assert.throws(() => buildSingleRedLuanAnnualRhythm({
  yearBranch: '子', dayBranch: '子', presentBranches: [], hourKnown: false, fromYear: 2027, toYear: 2026,
}), /INVALID_YEAR_RANGE/);

const pageSource = readFileSync(join(process.cwd(), 'app/red-luan-heartbeat/page.tsx'), 'utf8');
const routeSource = readFileSync(join(process.cwd(), 'app/api/red-luan-heartbeat/route.ts'), 'utf8');
assert.ok(pageSource.includes("import { UnifiedBirthForm, type BirthProfile } from '@/components/UnifiedBirthForm'"));
assert.ok(pageSource.includes('<UnifiedBirthForm'));
assert.equal(pageSource.includes('aria-label="出生年份"'), false);
for (const title of ['第一層・定盤', '第二層・見象', '第三層・問心', '第四層・易經引導']) {
  assert.ok(pageSource.includes(title), `missing onion layer: ${title}`);
}
assert.ok(pageSource.includes('useState(0)'));
assert.ok(pageSource.includes('openedLayer >= 1'));
assert.ok(pageSource.includes('openedLayer >= 2'));
assert.ok(pageSource.includes('openedLayer >= 3'));
assert.ok(pageSource.includes('aria-pressed={reflectionChoice === choice.id}'));
assert.ok(pageSource.includes('品質門控通過前不會傳給 AI'));
assert.ok(pageSource.includes('不是超自然權威'));
assert.ok(pageSource.includes('此刻的關係位置'));
for (const label of ['關係現況', '目前主要家庭責任', '期待方向', '未婚單身', '交往中', '已婚', '分居', '離異', '喪偶', '認識對象', '穩定交往', '婚姻規劃', '修復關係']) {
  assert.ok(pageSource.includes(label), `missing relationship context option: ${label}`);
}
assert.ok(pageSource.includes('不送入 AI'));
assert.ok(pageSource.includes('不重複顯示關係或家庭身分'));
assert.ok(routeSource.includes('validateRedLuanSelfReportedContext'));
assert.ok(routeSource.includes("usage: 'REFLECTION_GUIDANCE_ONLY'"));
assert.ok(routeSource.includes('generateRedLuanCulturalReading(result)'));
assert.equal(routeSource.includes('generateRedLuanCulturalReading(result,'), false);
for (const simplified of ['资料', '时间', '验证', '规则', '关系', '显示', '开启', '选择', '说明', '预测']) {
  assert.equal(pageSource.includes(simplified), false, `customer copy contains simplified Chinese: ${simplified}`);
}

console.log('Red Luan heartbeat rules passed');
