import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  annualBranchOf,
  buildBaziLovePersonSignal,
  buildRedLuanContextAlignment,
  buildSingleRedLuanAnnualRhythm,
  buildSingleRedLuanHeartbeat,
  buildRedLuanAffinityProfile,
  buildRedLuanNextEncounters,
  buildSingleRedLuanMonthlyRhythm,
  buildZiweiLovePersonSignal,
  normalizeRedLuanAttractedType,
  normalizeRedLuanSelfReportedContext,
  RED_LUAN_CONTEXT_UNSPECIFIED,
  RED_LUAN_ATTRACTED_TYPE_OPTIONS,
  RED_LUAN_SOLAR_MONTHS,
  validateRedLuanAttractedType,
  RED_LUAN_CURRENT_EXPECTATIONS,
  RED_LUAN_FAMILY_RESPONSIBILITIES,
  RED_LUAN_RELATIONSHIP_STATUSES,
  redLuanBranchOf,
  tianXiBranchOf,
  validateRedLuanSelfReportedContext,
} from '../lib/red-luan-heartbeat-engine';
import { buildRedLuanIChingReading } from '../lib/red-luan-iching-reading';
import { buildRedLuanIcs, buildRedLuanShareText } from '../lib/red-luan-followup';
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
// 月份改為以節氣月支觸發同一組規則，因此時辰未知也算得出來（月支不依賴時柱）。
assert.equal(singleUnknownHour.monthlyRhythm.status, 'READY');
assert.equal(singleUnknownHour.monthlyRhythm.precision, 'SOLAR_TERM_MONTH_BRANCH');
assert.equal(singleUnknownHour.monthlyRhythm.months.length, 12, '一年固定十二個節氣月');
assert.deepEqual(
  singleUnknownHour.monthlyRhythm.months.map((month) => month.monthBranch),
  ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'],
  '節氣月支固定由寅月起，與年份無關',
);
assert.ok(singleUnknownHour.monthlyRhythm.peakMonths.length <= 3);
for (const peak of singleUnknownHour.monthlyRhythm.peakMonths) {
  assert.ok(peak.hitCount > 0, '高峰月必須真的有規則命中');
  assert.ok(peak.evidence.every((item) => item.ruleId && item.ruleVersion && item.source), '每筆月度證據都要帶規則編號與出處');
  assert.ok(peak.evidence.every((item) => item.precision === 'SOLAR_TERM_MONTH_BRANCH'));
}
assert.deepEqual(
  [...singleUnknownHour.monthlyRhythm.peakMonths].sort((a, b) => a.monthIndex - b.monthIndex).map((m) => m.monthIndex),
  singleUnknownHour.monthlyRhythm.peakMonths.map((m) => m.monthIndex),
  '高峰月依節氣先後排列',
);

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

// ---- 月度節奏：同一組規則改以節氣月支觸發 ----
const monthly = buildSingleRedLuanMonthlyRhythm({ yearBranch: '午', dayBranch: '子', dayMasterStem: '甲', year: 2026 });
assert.equal(monthly.length, 12);
assert.deepEqual(monthly.map((m) => m.monthIndex), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
assert.deepEqual(monthly.map((m) => m.jieqi)[0], '立春', '正月起於立春');
assert.deepEqual(
  buildSingleRedLuanMonthlyRhythm({ yearBranch: '午', dayBranch: '子', dayMasterStem: '甲', year: 2026 }),
  monthly,
  '月度節奏必須是決定性的：同輸入同輸出',
);
// 年支午 → 紅鸞在酉、天喜在卯，因此酉月與卯月必須命中。
assert.ok(monthly.find((m) => m.monthBranch === '酉')?.evidence.some((e) => e.ruleId === 'RED_LUAN_BY_YEAR_BRANCH_V1'));
assert.ok(monthly.find((m) => m.monthBranch === '卯')?.evidence.some((e) => e.ruleId === 'TIAN_XI_OPPOSITE_RED_LUAN_V1'));
// 日支子 → 六合在丑、六沖在午。
assert.ok(monthly.find((m) => m.monthBranch === '丑')?.evidence.some((e) => e.ruleId === 'DAY_BRANCH_SIX_COMBINE_V1'));
assert.ok(monthly.find((m) => m.monthBranch === '午')?.evidence.some((e) => e.ruleId === 'DAY_BRANCH_SIX_CLASH_V1'));
for (const month of monthly) {
  assert.equal(month.hitCount, month.evidence.length);
  assert.equal(month.status, month.evidence.length > 0 ? 'RULE_HIT' : 'NO_RULE_HIT');
  assert.ok(month.evidence.every((item) => item.precision === 'SOLAR_TERM_MONTH_BRANCH'));
}
assert.equal(RED_LUAN_SOLAR_MONTHS.length, 12);

// ---- 下一次是什麼時候：從今天往後掃，會跨年 ----
const nextFromSep = buildRedLuanNextEncounters({ yearBranch: '午', dayBranch: '子', dayMasterStem: '甲', fromDate: '2026-09-03' });
assert.equal(nextFromSep.fromDate, '2026-09-03');
assert.ok(nextFromSep.upcoming.length > 0);
assert.deepEqual(
  nextFromSep.upcoming.map((item) => item.startsOn),
  [...nextFromSep.upcoming.map((item) => item.startsOn)].sort(),
  '未來月份必須依時間排序',
);
assert.ok(nextFromSep.upcoming.every((item) => item.startsOn >= '2026-09-08' || item.monthsAway === 0), '不得回頭給已經過去的月份');
assert.ok(nextFromSep.upcoming.some((item) => item.gregorianYear > 2026), '今年掃完要接著掃明年');
assert.ok(nextFromSep.upcoming.every((item) => item.monthsAway >= 0));
// 六沖不算「會碰到」的訊號，不得混進來。
assert.ok(nextFromSep.upcoming.every((item) => item.evidence.every((row) => row.id !== 'day_branch_clash')));
// 相吸與貴人分流。
assert.ok(nextFromSep.soulResonance === null || nextFromSep.soulResonance.kind !== 'BENEFACTOR');
assert.ok(nextFromSep.benefactor === null || nextFromSep.benefactor.kind !== 'SOUL_RESONANCE');
for (const item of nextFromSep.upcoming) {
  assert.ok(item.magnet.length > 0 && item.action.length > 0, '每個月份都要有磁鐵與臨門一腳的話術');
  assert.ok(item.mechanism.length > 0, '話術底下必須掛真實心理機制');
  assert.ok(item.loveWords.length > 0, '前端要有給客戶看的愛情用詞');
  // 高端術語留後端稽核，前端顯示的愛情用詞不得夾帶括號英文術語。
  assert.ok(item.loveWords.every((word) => !/[（(][A-Za-z]/.test(word)), `愛情用詞不該出現術語：${item.loveWords.join('、')}`);
  assert.ok(item.mechanism.every((term) => /[（(][A-Za-z]/.test(term)), '後端機制必須是可查證的正式術語');
  assert.equal(item.endsOn > item.startsOn, true);
}
// 同一組輸入永遠同一結果。
assert.deepEqual(buildRedLuanNextEncounters({ yearBranch: '午', dayBranch: '子', dayMasterStem: '甲', fromDate: '2026-09-03' }), nextFromSep);
// 換一個起點，第一筆就要跟著往後移。
// 天數倒數：月數會把急迫感磨掉（差 5 天卻說「還有 1 個月」）。
for (const item of nextFromSep.upcoming) {
  assert.ok(item.daysAway >= 0);
  assert.equal(item.daysAway, item.isCurrent ? 0 : item.daysAway, '已經開始的月份不得還有倒數天數');
  assert.ok(item.daysLeft >= 0);
  if (!item.isCurrent) assert.equal(item.daysLeft, 0);
}
// 站在窗口正中間問，要回報「進行中」與剩餘天數，而不是把它算成過去或未來。
const insideWindow = buildRedLuanNextEncounters({ yearBranch: '午', dayBranch: '子', dayMasterStem: '甲', fromDate: '2026-09-20' });
const current = insideWindow.upcoming[0];
assert.equal(current.isCurrent, true, '9/20 落在 9/8 起的酉月裡，必須算成進行中');
assert.equal(current.daysAway, 0);
assert.ok(current.daysLeft > 0 && current.daysLeft <= 31, `剩餘天數要落在一個月內，實際 ${current.daysLeft}`);
assert.ok(current.startsOn <= '2026-09-20' && '2026-09-20' < current.endsOn);

const nextFromDec = buildRedLuanNextEncounters({ yearBranch: '午', dayBranch: '子', dayMasterStem: '甲', fromDate: '2026-12-20' });
assert.ok((nextFromDec.upcoming[0]?.startsOn ?? '') > (nextFromSep.upcoming[0]?.startsOn ?? ''), '起點往後，下一次也要往後');

// ---- 有緣方向 ----
const affinity = buildRedLuanAffinityProfile({ yearBranch: '午', dayBranch: '子', dayMasterStem: '甲', ziwei: singleUnknownHour.ziwei, attractedType: 'WARM_STEADY' });
assert.equal(affinity.status, 'READY');
assert.ok(affinity.branches.length > 0);
assert.ok(affinity.branches.every((row) => row.ruleId && row.zodiac && row.direction && row.trait), '每個方向都要有規則編號與生肖方位');
assert.ok(affinity.branches.some((row) => row.label === '紅鸞' && row.branch === '酉'));
assert.equal(affinity.selfReportedLabel, '溫柔穩定型');
assert.equal(affinity.spouseStars.length, 0, '時辰未知時不得補紫微主星');
assert.equal(
  buildRedLuanAffinityProfile({ yearBranch: '午', dayBranch: '子', dayMasterStem: '甲', ziwei: singleUnknownHour.ziwei }).selfReportedLabel,
  '未填寫',
);
assert.equal(validateRedLuanAttractedType(''), null);
assert.equal(validateRedLuanAttractedType(undefined), null);
assert.equal(validateRedLuanAttractedType('WARM_STEADY'), null);
assert.match(validateRedLuanAttractedType('NOPE') ?? '', /類型/);
assert.equal(normalizeRedLuanAttractedType('NOPE'), RED_LUAN_CONTEXT_UNSPECIFIED);

// ---- 易經層：同一生辰永遠同一卦，且只起一顆卦 ----
const ichingInput = { name: '測試', birthDate: '1990-05-12', shichenIndex: 6, year: 2026, peakMonths: monthly.filter((m) => m.hitCount > 0).slice(0, 3), affinity };
const ichingA = buildRedLuanIChingReading(ichingInput);
const ichingB = buildRedLuanIChingReading(ichingInput);
assert.deepEqual(ichingA, ichingB, '易經層必須是決定性的');
assert.ok(ichingA.hexagram.kingWen >= 1 && ichingA.hexagram.kingWen <= 64);
assert.ok(ichingA.patternName.endsWith('格'));
// 心理學洋蔥：四層，一層一句重點，不繞圈。
assert.equal(ichingA.onion.length, 4);
assert.deepEqual(ichingA.onion.map((layer) => layer.step), [1, 2, 3, 4]);
assert.deepEqual(ichingA.onion.map((layer) => layer.layer), ['別人看到的你', '其實的你', '你現在在想的', '那不是你的錯']);
for (const layer of ichingA.onion) {
  assert.ok(layer.point.length > 0);
  assert.ok(layer.point.length <= 60, `第 ${layer.step} 層太長，洋蔥要講重點：${layer.point}`);
}
assert.ok(ichingA.onion.slice(0, 3).every((layer) => layer.term), '前三層要附心理學名詞');
assert.equal(ichingA.onion[3].term, undefined, '核心層只需要一句話，不掛名詞');
assert.ok(ichingA.spark.heaven.includes('2026'));
assert.ok(ichingA.spark.human.includes(ichingA.hexagram.name), '天人勾動地火必須引用同一顆卦');
assert.ok(ichingA.seedText.includes('1990-05-12'), '起卦依據要可回查');
// 沒有任何命中月份時也要給得出話術，不能空白或當掉。
const ichingNoPeak = buildRedLuanIChingReading({ ...ichingInput, peakMonths: [] });
assert.ok(ichingNoPeak.spark.heaven.length > 0);
assert.equal(ichingNoPeak.spark.heaven.includes('窗口'), false, '沒命中就不能講成有窗口');

// ---- 洋蔥層：外型 → 相處 → 職業 → 方位 ----
assert.deepEqual(affinity.onionLayers.map((layer) => layer.step), [1, 2, 3, 4]);
assert.ok(affinity.onionLayers.every((layer) => layer.headline && layer.detail));
assert.ok(affinity.onionLayers[2].title.includes('在做什麼'), '第三層必須是職業類型');
assert.ok(affinity.branches.every((row) => row.appearance && row.careers.length > 0), '每個方向都要有外型與職業對應');
// 未見神煞現位時只給一層，且不得假裝看得到方向。
const blankAffinity = buildRedLuanAffinityProfile({ yearBranch: '子', dayBranch: '子', ziwei: singleUnknownHour.ziwei });
assert.ok(blankAffinity.onionLayers.length >= 1);

// ---- 兩位老師：同一顆卦、不同話術 ----
assert.deepEqual(ichingA.teachers.map((t) => t.key), ['iching', 'ghost']);
const [ichingTeacher, ghostTeacher] = ichingA.teachers;
assert.equal(ichingTeacher.name, '易經老師');
assert.equal(ghostTeacher.name, '鬼魅老師');
assert.notEqual(ichingTeacher.opening, ghostTeacher.opening, '兩位老師的開場必須不同');
assert.notDeepEqual(ichingTeacher.sections, ghostTeacher.sections, '兩位老師的段落必須不同');
// 易經老師刻意精簡：對象一句帶過（細節在自己的折疊裡），重點放時間與卦示。
assert.ok(ichingTeacher.sections.length >= 3, '易經老師至少要有對象、時間、卦示');
assert.ok(ghostTeacher.sections.length >= 4);
assert.equal(
  ichingTeacher.sections.filter((section) => /第.層/.test(section.title)).length,
  0,
  '四層細節不得在老師這裡再講一次',
);
for (const teacher of ichingA.teachers) {
  assert.ok(teacher.sections.every((section) => section.title && section.text.length > 10));
  assert.ok(teacher.closing.length > 0);
  // 手冊 §十一：同一模組的卦象與話術必須是同一顆卦。
  assert.ok(
    [teacher.opening, ...teacher.sections.map((s) => s.text), teacher.closing].join('').includes(ichingA.hexagram.name),
    `${teacher.name} 必須引用同一顆卦`,
  );
}
assert.ok(ghostTeacher.sections.some((s) => s.title.includes('磁場')));
assert.ok(ghostTeacher.sections.some((s) => s.title.includes('因果')));

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
// 出生時辰是加值不是前提：不知道時辰仍要拿得到月份與人選，
// 只有紫微夫妻宮與生辰卦鎖住，而且明說未解鎖、不以預設午時充數。
assert.equal(routeSource.includes("'BIRTH_TIME_REQUIRED_FOR_BAZI_ZIWEI_CROSS_CHECK'"), false, '不得因為沒有時辰就擋掉整份解讀');
assert.equal(routeSource.includes("'ZIWEI_VALIDATION_NOT_READY'"), false, '紫微排不出來要降級，不是回 422');
assert.ok(routeSource.includes('const ziweiReady = hourKnown'));
assert.ok(routeSource.includes('unlocks:'), '回應要告訴前端哪些項目還沒解鎖');
assert.equal(pageSource.includes("timeUnknown || !profile.birthHourBranch ? 'birthHourBranch'"), false, '時辰不得再列為必填');
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
// 補填區必須在頂層折疊，不能埋在證據折疊的第二層裡——客戶找不到就等於沒有。
assert.ok(pageSource.indexOf('foldKey="refine"') < pageSource.indexOf('id="red-luan-layer-1"'), '補填區要在層鏈之前');
assert.ok(pageSource.indexOf('data-context-field=') < pageSource.indexOf('id="red-luan-layer-1"'), '補填題目不得埋在層鏈裡');
assert.ok(pageSource.includes('想讓引導更貼近你嗎？'));
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
// docs/iching-skill-manual.md §七 前端鐵律：客戶只看到「易經」二字。
// 內部狀態鍵（UNAVAILABLE_AI_NOT_CONFIGURED）不對客戶顯示，因此只檢查文案。
for (const forbidden of ['AI 文化表達層', '不會被 AI 改寫', '不送入 AI', '不會傳給 AI', 'AI 不會收到', 'AI 只負責']) {
  assert.equal(pageSource.includes(forbidden), false, `前端仍出現 AI 字樣：${forbidden}`);
}
assert.ok(pageSource.includes('易經文化表達層'));
assert.ok(pageSource.includes('品質門控通過前不會傳給表達層'));
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

// ---- 結尾三動作：分享與行事曆是傳播與回訪的實際載體 ----
const reminderFixture = {
  name: '林小雨',
  startsOn: '2026-09-08',
  endsOn: '2026-10-08',
  monthLine: '這個月桃花和貴人一起到',
  typeHeadline: '中等身材、短髮乾淨的男生',
  daysAway: 5,
  topCandidate: '醫師、會計',
  url: 'https://example.test/red-luan-heartbeat',
};

const shareText = buildRedLuanShareText(reminderFixture);
// 沒有連結的分享等於斷頭：收到的人讀完無從自己試一次。
assert.ok(shareText.includes(reminderFixture.url), '分享文字一定要帶連結');
assert.ok(shareText.includes('2026 年 9 月'));
assert.ok(shareText.includes('還有 5 天'), '具體天數才是分享時最抓人的地方');
assert.ok(shareText.includes(reminderFixture.topCandidate));
assert.equal(buildRedLuanShareText({ ...reminderFixture, daysAway: 0 }).includes('就是這個月'), true);

const ics = buildRedLuanIcs(reminderFixture);
const icsLines = ics.split('\r\n');
assert.equal(icsLines[0], 'BEGIN:VCALENDAR');
assert.equal(icsLines[icsLines.length - 1], 'END:VCALENDAR');
// 31 天的整天事件會橫跨行事曆一整個月，多數人會直接刪掉；只放開窗那一天。
assert.ok(icsLines.includes('DTSTART;VALUE=DATE:20260908'));
assert.ok(icsLines.includes('DTEND;VALUE=DATE:20260909'), '提醒必須是單日，不是整個月的橫幅');
assert.ok(icsLines.some((line) => line.startsWith('DTSTAMP:') && !line.includes('20260908T000000Z')), 'DTSTAMP 要是產生時間');
assert.ok(icsLines.some((line) => line === 'TRIGGER:-P1D'), '前一天要提醒');
// 提醒跳出來時客戶多半忘了細節，整段內容與回卡片的路都要在裡面。
const descriptionLine = icsLines.find((line) => line.startsWith('DESCRIPTION:') && line.includes('容易來電')) ?? '';
assert.ok(descriptionLine.includes(reminderFixture.url), '行事曆說明要帶回卡片的連結');
assert.ok(descriptionLine.includes(reminderFixture.topCandidate));
// .ics 規格：逗號與分號必須跳脫，否則整個欄位會被解析器截斷。
assert.equal(descriptionLine.includes('，常出現在'), true);
// .ics 規格：未跳脫的半形逗號會讓解析器把整個欄位截斷。
const rawDescription = descriptionLine.replace('DESCRIPTION:', '');
assert.equal(/[^\\],/.test(rawDescription), false, '半形逗號必須跳脫');

console.log('Red Luan follow-up actions passed');

// ---- 核心一・品質：前端不得自己編出看起來像運算結果的東西 ----
// 折疊徽章的層數必須來自實際資料。命盤無命中時只有 1 層，寫死「4 層」就是說謊。
assert.equal(pageSource.includes('badge="4 層"'), false, '層數不得寫死，要用 onionLayers.length');
assert.ok(pageSource.includes('(reading.affinity.onionLayers ?? []).length} 層'));

// 選項標籤在前端與引擎各存一份，會各改各的。這裡鎖住兩邊一字不差。
const engineSource = readFileSync(join(process.cwd(), 'lib/red-luan-heartbeat-engine.ts'), 'utf8');
for (const option of RED_LUAN_ATTRACTED_TYPE_OPTIONS) {
  assert.ok(engineSource.includes(`'${option.label}'`), `引擎缺少標籤 ${option.label}`);
  assert.ok(pageSource.includes(`'${option.label}'`), `前端缺少標籤 ${option.label}`);
  assert.ok(pageSource.includes(`'${option.note}'`), `前端缺少說明 ${option.note}（引擎已寫好卻沒顯示）`);
}

console.log('Red Luan frontend-honesty checks passed');
