import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  annualBranchOf,
  buildBaziLovePersonSignal,
  buildRedLuanContextAlignment,
  buildSingleRedLuanAnnualRhythm,
  buildSingleRedLuanHeartbeat,
  buildZiweiLovePersonSignal,
  normalizeRedLuanSelfReportedContext,
  RED_LUAN_CONTEXT_UNSPECIFIED,
  RED_LUAN_CURRENT_EXPECTATIONS,
  RED_LUAN_FAMILY_RESPONSIBILITIES,
  RED_LUAN_RELATIONSHIP_STATUSES,
  redLuanBranchOf,
  tianXiBranchOf,
  validateRedLuanSelfReportedContext,
} from '../lib/red-luan-heartbeat-engine';
import { buildRedLuanAiEvidencePayload, inspectRedLuanAiGate } from '../lib/red-luan-cultural-reading';
import { RED_LUAN_ARCHIVE_COPY, RED_LUAN_PUBLIC_ARCHIVED } from '../lib/red-luan-public-access';

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

// Every context field is optional: blank, missing and UNSPECIFIED all validate.
assert.equal(validateRedLuanSelfReportedContext({}), null, '完全未填寫必須是合法輸入');
assert.equal(validateRedLuanSelfReportedContext(undefined), null);
assert.equal(validateRedLuanSelfReportedContext(null), null);
assert.equal(validateRedLuanSelfReportedContext({ relationshipStatus: '', familyResponsibility: '', currentExpectation: '' }), null);
assert.equal(validateRedLuanSelfReportedContext({ ...selfReportedContextA, familyResponsibility: '' }), null, '部分填寫必須是合法輸入');
assert.equal(validateRedLuanSelfReportedContext(RED_LUAN_CONTEXT_UNSPECIFIED), '關係位置資料格式無效。');

const normalizedBlank = normalizeRedLuanSelfReportedContext({ relationshipStatus: '', currentExpectation: 'UNKNOWN' });
assert.deepEqual(normalizedBlank, {
  relationshipStatus: RED_LUAN_CONTEXT_UNSPECIFIED,
  familyResponsibility: RED_LUAN_CONTEXT_UNSPECIFIED,
  currentExpectation: RED_LUAN_CONTEXT_UNSPECIFIED,
}, '空白、缺漏與不合法值一律收斂為 UNSPECIFIED');
assert.equal(normalizeRedLuanSelfReportedContext(selfReportedContextA).relationshipStatus, RED_LUAN_RELATIONSHIP_STATUSES[0]);

const deterministicBeforeContextValidation = structuredClone(oneYearResult);
const contextAlignmentA = buildRedLuanContextAlignment(selfReportedContextA, oneYearResult);
const contextAlignmentB = buildRedLuanContextAlignment(selfReportedContextB, oneYearResult);
assert.deepEqual(oneYearResult, deterministicBeforeContextValidation, '關係情境交叉運算不得改寫命盤或年度規則結果');
assert.equal(contextAlignmentA.mode, 'REFLECTION_GUIDANCE_ONLY');
assert.equal(contextAlignmentA.calculationOrder.stageOne.evidenceFrozenBeforeContext, true);
assert.equal(contextAlignmentA.calculationOrder.stageOne.ziweiStatus, 'UNAVAILABLE_BIRTH_TIME_REQUIRED');
assert.equal(contextAlignmentA.calculationOrder.stageTwo.status, 'COMPUTED');
assert.notEqual(contextAlignmentA.themeTitle, contextAlignmentB.themeTitle);
assert.notDeepEqual(contextAlignmentA.actionDirections, contextAlignmentB.actionDirections);

const relationshipVariant = buildRedLuanContextAlignment({ ...selfReportedContextA, relationshipStatus: RED_LUAN_RELATIONSHIP_STATUSES[1] }, oneYearResult);
const familyVariant = buildRedLuanContextAlignment({ ...selfReportedContextA, familyResponsibility: RED_LUAN_FAMILY_RESPONSIBILITIES[1] }, oneYearResult);
const expectationVariant = buildRedLuanContextAlignment({ ...selfReportedContextA, currentExpectation: RED_LUAN_CURRENT_EXPECTATIONS[1] }, oneYearResult);
assert.notEqual(contextAlignmentA.actionDirections[0].reflectionQuestion, relationshipVariant.actionDirections[0].reflectionQuestion);
assert.notEqual(contextAlignmentA.actionDirections[1].reflectionQuestion, familyVariant.actionDirections[1].reflectionQuestion);
assert.notEqual(contextAlignmentA.actionDirections[2].reflectionQuestion, expectationVariant.actionDirections[2].reflectionQuestion);
for (const direction of contextAlignmentA.actionDirections) {
  assert.ok(direction.symbolism && direction.reflectionQuestion && direction.action);
}

// Skipping every question must still produce a complete, usable alignment, and
// must not disturb the frozen chart evidence in any way.
const deterministicBeforeEmptyContext = structuredClone(oneYearResult);
const emptyContextAlignment = buildRedLuanContextAlignment({}, oneYearResult);
assert.deepEqual(oneYearResult, deterministicBeforeEmptyContext, '未填寫關係位置不得改寫命盤或年度規則結果');
assert.deepEqual(emptyContextAlignment.annualEvidence, contextAlignmentA.annualEvidence, '未填寫不得改變年度證據');
assert.equal(emptyContextAlignment.alignmentStatus, contextAlignmentA.alignmentStatus);
assert.equal(emptyContextAlignment.calculationOrder.stageOne.evidenceFrozenBeforeContext, true);
assert.equal(emptyContextAlignment.calculationOrder.stageTwo.status, 'COMPUTED');
assert.equal(emptyContextAlignment.contextCompleteness, 'NONE');
assert.deepEqual(emptyContextAlignment.calculationOrder.stageTwo.providedFields, []);
assert.deepEqual(emptyContextAlignment.calculationOrder.stageTwo.unspecifiedFields, ['relationshipStatus', 'familyResponsibility', 'currentExpectation']);
assert.deepEqual(emptyContextAlignment.relationshipPosition, {
  relationshipStatus: RED_LUAN_CONTEXT_UNSPECIFIED,
  familyResponsibility: RED_LUAN_CONTEXT_UNSPECIFIED,
  currentExpectation: RED_LUAN_CONTEXT_UNSPECIFIED,
});
assert.equal(emptyContextAlignment.actionDirections.length, 3, '未填寫仍要給滿三個中性方向');
for (const direction of emptyContextAlignment.actionDirections) {
  assert.ok(direction.symbolism && direction.reflectionQuestion && direction.action);
}
assert.ok(emptyContextAlignment.guidancePrompt.length > 0);
assert.ok(emptyContextAlignment.themeTitle.length > 0);
assert.ok(emptyContextAlignment.limitations.some((line) => line.includes('中性引導')), '未填寫時必須明說採用中性引導');

const partialContextAlignment = buildRedLuanContextAlignment({ currentExpectation: RED_LUAN_CURRENT_EXPECTATIONS[0] }, oneYearResult);
assert.equal(partialContextAlignment.contextCompleteness, 'PARTIAL');
assert.deepEqual(partialContextAlignment.calculationOrder.stageTwo.providedFields, ['currentExpectation']);
assert.equal(partialContextAlignment.contextCompleteness !== contextAlignmentA.contextCompleteness, true);
assert.equal(contextAlignmentA.contextCompleteness, 'COMPLETE');
// Answering a question must actually change that dimension's guidance.
assert.notEqual(partialContextAlignment.actionDirections[2].reflectionQuestion, emptyContextAlignment.actionDirections[2].reflectionQuestion);
assert.equal(partialContextAlignment.actionDirections[0].reflectionQuestion, emptyContextAlignment.actionDirections[0].reflectionQuestion, '未答的維度必須維持中性引導');

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
assert.equal(buildRedLuanContextAlignment(selfReportedContextA, noEvidenceResult).alignmentStatus, 'NO_VERIFIED_YEARLY_RULE_HIT');

assert.throws(() => buildSingleRedLuanAnnualRhythm({
  yearBranch: '子', dayBranch: '子', presentBranches: [], hourKnown: false, fromYear: 2027, toYear: 2026,
}), /INVALID_YEAR_RANGE/);

const pageSource = readFileSync(join(process.cwd(), 'app/red-luan-heartbeat/page.tsx'), 'utf8');
const routeSource = readFileSync(join(process.cwd(), 'app/api/red-luan-heartbeat/route.ts'), 'utf8');
const homeSource = readFileSync(join(process.cwd(), 'app/page.tsx'), 'utf8');
assert.equal(RED_LUAN_PUBLIC_ARCHIVED, false);
assert.equal(RED_LUAN_ARCHIVE_COPY.message, '正在優化・強化中');
assert.ok(homeSource.includes('RED_LUAN_PUBLIC_ARCHIVED ?'));
assert.ok(homeSource.includes('aria-disabled="true"'));
assert.ok(homeSource.includes('RED_LUAN_ARCHIVE_COPY.message'));
assert.ok(pageSource.includes('role="status" aria-live="polite"'));
assert.ok(pageSource.includes('return RED_LUAN_PUBLIC_ARCHIVED ? <RedLuanArchivedPage /> : <RedLuanHeartbeatExperience />'));
assert.ok(pageSource.includes('返回首頁'));
assert.ok(routeSource.indexOf('if (RED_LUAN_PUBLIC_ARCHIVED)') < routeSource.indexOf('request.json()'));
assert.ok(routeSource.includes("'RED_LUAN_ARCHIVED'"));
assert.ok(pageSource.includes("timeUnknown || !profile.birthHourBranch ? 'birthHourBranch'"));
assert.ok(routeSource.includes("'BIRTH_TIME_REQUIRED_FOR_BAZI_ZIWEI_CROSS_CHECK'"));
assert.ok(routeSource.includes("result.ziwei.status !== 'READY'"));
assert.ok(routeSource.indexOf("result.ziwei.status !== 'READY'") < routeSource.indexOf('generateRedLuanCulturalReading(result)'));
assert.ok(pageSource.includes("import { UnifiedBirthForm, type BirthProfile } from '@/components/UnifiedBirthForm'"));
assert.ok(pageSource.includes('<UnifiedBirthForm'));
assert.equal(pageSource.includes('aria-label="出生年份"'), false);
assert.ok(pageSource.includes(".mega-friendly-form > button[type='submit']"));
assert.ok(pageSource.includes('.mega-friendly-form > section:last-child'));
assert.equal(pageSource.includes('continueToContext'), false);

// The analysis target ("我自己" / "親朋好友") is picked before any birth data,
// matching every other module.
assert.ok(pageSource.includes('<IdentitySplitSelector'));
assert.ok(pageSource.includes("import IdentitySplitSelector from '@/components/IdentitySplitSelector'"));
assert.ok(pageSource.indexOf('<IdentitySplitSelector') < pageSource.indexOf('<UnifiedBirthForm'));
assert.ok(pageSource.includes('getIdentityRequiredMessage()'));

// The relationship-position questions are asked AFTER the reading exists, and
// they never gate submission: chart evidence is frozen before that stage, so a
// customer who skips every question still gets the full deterministic result.
assert.ok(pageSource.indexOf('onClick={() => { void submit(form); }}') < pageSource.indexOf('data-context-field='));
assert.ok(pageSource.indexOf('id="red-luan-layer-1"') < pageSource.indexOf('data-context-field='));
assert.equal(pageSource.includes('id="red-luan-relationship-context"'), false, 'relationship questions must not sit in the pre-submit form');
assert.equal(pageSource.includes('完成三項選擇後開始'), false, 'submit must not be gated on the optional context');
assert.equal(pageSource.includes('請完成此刻的關係位置'), false, 'the blocking context error must be gone');
assert.equal(pageSource.includes('contextMissing'), false, 'the context "missing" gate must be gone');
// Reuses the shared choice component instead of a page-local duplicate.
assert.ok(pageSource.includes("import FriendlyChoiceCard from '@/components/FriendlyChoiceCard'"));
assert.ok(pageSource.includes('<FriendlyChoiceCard'));
assert.ok(pageSource.includes('清除這一題'));
for (const title of ['第一層・命理底盤', '第二層・此刻位置', '第三層・情境交叉', '第四層・問心', '第五層・易經引導']) {
  assert.ok(pageSource.includes(title), `missing onion layer: ${title}`);
}
assert.ok(pageSource.includes('useState(0)'));
assert.ok(pageSource.includes('openedLayer >= 1'));
assert.ok(pageSource.includes('openedLayer >= 2'));
assert.ok(pageSource.includes('openedLayer >= 3'));
assert.ok(pageSource.includes('openedLayer >= 4'));
assert.ok(pageSource.includes('aria-pressed={reflectionChoice === choice.id}'));
assert.ok(pageSource.includes('aria-pressed={alignmentChoice === direction.id}'));
assert.ok(pageSource.includes('品質門控通過前不會傳給 AI'));
assert.ok(pageSource.includes('不是超自然權威'));
assert.ok(pageSource.includes('此刻的關係位置'));
for (const label of ['關係現況', '生活責任', '期待方向', '未婚單身', '交往中', '已婚', '分居', '離異', '喪偶', '認識對象', '穩定交往', '婚姻規劃', '修復關係']) {
  assert.ok(pageSource.includes(label), `missing relationship context option: ${label}`);
}
assert.ok(pageSource.includes('未填寫・中性引導'), 'a skipped question must render as an explicit state, not blank');
assert.ok(pageSource.includes('已完成情境運算'));
assert.ok(pageSource.includes('關係情境運算依你的自述調整引導，不改變八字排盤'));
assert.ok(pageSource.includes('不推斷焦慮、依附型態、創傷、性格或未填資訊'));
assert.ok(routeSource.includes('validateRedLuanSelfReportedContext'));
assert.ok(routeSource.includes("usage: 'REFLECTION_GUIDANCE_ONLY'"));
assert.ok(routeSource.includes('buildRedLuanContextAlignment(selfReportedContext, result)'));
assert.ok(routeSource.includes('generateRedLuanCulturalReading(result)'));
assert.equal(routeSource.includes('generateRedLuanCulturalReading(result,'), false);
assert.ok(routeSource.indexOf('const result = buildSingleRedLuanHeartbeat') < routeSource.indexOf('buildRedLuanContextAlignment(selfReportedContext, result)'));
assert.ok(routeSource.indexOf('buildRedLuanContextAlignment(selfReportedContext, result)') < routeSource.indexOf('generateRedLuanCulturalReading(result)'));
for (const simplified of ['资料', '时间', '验证', '规则', '关系', '显示', '开启', '选择', '说明', '预测']) {
  assert.equal(pageSource.includes(simplified), false, `customer copy contains simplified Chinese: ${simplified}`);
}

console.log('Red Luan heartbeat rules passed');
