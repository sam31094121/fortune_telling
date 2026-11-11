// 「找出我的神獸」只從四大神獸四選一（業主 2026-11-12）：不再配二十八宿本體神獸。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
const Module = require('node:module');
const orig = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) { if (req.startsWith('@/')) req = require('node:path').join(process.cwd(), req.slice(2)); return orig.call(this, req, ...rest); };
const { pickFourGuardian, findSelfStarBeast } = require('../lib/self-star-beast.ts');
const FOUR = ['青龍', '朱雀', '白虎', '玄武'];
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const STEMS = '甲乙丙丁戊己庚辛壬癸', BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const seen = new Set();
for (const s of STEMS) for (const b of BRANCHES) { const r = pickFourGuardian(s + '子', '甲' + b); ok(FOUR.includes(r.guardian), `${s}${b} 一定落在四大神獸`); seen.add(r.guardian); }
ok(seen.size === 4, '四隻都有人拿到');
const expect = { 甲: '青龍', 乙: '青龍', 丙: '朱雀', 丁: '朱雀', 庚: '白虎', 辛: '白虎', 壬: '玄武', 癸: '玄武' };
for (const [s, g] of Object.entries(expect)) ok(pickFourGuardian(s + '子', '甲子').guardian === g, `日主 ${s} 對應 ${g}`);
// 土日主：看出生月份的季節
const earth = { 寅: '青龍', 卯: '青龍', 辰: '青龍', 巳: '朱雀', 午: '朱雀', 未: '朱雀', 申: '白虎', 酉: '白虎', 戌: '白虎', 亥: '玄武', 子: '玄武', 丑: '玄武' };
for (const [b, g] of Object.entries(earth)) for (const s of '戊己') ok(pickFourGuardian(s + '子', '甲' + b).guardian === g, `土日主 ${s}・月支 ${b} → ${g}`);
(async () => {
  const r = await findSelfStarBeast({ birthDate: '1974-07-02', gender: 'female', calendarType: 'solar', timeUnknown: true });
  ok(r.guardian === '青龍' && !('beastId' in r), '1974-07-02 甲辰日（木）→ 青龍，且不再回傳二十八宿 beastId');
  ok(/日主屬木/.test(r.reason) && /青龍/.test(r.reason), '理由由後端組好');
  let d = new Date(Date.UTC(1960, 0, 1)); const got = new Set();
  for (let i = 0; i < 60; i++) { d = new Date(d.getTime() + 211 * 86400000); const ymd = d.toISOString().slice(0, 10); const x = await findSelfStarBeast({ birthDate: ymd, gender: i % 2 ? 'male' : 'female', calendarType: 'solar', timeUnknown: true }); ok(FOUR.includes(x.guardian), ymd + ' → ' + x.guardian); got.add(x.guardian); }
  ok(got.size === 4, '60 個不同生日四隻都出現');
  const entry = fs.readFileSync('components/SelfStarBeastEntry.tsx', 'utf8');
  ok(entry.includes('找出我的四大神獸') && !entry.includes('beastId'), '畫面標題與前端不再用 beastId');
  console.log(`self-four-guardian: ${n} checks passed`);
})().catch((e) => { console.error(e); process.exit(1); });
