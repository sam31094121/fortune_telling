import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getBaziTraditionalOutputGate } from '../lib/bazi-traditional-gate';
import { calculateDualChart } from '../lib/dual-chart';

const gate = getBaziTraditionalOutputGate(true);
assert.equal(gate.coreStatus, 'VERIFIED');
assert.equal(gate.coreReady, true);
assert.equal(gate.classicsStatus, 'CONFLICT');
assert.equal(gate.fiveGodsStatus, 'CONFLICT');
assert.equal(gate.shenShaStatus, 'PENDING_POOL');
assert.equal(gate.interpretationReady, false);
assert.equal(gate.shenShaReady, false);
for (const field of ['旺衰定論', '格局定論', '用神', '喜神', '忌神', '補強排序', '老師解讀']) {
  assert.ok(gate.withheldFields.includes(field), `守門必須扣住：${field}`);
}

const sample = calculateDualChart({
  name: '固定命例',
  birthDate: '1990-01-01',
  birthTime: '11:30',
  gender: 'male',
  calendarType: 'solar',
  timezone: 'Asia/Taipei',
});

assert.deepEqual(
  [sample.core.pillars.year.ganZhi, sample.core.pillars.month.ganZhi, sample.core.pillars.day.ganZhi, sample.core.pillars.hour === 'UNKNOWN' ? 'UNKNOWN' : sample.core.pillars.hour.ganZhi],
  ['己巳', '丙子', '丙寅', '甲午'],
);
assert.equal(sample.core.calendar.lunarDate.replace('腊', '臘').includes('一九八九年臘月初五'), true);
assert.equal(sample.core.dayMaster.stem, '丙');
assert.deepEqual(sample.core.pillars.year.hiddenStems.map((item) => item.stem), ['丙', '庚', '戊']);
assert.deepEqual(sample.core.pillars.month.hiddenStems.map((item) => item.stem), ['癸']);
assert.deepEqual(sample.core.pillars.day.hiddenStems.map((item) => item.stem), ['甲', '丙', '戊']);
assert.deepEqual(sample.core.pillars.hour === 'UNKNOWN' ? [] : sample.core.pillars.hour.hiddenStems.map((item) => item.stem), ['丁', '己']);
assert.equal(sample.core.twelveStages.year, '臨官');
assert.equal(sample.core.twelveStages.month, '胎');
assert.equal(sample.core.twelveStages.day, '長生');
assert.equal(sample.core.twelveStages.hour, '帝旺');
assert.ok(sample.core.interactions.some((item) => item.interactionType === '子午相沖'));
assert.ok(sample.core.interactions.some((item) => item.interactionType === '寅巳相害'));
assert.equal(typeof sample.core.daYunMeta === 'object' ? sample.core.daYunMeta.direction : 'UNKNOWN', 'BACKWARD');
assert.equal(sample.bazi.professionalChart.traditionalInterpretationGate?.coreReady, true);
assert.equal(sample.bazi.professionalChart.traditionalInterpretationGate?.interpretationReady, false);

const dualChart = fs.readFileSync('app/dual-chart/BaziChart.tsx', 'utf8');
assert.equal(dualChart.includes("'無命中'"), false, '雙命盤不得再用絕對的「無命中」');
assert.equal(/旺衰:\s*pc\.strengthAnalysis|格局:\s*pc\.structurePattern|用神:\s*pc\.gods/.test(dualChart), false, '雙命盤不得繞過守門顯示舊解釋');

const teacherModes = fs.readFileSync('components/bazi/customer/BaziTeacherModes.tsx', 'utf8');
assert.ok(teacherModes.includes('!view.traditionalGate.interpretationReady'), '老師解讀前端必須先過傳統守門');
for (const route of ['google-reading', 'horror-reading']) {
  const source = fs.readFileSync(`app/api/bazi/${route}/route.ts`, 'utf8');
  assert.ok(source.includes('BAZI_TRADITIONAL_INTERPRETATION_BLOCKED'), `${route} 後端必須拒絕未核准解讀`);
}

const matchRoute = fs.readFileSync('app/api/match-generate/route.ts', 'utf8');
assert.ok(matchRoute.includes('baziFoundation.traditionalGate.interpretationReady'), '配對補強必須共用傳統守門');
assert.ok(matchRoute.includes('baziFoundation.traditionalGate.shenShaReady'), '配對神煞必須共用傳統守門');

console.log('PASS: verified Bazi core remains available while unverified interpretation, five-gods and ShenSha outputs are withheld.');
