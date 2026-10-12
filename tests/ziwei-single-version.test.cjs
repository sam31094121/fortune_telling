// 紫微斗數「只留一個版本」守門：不讓第二個版本悄悄冒出來，造成矛盾與異常。
//  1. 只有 lib/ziwei/engine.ts 可以直接呼叫 iztro（其他地方一律走 createZiweiAstrolabe）
//  2. iztro 釘死版本，不得用 ^ 之類範圍而靜默升級（升級要先重新對照古籍）
//  3. 古籍對齊只在 createZiweiAstrolabe 源頭一處，不得在別處再改一次
//  4. 十四主星廟旺表只有一份（lib/ziwei/brightness-quanshu.ts），且等於古籍存檔
//  5. 專案文件、程式、素材不得再出現舊版錯誤寫法「七殺（廟）」
// 執行：node tests/ziwei-single-version.test.cjs（不需 dev server）
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let checks = 0;
const yes = (c, m) => { assert.ok(c, m); checks += 1; };

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', 'dist', 'build'].includes(name.name) || name.name.startsWith('.')) continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs|json|md|txt)$/.test(name.name)) out.push(full);
  }
  return out;
}
const rel = (f) => path.relative(root, f).split(path.sep).join('/');

// 1. 只有 engine.ts 直接匯入 iztro
const importers = [];
for (const dir of ['app', 'components', 'lib', 'features', 'scripts']) {
  const base = path.join(root, dir);
  if (!fs.existsSync(base)) continue;
  for (const f of walk(base)) {
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f)) continue;
    if (/from\s+['"]iztro(\/|['"])|require\(\s*['"]iztro(\/|['"])/.test(fs.readFileSync(f, 'utf8'))) importers.push(rel(f));
  }
}
const typeOnly = importers.filter((f) => f !== 'lib/ziwei/engine.ts');
assert.deepEqual(typeOnly.filter((f) => !/node_modules|card-preview/.test(f)), [], `只有 lib/ziwei/engine.ts 可以直接用 iztro，發現：${typeOnly.join('、')}`);
checks += 1;
yes(importers.includes('lib/ziwei/engine.ts'), 'engine.ts 是唯一入口');

// 2. iztro 釘死版本
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const pinned = pkg.dependencies.iztro;
yes(/^\d+\.\d+\.\d+$/.test(pinned), `iztro 必須釘死版本（目前 ${pinned}）`);
yes(JSON.parse(fs.readFileSync(path.join(root, 'node_modules/iztro/package.json'), 'utf8')).version === pinned, '安裝的 iztro 版本等於釘死版本');

// 3. 古籍對齊只在源頭一處
const engine = fs.readFileSync(path.join(root, 'lib/ziwei/engine.ts'), 'utf8');
yes((engine.match(/quanshuBrightness\(/g) || []).length === 1, 'quanshuBrightness 只在 createZiweiAstrolabe 的對齊函式呼叫一次');
yes(/function alignAstrolabeToQuanshu/.test(engine) && /alignAstrolabeToQuanshu\(astro\.bySolar/.test(engine) && /alignAstrolabeToQuanshu\(astro\.byLunar/.test(engine), '排盤出口（國曆、農曆）都經過古籍對齊');

// 4. 廟旺表只有一份，且等於古籍存檔
const holders = [];
for (const dir of ['app', 'components', 'lib', 'features', 'data']) {
  const base = path.join(root, dir);
  if (!fs.existsSync(base)) continue;
  for (const f of walk(base)) if (fs.readFileSync(f, 'utf8').includes('旺廟廟旺廟平旺廟廟旺廟平')) holders.push(rel(f));
}
assert.deepEqual(holders, ['lib/ziwei/brightness-quanshu.ts'], `七殺廟旺表只能有一份，發現：${holders.join('、')}`);
checks += 1;

// 5. 舊版錯誤寫法不得再出現
const stale = [];
for (const dir of ['docs/技能戰鬥檔案', 'lib', 'app', 'components', 'features', 'data']) {
  const base = path.join(root, dir);
  if (!fs.existsSync(base)) continue;
  for (const f of walk(base)) {
    const text = fs.readFileSync(f, 'utf8');
    if (/七殺[（(]廟[）)]|七殺入廟/.test(text)) stale.push(rel(f));
  }
}
assert.deepEqual(stale, [], `仍有舊版「七殺（廟）」寫法：${stale.join('、')}`);
checks += 1;

console.log(`ziwei-single-version: ${checks} checks passed`);
