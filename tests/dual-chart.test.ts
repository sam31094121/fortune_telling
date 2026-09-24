import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createSession, gateConfigured, passwordMatches, validSession, takeLoginAttempt, sameOrigin } from '../lib/dual-chart-auth';
import { calculateDualChart } from '../lib/dual-chart';
import { createZiweiAstrolabe } from '../lib/ziwei/engine';

delete process.env.DUAL_CHART_PASSWORD;
delete process.env.DUAL_CHART_SESSION_SECRET;
assert.equal(gateConfigured(), false);
assert.equal(passwordMatches('anything'), false);
assert.equal(validSession('anything'), false);
assert.throws(() => createSession());
const temporaryPassword = randomBytes(24).toString('hex');
process.env.DUAL_CHART_PASSWORD = temporaryPassword;
process.env.DUAL_CHART_SESSION_SECRET = randomBytes(48).toString('hex');
assert.equal(passwordMatches(temporaryPassword), true);
assert.equal(passwordMatches('wrong'), false);
assert.equal(passwordMatches({}), false);
const now = Date.now();
const token = createSession(now);
assert.equal(validSession(token, now), true);
assert.equal(validSession(token, now + 1800_000), false);
assert.equal(validSession(token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a'), now), false);
process.env.DUAL_CHART_PASSWORD = 'rotated-test-only';
assert.equal(validSession(token, now), false);
assert.equal(sameOrigin(new Request('http://localhost:8888/api/dual-chart', { headers: { origin: 'https://outside.example' } })), false);
assert.equal(sameOrigin(new Request('http://0.0.0.0:8888/api/dual-chart', { headers: { host: 'localhost:8888', origin: 'http://localhost:8888' } })), true);
for (let i = 0; i < 10; i++) assert.equal(takeLoginAttempt(now), true);
assert.equal(takeLoginAttempt(now), false);
assert.equal(takeLoginAttempt(now + 900_000), true);
const input = { name: '測試資料', birthDate: '1974-07-28', birthTime: '09:30', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei' };
const charts = calculateDualChart(input);
assert.equal(charts.ziwei.palaces.length, 12);
assert.equal(charts.ziwei.majorStarPositions.length, 14);
assert.equal(charts.ziwei.validation.passed, true);
assert.equal(charts.periods.length, 12);
assert.ok(charts.periods.every(period => period.range.length === 2));
for (const sample of [charts, calculateDualChart({ ...input, gender: 'female', birthDate: '2000-02-29', birthTime: '23:30' })]) {
  const raw = createZiweiAstrolabe(sample.ziwei.birthInput);
  for (const period of sample.periods) {
    const source = raw.palaces.find(p => p.earthlyBranch === period.branch)!;
    assert.deepEqual(period.ages, source.ages);
    assert.equal(period.stage, source.changsheng12);
    assert.equal(period.boshi, source.boshi12);
    assert.equal(period.suiqian, source.suiqian12);
    assert.equal(period.jiangqian, source.jiangqian12);
    assert.ok(period.ages.every((age, index) => age >= 1 && (index === 0 || age - period.ages[index - 1] === 12)));
  }
  assert.deepEqual(sample.periods.map(p => p.ages[0]).sort((a,b) => a-b), Array.from({length:12}, (_,i) => i+1));
  assert.equal(sample.annual.length, 15);
  assert.equal(sample.annual[14].year - sample.annual[0].year, 14);
  assert.equal(sample.annual[0].age, sample.annual[0].year - Number(sample.bazi.input.birthDate.slice(0,4)) + 1);
  for (const existing of sample.core.annualLuck) {
    const mapped = sample.annual.find(a => a.year === existing.year)!;
    assert.equal(mapped.ganzhi, existing.ganZhi);
    assert.equal(mapped.stemGod, existing.stemTenGod);
  }
}
assert.equal(charts.bazi.professionalChart.pillarDetails.year.ganzhi, '甲寅');
assert.equal(charts.bazi.professionalChart.pillarDetails.month.ganzhi, '辛未');
assert.deepEqual(calculateDualChart(input).ziwei, charts.ziwei);
for (const change of [{ birthDate: '2023-02-29' }, { birthDate: '2099-01-01' }, { birthTime: '' }, { birthTime: '25:01' }, { gender: '' }, { timezone: 'America/New_York' }, { calendarType: 'lunar' }, { timeUnknown: true }, { birthHourBranch: 'pending' }, { birthHourBranch: 'unknown' }]) assert.throws(() => calculateDualChart({ ...input, ...change }));
assert.equal(calculateDualChart({ ...input, birthTime: '00:30' }).ziwei.birthInput.timeIndex, 0);
assert.equal(calculateDualChart({ ...input, birthTime: '23:30' }).ziwei.birthInput.timeIndex, 12);
console.log('PASS: dual-chart gate, expiry, tampering, rotation, throttle, 12 palaces/14 stars, known pillars, validation and midnight boundary.');
