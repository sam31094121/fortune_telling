// 八字「功能完整」檢查——和 tests/bazi-traditional-gate.test.ts（只證明「擋得對」）刻意分開，
// 擋得對不能代替功能完整。單一 API 放行也不能代替八字頁的入口與顯示可用。
// 來源狀態與經後端核對的放行政策分列；不修改來源、公式或客戶畫面。
const { loadTs } = require('../scripts/bazi-registry-completeness.cjs');
const fs = require('node:fs');
const path = require('node:path');

function evaluateFeatures(registryOverride) {
  const root = path.resolve(__dirname, '..');
  const registry = registryOverride ?? JSON.parse(fs.readFileSync(path.join(root, 'docs/技能戰鬥檔案/八字/來源登記.json'), 'utf8'));
  const sourceGate = loadTs('lib/iching-source-gate.ts');
  const gateModule = loadTs('lib/bazi-traditional-gate.ts', {
    './iching-source-gate': sourceGate,
    '../docs/技能戰鬥檔案/八字/來源登記.json': registry,
  });
  const gate = gateModule.getBaziTraditionalOutputGate(true);
  const ruleNames = { tianyi: '天乙', wenchang: '文昌', taohua: '桃花', yima: '驛馬', huagai: '華蓋' };
  const rule = (key) => gate.shenShaRules[key];
  const capabilities = [
    { id: 'CORE_CHART', title: '基礎四柱排盤', ready: gate.coreReady, detail: `C-BAZI-CHART=${gate.coreStatus}` },
    ...Object.entries(ruleNames).map(([key, name]) => ({
      id: `SHENSHA_${key.toUpperCase()}`,
      title: `四柱神煞・${name}`,
      ready: Boolean(rule(key) && rule(key).ready),
      detail: `${gateModule.BAZI_SHENSHA_CLAIMS[key]}=${rule(key) ? rule(key).status : '缺登記'}${rule(key) && rule(key).reasons.length ? `（${rule(key).reasons.join('；')}）` : ''}`,
    })),
    { id: 'PILLAR_SHENSHA', title: '四柱神煞整列', ready: gate.shenShaReady, detail: `shenShaStatus=${gate.shenShaStatus}` },
    { id: 'TEACHER_INTERPRETATION', title: '八字頁老師判讀入口與呈現', ready: gate.interpretationReady, detail: `八字頁仍承接原有 professionalChart 放行狀態；C-BAZI-CLASSICS=${gate.classicsStatus}、C-BAZI-FIVE-GODS=${gate.fiveGodsStatus}` },
    { id: 'FIVE_GODS', title: '八字頁五神（用神、喜神、忌神、仇神、閒神）', ready: gate.coreReady && gate.fiveGodsStatus === 'VERIFIED', detail: `C-BAZI-FIVE-GODS=${gate.fiveGodsStatus}` },
    { id: 'RED_LUAN', title: '配對紅鸞', ready: gate.redLuanReady, detail: `C-RED-LUAN-SHENSHA=${gate.redLuanStatus}` },
  ];
  return { ok: capabilities.every((c) => c.ready), capabilities };
}

async function reviewStandaloneBazi() {
  const { load } = require('./fixtures/ghost-asura-nature/load.cjs');
  const { POST } = load('app/api/bazi/route.ts');
  const { toBaziCustomerView } = load('components/bazi/customer/adapter.ts');
  const input = { name: '工程測試', birthDate: '1990-05-20', birthTime: '14:00', gender: 'male', country: '台灣', city: '台北', calendarType: 'solar' };
  const call = body => POST(new Request('http://localhost/api/bazi', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }));
  const response = await call(input);
  const payload = await response.json();
  const view = response.status === 200 && payload.ok && payload.data
    ? toBaziCustomerView(payload.data, false) : null;
  const teacherReady = view?.traditionalGate.interpretationReady === true
    && view.teacher.verified === true && typeof view.teacher.summary === 'string' && view.teacher.summary.length > 0;
  const elements = ['木', '火', '土', '金', '水'];
  const godsReady = view?.traditionalGate.interpretationReady === true
    && ['usefulGod', 'joyGod', 'avoidGod', 'enemyGod', 'neutralGod'].every(key => elements.includes(view.gods?.[key]))
    && view.reinforcement.priorityOrder.length > 0;
  const unknownResponse = await call({ ...input, timeUnknown: true, birthTimeKnown: false,
    verified: true, interpretationReady: true, traditionalInterpretationGate: { interpretationReady: true } });
  const unknown = await unknownResponse.json();
  const rejectedForgedReview = unknownResponse.status === 200 && unknown.ok
    && unknown.data?.professionalChart?.traditionalInterpretationGate?.interpretationReady === false;
  const noStore = response.headers.get('cache-control') === 'no-store';
  return {
    passed: teacherReady && godsReady && rejectedForgedReview && noStore,
    teacherReady,
    godsReady,
    rejectedForgedReview,
    noStore,
    scope: '真實八字 POST 與現有顯示 adapter，以台灣國曆精確時辰合成命例核對；未知時辰不得被前端標記放行。不代表所有時區、農曆輸入或真機視覺驗收。',
  };
}

async function evaluateReviewedFeatures() {
  const { readReviewedAvailability } = require('../scripts/bazi-functional-health.cjs');
  const sourceReport = evaluateFeatures();
  const reviewed = await readReviewedAvailability();
  const standalone = await reviewStandaloneBazi();
  const find = id => reviewed.capabilities.find(item => item.id === id);
  const redLuan = find('MATCH_RED_LUAN');
  const capabilities = sourceReport.capabilities.map(item => {
    if (item.id === 'RED_LUAN') return { ...item, ready: redLuan?.available === true,
      detail: `配對入口採後端核對放行政策；原始來源狀態保留：${item.detail}` };
    if (item.id === 'TEACHER_INTERPRETATION' || item.id === 'FIVE_GODS') return { ...item,
      ready: standalone.passed && (item.id === 'TEACHER_INTERPRETATION' ? standalone.teacherReady : standalone.godsReady),
      detail: `已核對真實八字 API 與頁面顯示資料；限台灣國曆精確時辰通過後端核對。原始來源狀態保留於 sourceAudit。` };
    return item;
  });
  const apiCapabilities = [
    ['BAZI_TEACHER_ADVANCED', '老師解讀 API 的後端核對放行'],
    ['BAZI_REINFORCEMENT', '配對喜用補強的後端核對放行'],
  ].map(([id, title]) => ({ id, title, ready: find(id)?.available === true }));
  return {
    ok: capabilities.every(item => item.ready) && apiCapabilities.every(item => item.ready)
      && reviewed.backendReview?.passed === true && standalone.passed,
    scope: '限定台灣國曆精確時辰合成命例的後端與顯示資料完整性；未知時辰仍保留基礎資料。來源稽核獨立保留，不代表所有輸入或真機視覺通過。',
    capabilities,
    apiCapabilities,
    backendReview: reviewed.backendReview,
    standalone,
    sourceAudit: sourceReport,
  };
}

module.exports = { evaluateFeatures, evaluateReviewedFeatures };

if (require.main === module) {
  evaluateReviewedFeatures().then(report => {
  console.log(report.scope);
  for (const c of report.capabilities) console.log(`${c.ready ? 'READY' : 'NOT READY'}: ${c.title} — ${c.detail}`);
  for (const c of report.apiCapabilities) console.log(`${c.ready ? 'READY' : 'NOT READY'}: ${c.title}（不代替頁面驗收）`);
  const missing = report.capabilities.filter((c) => !c.ready);
  if (!report.ok) {
    console.log(`FAIL: bazi feature complete — ${missing.length}/${report.capabilities.length} 項未放行：${missing.map((c) => c.title).join('、')}`);
    if (!report.backendReview?.passed) console.log('後端核對情境未全數通過。');
    for (const item of report.apiCapabilities.filter(item => !item.ready)) console.log(`API 未通過：${item.title}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: bazi feature complete — 限定測例的 ${report.capabilities.length} 項後端與顯示資料核對通過（非全輸入／真機驗收）`);
  }
  }).catch(error => {
    console.error('FAIL: bazi feature complete — 無法完成核對', error.message);
    process.exitCode = 1;
  });
}
