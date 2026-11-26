// 八字技能檔自身一致性守門（業主 2026-11-26）：技能檔寫的東西必須都是真的。
//   1. 技能檔列出的 relatedFiles、engine.entry、來源登記檔都真的存在
//   2. verification.tests 裡每個 npm 指令都真的存在於 package.json
//   3. 鐵律「四柱只能走 lib/bazi/engine.ts」：引擎以外直接呼叫曆法套件算干支的檔案，必須在白名單內（新增一個就會被擋下來）
//   4. 技能檔登記的本派三項取法，程式裡都找得到對應入口
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const skill = JSON.parse(read('docs/技能戰鬥檔案/八字/八字.json'));
const pkg = JSON.parse(read('package.json'));
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks += 1; };

for (const f of [...skill.relatedFiles, skill.engine.entry, skill.sourceRegistry, skill.newbieDoc, skill.sourceGovernance, skill.sourceGate, skill.integration]) {
  ok(fs.existsSync(path.join(root, f)), `技能檔指到不存在的檔案：${f}`);
}
for (const t of skill.verification.tests) {
  const m = /^npm run ([\w:.-]+)/.exec(t.script);
  ok(m && pkg.scripts[m[1]], `技能檔列的測試指令不存在：${t.script}`);
}
const ia = skill.verification.independentAudit;
ok(ia && /^npm run ([\w:.-]+)/.test(ia.script) && pkg.scripts[/^npm run ([\w:.-]+)/.exec(ia.script)[1]], '獨立審查指令必須存在');

// 3. 干支推算白名單（引擎以外）
const ALLOWED = new Set([
  'lib/bazi/engine.ts',
  'lib/dual-chart.ts',                       // 流年干支（立春界）
  'lib/server/ghost-asura-display.ts',       // 阿修羅流年干支輔助
  'lib/ghost-asura-flow-year-engine.ts',     // 阿修羅流年引擎自帶年序
]);
const PATTERN = /getYearInGanZhi|getMonthInGanZhi|getDayInGanZhi|getTimeInGanZhi|getEightChar\b|getYearGan|getDayGan/;
const hits = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel);
    else if (/\.(ts|tsx)$/.test(e.name) && PATTERN.test(read(rel))) hits.push(rel);
  }
};
for (const d of ['lib', 'app', 'components', 'features']) if (fs.existsSync(path.join(root, d))) walk(d);
const stray = hits.filter((f) => !ALLOWED.has(f) && !/opencc|zh-hans/.test(f));
ok(stray.length === 0, `引擎以外有人另算干支（鐵律：四柱只能走 createBaziCore）：${stray.join('、')}`);

// 4. 本派三項取法都有對應入口
const methods = skill.localMethods?.items ?? [];
ok(methods.length >= 3, '技能檔要登記本派三項固定取法');
ok(/partyShare/.test(read('lib/bazi/engine.ts')), '旺衰同黨占比法：engine.ts 要有 partyShare');
ok(/exposedStems/.test(read('lib/bazi-engine.ts')), '格局透干取格：bazi-engine.ts 要有 exposedStems');
ok(/export function annualTwelveAt/.test(read('lib/dual-chart-iching-shensha.ts')), '流年神煞：要有 annualTwelveAt');
console.log(`bazi-skill-file: ${checks} checks passed`);
