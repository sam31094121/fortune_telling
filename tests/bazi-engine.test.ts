import assert from 'node:assert/strict';
import { analyzeBazi } from '../lib/bazi-engine';

const result = analyzeBazi({
  name: '架構驗證',
  birthDate: '1993-12-13',
  birthTime: '01:30',
  gender: 'male',
  country: '台灣',
  city: '台北',
});

assert.equal(result.professionalChart.layer, 'professional_chart');
assert.equal(result.professionalChart.recalculationAllowed, false);
assert.equal(result.professionalChart.verification.readyForInterpretation, true);
assert.equal(result.professionalChart.verification.failedReasons.length, 0);

assert.equal(result.aiDeepAnalysis.layer, 'ai_deep_analysis');
assert.equal(result.aiDeepAnalysis.sourceLayer, 'professional_chart');
assert.equal(result.aiDeepAnalysis.recalculationAllowed, false);
assert.equal(result.aiDeepAnalysis.sourceChecksum, result.professionalChart.verification.checksum);
assert.ok(result.aiDeepAnalysis.summary.includes('直接讀取第一層專業命盤'));
assert.ok(result.aiDeepAnalysis.plainText.includes('不重新排盤'));
assert.ok(result.aiDeepAnalysis.logicTrace.every((trace) => trace.source === 'professional_chart'));
assert.ok(result.aiDeepAnalysis.logicTrace.some((trace) => trace.step === '驗證第一層命盤'));
assert.ok(result.aiDeepAnalysis.logicTrace.some((trace) => trace.output.includes('不輸出行動方案')));

assert.equal(result.aiReinforcementPlan.layer, 'ai_reinforcement_plan');
assert.equal(result.aiReinforcementPlan.sourceLayer, 'ai_deep_analysis');
assert.equal(result.aiReinforcementPlan.recalculationAllowed, false);

console.log('bazi engine layering contract ok');
