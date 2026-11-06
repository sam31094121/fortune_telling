// 鬼魅阿修羅 API 錯誤路徑：穩定錯誤碼＋繁中訊息、不外洩堆疊；缺 period 的盤 → ageTimeline null（不拋錯）。
// 單元部分離線可跑；API 部分打 ASURA_BASE（預設 http://localhost:8888），伺服器不在線就略過並註明。
const assert = require('node:assert/strict');
const { load } = require('./fixtures/ghost-asura-nature/load.cjs');
const errors = load('lib/server/ghost-asura-errors.ts');
const display = load('lib/server/ghost-asura-display.ts');
const tl = load('lib/server/ghost-asura-translation-layer.ts');
const { calculateDualChart } = load('lib/dual-chart.ts');

const ZH = /^[\u3400-\u9fff「」，。、：；（）\d\s]+$/;
const noLeak = (s) => !/(Error|at\s+\S+\s*\(|\.ts|\.js|node_modules|stack)/i.test(s);

// ── 1) 分類器 ──
for (const [code, msg] of Object.entries(errors.ASURA_ERROR_MESSAGE)) { assert.deepEqual(errors.asuraError(code), { error: msg, code }); assert(ZH.test(msg), msg); }
assert.equal(errors.classifyAsuraComputeError(new Error('請選擇排盤性別。')).code, 'ASURA_MISSING_GENDER');
assert.equal(errors.classifyAsuraComputeError(new Error('請填寫完整國曆出生日期。')).code, 'ASURA_INVALID_BIRTH_DATE');
assert.equal(errors.classifyAsuraComputeError(new Error('請輸入 1901 年起至今天的有效出生日期。')).code, 'ASURA_INVALID_BIRTH_DATE');
assert.equal(errors.classifyAsuraComputeError(new Error('請補齊出生時辰，才能排出完整八字與紫微命盤。')).code, 'ASURA_INVALID_BIRTH_TIME');
const internal = errors.classifyAsuraComputeError(new TypeError("Cannot read properties of undefined (reading 'x') at foo (/srv/lib/x.ts:1:2)"));
assert.deepEqual(internal, { error: '出生資料無法排盤。', code: 'ASURA_CHART_FAILED' });
assert.deepEqual(errors.classifyAsuraComputeError('string thrown'), { error: '出生資料無法排盤。', code: 'ASURA_CHART_FAILED' });
assert.deepEqual(errors.asuraRateLimited(61), { error: '戰局開得太密。刀先歇著，約 2 分鐘後再來。', code: 'ASURA_RATE_LIMITED' });
assert.equal(errors.asuraRateLimited(0).error, '戰局開得太密。刀先歇著，約 1 分鐘後再來。');

// ── 2) 缺 period → ageTimeline null（不拋錯）；decreeAnchors 隨之 null ──
const now = new Date('2026-11-06T05:00:00Z');
const r = calculateDualChart({ birthDate: '1974-06-28', birthTime: '18:00', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei' });
const strip = (fn) => ({ ...r, ziwei: { ...r.ziwei, palaces: r.ziwei.palaces.map(fn) } });
assert.equal(display.computeAgeTimeline(strip((p, i) => (i === 3 ? { ...p, period: undefined } : p)), now), null, 'one period missing');
assert.equal(display.computeAgeTimeline(strip((p) => ({ ...p, period: null })), now), null, 'all periods null');
assert.equal(display.computeAgeTimeline(strip((p, i) => (i === 0 ? { ...p, period: { ...p.period, stage: '???' } } : p)), now), null, 'unknown value');
assert.equal(display.computeAgeTimeline({ ...r, ziwei: undefined }, now), null, 'no ziwei');
assert.equal(display.computeAgeTimeline({}, now), null, 'empty result');
assert.equal(tl.buildDecreeAnchors(null), null);
assert(display.computeAgeTimeline(r, now), 'control: intact chart still builds');

// ── 3) API 錯誤路徑 ──
const base = process.env.ASURA_BASE ?? 'http://localhost:8888';
const CASES = [
  ['empty body', '', 400, 'ASURA_EMPTY_BODY'],
  ['bad json', '{oops', 400, 'ASURA_INVALID_JSON'],
  ['too large', JSON.stringify({ birthDate: '1974-06-28', name: 'x'.repeat(3000) }), 400, 'ASURA_BODY_TOO_LARGE'],
  ['null body', 'null', 400, 'ASURA_MISSING_BIRTH_DATE'],
  ['no birthDate', JSON.stringify({ gender: 'male' }), 400, 'ASURA_MISSING_BIRTH_DATE'],
  ['bad format', JSON.stringify({ birthDate: 'abc', birthTime: '18:00', gender: 'male' }), 400, 'ASURA_INVALID_BIRTH_DATE'],
  ['month 13', JSON.stringify({ birthDate: '1974-13-45', birthTime: '18:00', gender: 'male' }), 400, 'ASURA_INVALID_BIRTH_DATE'],
  ['feb 30', JSON.stringify({ birthDate: '1974-02-30', birthTime: '18:00', gender: 'male' }), 400, 'ASURA_INVALID_BIRTH_DATE'],
  ['1800', JSON.stringify({ birthDate: '1800-01-01', birthTime: '18:00', gender: 'male' }), 400, 'ASURA_INVALID_BIRTH_DATE'],
  ['future', JSON.stringify({ birthDate: '2999-01-01', birthTime: '18:00', gender: 'male' }), 400, 'ASURA_INVALID_BIRTH_DATE'],
  ['no gender', JSON.stringify({ birthDate: '1974-06-28', birthTime: '18:00' }), 400, 'ASURA_MISSING_GENDER'],
  ['bad time', JSON.stringify({ birthDate: '1974-06-28', birthTime: '25:99', gender: 'male' }), 400, 'ASURA_INVALID_BIRTH_TIME'],
];
(async () => {
  let online = true;
  try { await fetch(base, { method: 'HEAD' }); } catch { online = false; }
  if (!online) { console.log('ghost-asura-reading-errors: PASS (unit only; API offline, skipped)'); return; }
  let i = 0;
  const post = (body, origin = base) => fetch(`${base}/api/ghost-asura/reading`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'x-forwarded-for': `10.88.${Date.now() % 200}.${i++}` }, body });
  for (const [name, body, status, code] of CASES) {
    const res = await post(body); const j = await res.json();
    assert.equal(res.status, status, `${name} status`);
    assert.deepEqual(Object.keys(j), ['error', 'code'], `${name} envelope`);
    assert.equal(j.code, code, `${name} code`);
    assert(ZH.test(j.error) && noLeak(j.error), `${name} message: ${j.error}`);
  }
  const forb = await post(JSON.stringify({ birthDate: '1974-06-28' }), 'https://evil.example');
  const fj = await forb.json();
  assert.equal(forb.status, 403); assert.deepEqual(fj, { error: '請從本站開啟。', code: 'ASURA_FORBIDDEN_ORIGIN' });
  const ok = await post(JSON.stringify({ birthDate: '1974-06-28', birthTime: '18:00', gender: 'male' }));
  const oj = await ok.json();
  assert.equal(ok.status, 200); assert.deepEqual(Object.keys(oj), ['data'], 'success envelope');
  console.log(`ghost-asura-reading-errors: PASS (unit + ${CASES.length + 2} API cases)`);
})().catch((e) => { console.error(e); process.exit(1); });
