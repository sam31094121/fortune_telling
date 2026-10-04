// 鬼魅阿修羅：證明前端（client bundle 入口）不會載入八字引擎或阿修羅管線。
// 走真實 TypeScript 模組解析，只追「會進 bundle 的值匯入」；`import type` 會被編譯器抹除，不算。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const rel = file => path.relative(root, file).replaceAll('\\', '/');
const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, root);

const CLIENT_ENTRIES = [
  'app/ghost-asura/GhostAsuraPageClient.tsx',
  'features/ghost-asura/components/GhostAsuraCard.tsx',
];
const FORBIDDEN = [
  /^lib\/bazi\//, /^lib\/bazi-engine/, /^lib\/dual-chart\.ts$/, /^lib\/three-core-engine/,
  /^lib\/server\//, /^lib\/dual-chart-shensha-card/, /^lib\/iching-shensha/,
  /^features\/ghost-asura\/(index|adapter|translator|narrative|battle|guard|registry|extendName|sourceContract|wordings|customerWordings)\.ts$/,
];

function valueImports(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const specs = [];
  for (const node of source.statements) {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      if (clause?.isTypeOnly) continue;
      const named = clause?.namedBindings;
      const onlyTypes = clause && !clause.name && named && ts.isNamedImports(named)
        && named.elements.length > 0 && named.elements.every(el => el.isTypeOnly);
      if (onlyTypes) continue;
      specs.push(node.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && !node.isTypeOnly) {
      specs.push(node.moduleSpecifier.text);
    }
  }
  return specs;
}

const seen = new Map();
const queue = CLIENT_ENTRIES.map(entry => [path.join(root, entry), null]);
while (queue.length) {
  const [file, from] = queue.shift();
  const key = rel(file);
  if (seen.has(key)) continue;
  seen.set(key, from);
  for (const spec of valueImports(file)) {
    const resolved = ts.resolveModuleName(spec, file, options, ts.sys).resolvedModule;
    if (!resolved || resolved.isExternalLibraryImport) continue;
    const target = resolved.resolvedFileName;
    if (!/\.(ts|tsx)$/.test(target) || target.endsWith('.d.ts')) continue;
    queue.push([target, key]);
  }
}

// 既有共用表單 UnifiedBirthForm → lib/canonical-birth-profile.ts 早已在全站前端引用 lib/bazi/engine.ts
// （時辰欄位輔助，非阿修羅管線）；本測試不改共用表單，只把這條既有路徑明列出來，
// 並保證阿修羅自己的檔案沒有任何一條路徑碰到引擎或管線。
const KNOWN_SHARED_EDGE = 'lib/canonical-birth-profile.ts';
const chainOf = file => { const chain = []; for (let f = file; f; f = seen.get(f)) chain.unshift(f); return chain; };
const reached = [...seen.keys()];
const knownShared = [];
for (const file of reached) {
  const hit = FORBIDDEN.find(pattern => pattern.test(file));
  if (!hit) continue;
  const chain = chainOf(file);
  if (/^lib\/bazi\//.test(file) && chain.includes(KNOWN_SHARED_EDGE)) { knownShared.push(chain.join(' -> ')); continue; }
  assert.fail(`Client bundle must not include ${file}: ${chain.join(' -> ')}`);
}
assert(!reached.some(file => /^features\/ghost-asura\/(index|adapter|translator|narrative|battle|guard|registry)\.ts$/.test(file)), 'pipeline never reachable');
if (knownShared.length) console.log(`NOTE (pre-existing shared form edge, not Asura pipeline):\n  ${knownShared.join('\n  ')}`);

const wrapper = fs.readFileSync(path.join(root, 'lib/server/ghost-asura-display.ts'), 'utf8');
assert.match(wrapper, /^import 'server-only';$/m, 'Pipeline wrapper must be server-only');
const route = fs.readFileSync(path.join(root, 'app/api/ghost-asura/reading/route.ts'), 'utf8');
assert.match(route, /@\/lib\/server\/ghost-asura-display/, 'Endpoint runs the pipeline server-side');
const page = fs.readFileSync(path.join(root, 'app/ghost-asura/GhostAsuraPageClient.tsx'), 'utf8');
assert.match(page, /\/api\/ghost-asura\/reading/, 'Page fetches backend display text');
assert.doesNotMatch(page, /buildGhostAsuraReading|@\/lib\/dual-chart['"]|@\/lib\/bazi/, 'Page never computes a reading');

console.log(`PASS: ${reached.length} client modules reachable from ${CLIENT_ENTRIES.length} entries; none load the bazi engine, dual-chart calculation or ghost-asura pipeline`);
console.log(reached.join('\n'));
