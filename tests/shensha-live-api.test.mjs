import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Synthetic fixtures: 丙寅日、爐中火。Expected names and pillar locations
// are hand derived from the selected source rules, not from engine output.
const fixtures = [
  ['05:30', '辛卯', ['桃花']],
  ['11:30', '甲午', []],
  ['15:30', '丙申', ['文昌貴人', '驛馬']],
  ['19:30', '戊戌', ['華蓋']],
  ['21:30', '己亥', ['天乙貴人', '驛馬']],
];
const base = process.env.DUAL_CHART_TEST_URL || 'http://127.0.0.1:8888';
assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/, 'Synthetic test credentials stay on the local development server');
assert.ok(process.env.DUAL_CHART_PASSWORD, 'Load the authorized local environment');
const req = (path, body, cookie) => fetch(base + path, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...(cookie ? { Cookie: cookie } : {}) },
  body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
});
const login = await req('/api/dual-chart/session', { password: process.env.DUAL_CHART_PASSWORD });
assert.equal(login.status, 200, 'Local session login');
const cookie = login.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie);
const require = createRequire(import.meta.url);
const loadShenShaUi = require('./helpers/load-shensha-ui.cjs');
const component = loadShenShaUi('app/dual-chart/BaziChart.tsx');
const professionalComponent = loadShenShaUi('components/bazi/customer/ProfessionalBaziTable.tsx');

for (const [birthTime, hour, expected] of fixtures) {
  const response = await req('/api/dual-chart', { birthDate: '1990-01-01', birthTime, gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei' }, cookie);
  assert.equal(response.status, 200, `${birthTime} API`);
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  const { data } = await response.json();
  const pc = data.bazi.professionalChart;
  assert.equal(data.core.engine.version, '1.2.0');
  assert.deepEqual(['year', 'month', 'day', 'hour'].map(k => data.core.pillars[k].ganZhi), ['己巳', '丙子', '丙寅', hour]);
  assert.equal(pc.traditionalInterpretationGate.shenShaReady, false, 'Documented variants withheld, not a full recovery claim');
  assert.equal(pc.traditionalInterpretationGate.shenShaRules.tianyi.status, 'VERIFIED');
  assert.equal(pc.traditionalInterpretationGate.shenShaRules.tianyi.outputStatus, 'BLOCKED_VARIANT');
  assert.equal(pc.traditionalInterpretationGate.shenShaRules.wenchang.status, 'VERIFIED');
  assert.equal(pc.traditionalInterpretationGate.shenShaRules.wenchang.outputStatus, 'BLOCKED_VARIANT');
  assert.equal(pc.traditionalInterpretationGate.interpretationReady, false, 'God-name output must not unlock advanced judgments');
  assert.deepEqual(pc.shenSha, data.core.shenSha);
  assert.deepEqual(data.core.shenSha.map(s => s.name).sort(), [...expected].sort(), `${birthTime} fixed expected names`);
  for (const item of data.core.shenSha) {
    assert.match(item.evidence, /^HOUR 支/, `${birthTime} only the hour pillar matches`);
    assert.equal(item.ruleVersion, 'MINGLI_TANYUAN_SHENSHA_V5');
    assert.equal(item.source.sourceId, 'S-MINGLI-TANYUAN-1937-SCAN');
    assert.ok(item.source.printedPage && item.source.url);
  }
  const html = renderToStaticMarkup(React.createElement(component.PillarGrid, { result: data }));
  assert.equal(html.includes('暫未提供'), false);
  const displayed = expected.filter(name => !['天乙貴人', '文昌貴人'].includes(name));
  assert.equal(html.includes('天乙貴人'), false, 'Documented Tianyi variant cannot leak into the result row');
  assert.equal(html.includes('文昌貴人'), false, 'Documented Wenchang variant cannot leak into the result row');
  for (const name of displayed) assert.ok(html.includes(name), `${birthTime}: API data reaches the actual PillarGrid component`);
  if (!expected.length) assert.match(html, /<tr[^>]*><td><\/td><td><\/td><td><\/td><td><\/td><th scope="row">神煞<\/th><\/tr>/, 'No-match row stays empty by user display policy');
  assert.equal(html.includes('未命中'), false);
  const professional = renderToStaticMarkup(React.createElement(professionalComponent.ProfessionalBaziTable, { result: data.bazi, hourUnknown: false }));
  for (const name of displayed) assert.ok(professional.includes(name + ' · HOUR'), `${birthTime}: basic professional table must also show the eligible item while advanced reading is blocked`);
  assert.equal(professional.includes('天乙貴人 · HOUR'), false);
  assert.equal(professional.includes('文昌貴人 · HOUR'), false);
  if (birthTime === '21:30') {
    fs.mkdirSync('.tmp/dual-chart-ui-qa', { recursive: true });
    fs.writeFileSync('.tmp/dual-chart-ui-qa/live-data.json', JSON.stringify(data, null, 2));
  }
  const unknownHour = renderToStaticMarkup(React.createElement(professionalComponent.ProfessionalBaziTable, { result: data.bazi, hourUnknown: true }));
  assert.equal(unknownHour.includes(' · HOUR'), false, 'unknown-hour display cannot leak a stale hour match in its source details');
  console.log(`PASS: 1990-01-01 ${birthTime}｜${hour}｜${displayed.join('、') || '顯示空欄'}｜API資料與輸出政策、實際元件一致`);
}
// Same 寅 day branch and 卯 hour as the positive case, but 甲寅 is 大溪水,
// so the selected 火局／火納音 condition fails. The old unconditional day
// branch lookup would incorrectly return 桃花 for this selected method.
const contrastResponse = await req('/api/dual-chart', { birthDate: '1990-02-18', birthTime: '05:30', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei' }, cookie);
assert.equal(contrastResponse.status, 200);
const { data: contrast } = await contrastResponse.json();
assert.equal(contrast.core.pillars.day.ganZhi, '甲寅');
assert.equal(contrast.core.pillars.hour.ganZhi, '丁卯');
assert.equal(contrast.bazi.professionalChart.traditionalInterpretationGate.shenShaRules.taohua.ready, true);
assert.equal(contrast.core.shenSha.some(s => s.id === 'taohua'), false);
assert.deepEqual(contrast.core.shenSha, contrast.bazi.professionalChart.shenSha);
const contrastHtml = renderToStaticMarkup(React.createElement(component.PillarGrid, { result: contrast }));
assert.equal(contrastHtml.includes('桃花'), false);
console.log('PASS: 1990-02-18 05:30｜甲寅日丁卯時｜納音不符，桃花不命中；舊日支通用查表反例');
console.log('PASS: live API and rendered component; browser layout still requires separate visual verification');
