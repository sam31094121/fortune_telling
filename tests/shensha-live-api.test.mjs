import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Synthetic fixtures: 1990-01-01 男，己巳年／丙子月／丙寅日，只換時柱。
// 預期名稱依「太極紫微易經派取法」（docs/技能戰鬥檔案/八字/shensha-rule-integrity/references/參考命盤取法.md）手算，
// 不是抄引擎輸出。年、月、日三柱固定：年柱天德（子月天德在巳）；月柱龍德（巳年順七至子）、六厄（巳酉丑六厄在子）。
// 日柱丙寅：學堂（丙長生在寅）、紅艷（丙紅艷在寅）。丙寅在甲子旬，旬空戌亥。
// 第二批：年柱巳為丙日祿位（祿神）；巳年劫煞在寅（日柱）；巳年孤辰申、寡宿辰；子月天醫在亥。
// 第三批：丙日天廚在巳（年柱）；巳年亡神在申。第四批：丙日羊刃午，沖子為飛刃（月柱）。
const fixedPillars = { year: ['天德', '祿神', '天廚'], month: ['龍德', '六厄', '飛刃'], day: ['學堂', '紅艷', '劫煞'] };
const fixtures = [
  // 卯：天狗（巳順十）、災煞（巳酉丑在卯）、沐浴（丙至卯）、桃花（寅午戌咸池卯）、外桃花（桃花在時）
  ['05:30', '辛卯', ['天狗', '災煞', '沐浴', '桃花', '外桃花']],
  // 壬辰：月德（子月壬，時干壬）、隔角（寅順兩位辰）
  ['07:30', '壬辰', ['月德', '隔角', '寡宿']],
  // 午：月破（子沖午）、將星（寅午戌將星午）、羊刃（丙刃午）
  ['11:30', '甲午', ['月破', '將星', '羊刃']],
  // 申：天德合（子月合在申）、日破（寅沖申）、驛馬（寅日馬在申）、文昌（丙見申）
  ['15:30', '丙申', ['天德合', '日破', '驛馬', '文昌貴人', '孤辰', '亡神']],
  // 戌：元辰（己巳陰年男命順五至戌）、華蓋（寅午戌華蓋戌）
  ['19:30', '戊戌', ['元辰', '華蓋', '空亡']],
  // 亥：驛馬（巳年馬在亥）、天乙（丙見亥）
  ['21:30', '己亥', ['驛馬', '天乙貴人', '空亡', '天醫']],
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
const { inspectShenShaDelivery, inspectShenShaRow, inspectShenShaPlacement, inspectShenShaCard } = require('../scripts/dual-chart-shensha-display-check.cjs');

for (const [birthTime, hour, expected] of fixtures) {
  const response = await req('/api/dual-chart', { birthDate: '1990-01-01', birthTime, gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei' }, cookie);
  assert.equal(response.status, 200, `${birthTime} API`);
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  const { data } = await response.json();
  const pc = data.bazi.professionalChart;
  assert.equal(data.core.engine.version, '1.2.0');
  assert.deepEqual(['year', 'month', 'day', 'hour'].map(k => data.core.pillars[k].ganZhi), ['己巳', '丙子', '丙寅', hour]);
  assert.equal(pc.traditionalInterpretationGate.shenShaReady, true, 'Selected-edition rules are deterministic and ready');
  assert.equal(pc.traditionalInterpretationGate.shenShaRules.tianyi.status, 'VERIFIED');
  assert.equal(pc.traditionalInterpretationGate.shenShaRules.tianyi.outputStatus, 'READY');
  assert.equal(pc.traditionalInterpretationGate.shenShaRules.wenchang.status, 'VERIFIED');
  assert.equal(pc.traditionalInterpretationGate.shenShaRules.wenchang.outputStatus, 'READY');
  assert.equal(pc.traditionalInterpretationGate.interpretationReady, false, 'God-name output must not unlock advanced judgments');
  assert.deepEqual(pc.shenSha, data.core.shenSha);
  const expectedByPillar = { ...fixedPillars, hour: expected };
  for (const key of ['year', 'month', 'day', 'hour']) {
    assert.deepEqual(data.specialStars.byPillar[key].map(s => s.name), expectedByPillar[key], `${birthTime} ${key} hand-derived names`);
  }
  assert.equal(data.specialStars.card.state, 'received', `${birthTime}: bazi/ziwei pillars agree and every rule is evaluated`);
  for (const item of data.core.shenSha) {
    // 有原典頁碼的（羊刃、元辰、天乙、文昌、驛馬、華蓋）必附完整來源；太極紫微易經派取法項目不得冒充原典。
    if (item.source) assert.ok(item.source.printedPage && item.source.url);
    else assert.equal(item.ruleVersion, 'REFERENCE_CHART_1974_V1');
  }
  const html = renderToStaticMarkup(React.createElement(component.PillarGrid, { result: data }));
  assert.deepEqual(inspectShenShaDelivery(data, inspectShenShaRow(html)), [], `${birthTime}: API data reaches the original four pillars exactly`);
  assert.deepEqual(inspectShenShaPlacement(html), [], `${birthTime}: results appear directly below the pillars without folding`);
  assert.deepEqual(inspectShenShaCard(data, renderToStaticMarkup(React.createElement(component.ShenShaCard, { result: data }))), [], `${birthTime}: all original card content is directly visible`);
  assert.equal(html.includes('暫未提供'), false);
  const displayed = expected;
  const cardHtml = renderToStaticMarkup(React.createElement(component.ShenShaCard, { result: data }));
  assert.equal(html.includes('天乙貴人'), expected.includes('天乙貴人'), 'Tianyi follows the selected edition');
  assert.equal(html.includes('文昌貴人'), expected.includes('文昌貴人'), 'Wenchang follows the selected edition');
  for (const name of displayed) assert.ok(html.includes(name), `${birthTime}: API data reaches the actual PillarGrid component`);
  if (!expected.length) assert.match(html, /<tr[^>]*><td><\/td><td><\/td><td><\/td><td><\/td><th scope="row">特星神煞<\/th><\/tr>/, 'No-match row stays empty by user display policy');
  assert.equal(html.includes('未命中'), false);
  for (const name of displayed) assert.ok(cardHtml.includes(`>${name}</li>`), `${birthTime}: ${name} reaches the special-stars card`);
  if (birthTime === '21:30') {
    fs.mkdirSync('.tmp/dual-chart-ui-qa', { recursive: true });
    fs.writeFileSync('.tmp/dual-chart-ui-qa/live-data.json', JSON.stringify(data, null, 2));
  }
  console.log(`PASS: 1990-01-01 ${birthTime}｜${hour}｜${displayed.join('、') || '顯示空欄'}｜API資料與輸出政策、實際元件一致`);
}
// 太極紫微易經派桃花不加納音條件：甲寅日（大溪水）見卯時，舊袁本納音法不命中，本派命中時柱桃花＋外桃花。
const contrastResponse = await req('/api/dual-chart', { birthDate: '1990-02-18', birthTime: '05:30', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei' }, cookie);
assert.equal(contrastResponse.status, 200);
const { data: contrast } = await contrastResponse.json();
assert.equal(contrast.core.pillars.day.ganZhi, '甲寅');
assert.equal(contrast.core.pillars.hour.ganZhi, '丁卯');
assert.ok(contrast.specialStars.byPillar.hour.some(s => s.id === 'taohua'));
assert.ok(contrast.specialStars.byPillar.hour.some(s => s.id === 'waiTaohua'));
assert.deepEqual(contrast.core.shenSha, contrast.bazi.professionalChart.shenSha);
console.log('PASS: 1990-02-18 05:30｜甲寅日丁卯時｜本派桃花不加納音條件，時柱桃花、外桃花命中');
console.log('PASS: live API and rendered component; browser layout still requires separate visual verification');
