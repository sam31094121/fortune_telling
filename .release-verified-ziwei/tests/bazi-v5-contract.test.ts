/**
 * Taiwan Full Traditional Bazi V5 Contract Test
 *
 * TraditionalBaziCore -> Professional Result -> API payload shape.
 * This test proves full traditional fields are exported instead of being
 * hidden as "currently unavailable" while the core already has them.
 */

import { analyzeBazi } from '../lib/bazi-engine';
import { attachBaziProfessionalCoreV5, isLegalBaziPipelineTransition, type BaziRuntimeInput } from '../lib/bazi-professional-result-v5';

let pass = 0; let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++;
  else {
    fail++;
    console.error(`FAIL: ${label}\n  expected=${JSON.stringify(expected)}\n  actual  =${JSON.stringify(actual)}`);
  }
}

function hasValue(value: unknown) {
  if (value == null) return false;
  if (Array.isArray(value)) return true;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return value !== '' && value !== 'UNKNOWN' && value !== 'NOT_CALCULATED';
}

const fullInput: BaziRuntimeInput = {
  calculationId: 'bazi_contract_full',
  name: '測試命盤',
  birthDate: '1988-6-15',
  birthTime: '08:30',
  birthTimeKnown: true,
  gender: 'female',
  country: '台灣',
  city: '台北',
  calendarType: 'solar',
};

{
  const result = attachBaziProfessionalCoreV5(analyzeBazi(fullInput), fullInput);
  const pc = result.professionalChart as any;
  const required = ['solarTerm', 'kongWang', 'twelveStages', 'interactions', 'shenSha', 'mingGong', 'taiYuan', 'taiXi'];
  check('V5 chart mode FULL', pc.chartMode, 'FULL_BAZI');
  check('V5 completeness valid', pc.professionalCompleteness.valid, true);
  check('V5 required fields exported', required.every((key) => hasValue(key === 'solarTerm' ? pc.calendar.solarTerm : pc[key])), true);
  check('V5 field traces are valid', pc.fieldTrace.every((trace: any) => trace.professionalResult === 'VALID_VALUE'), true);
  check('V5 calculationId shared by field trace', pc.fieldTrace.every((trace: any) => trace.calculationId === pc.pipeline.calculationId), true);
  check('V5 pipeline reaches API_READY', pc.pipeline.currentState, 'API_READY');
  check('V5 pipeline calculationId locked', pc.pipeline.calculationId, fullInput.calculationId);
  check('V5 pipeline fingerprint locked', pc.pipeline.birthInputFingerprint, pc.birthInputFingerprint);
  check('V5 pipeline transitions legal', pc.pipeline.transitions.every((transition: any) => isLegalBaziPipelineTransition(transition.from, transition.to)), true);
  check('V5 illegal transition blocked', isLegalBaziPipelineTransition('CORE_PROCESSING', 'CUSTOMER_VIEW_READY'), false);
  check('V5 five element ten god map keeps all five nodes', ['木', '火', '土', '金', '水'].every((element) => Array.isArray(pc.fiveElementTenGodMap[element])), true);
}

const partialInput: BaziRuntimeInput = {
  calculationId: 'bazi_contract_partial',
  name: '未知時辰',
  birthDate: '1988-6-15',
  birthTime: '12:00',
  birthTimeKnown: false,
  timeUnknown: true,
  birthHourBranch: 'unknown',
  gender: 'female',
  country: '台灣',
  city: '台北',
};

{
  const result = attachBaziProfessionalCoreV5(analyzeBazi(partialInput), partialInput);
  const pc = result.professionalChart as any;
  check('PARTIAL_BAZI does not expose fake birthTime', result.input.birthTime, '');
  check('PARTIAL_BAZI core mode', pc.chartMode, 'PARTIAL_BAZI');
  check('PARTIAL_BAZI hour precision', pc.timePrecision, 'UNKNOWN_TIME');
  check('PARTIAL_BAZI validation status', pc.pipeline.validationStatus, 'PARTIAL_VALID');
  check('PARTIAL_BAZI taiYuan still exported', hasValue(pc.taiYuan), true);
  check('PARTIAL_BAZI mingGong data condition', pc.fieldTrace.find((trace: any) => trace.field === 'mingGong')?.professionalResult, 'OPTIONAL_NOT_AVAILABLE');
}

console.log(`\nBAZI V5 CONTRACT — PASS ${pass} / FAIL ${fail}`);
if (fail > 0) process.exit(1);
console.log('BAZI_V5_CONTRACT_CERTIFIED=true');
