const assert = require('node:assert/strict');
const path = require('node:path');
const ts = require('typescript');
const load = require('./helpers/load-iching-shensha-ui.cjs');
const root = path.resolve(__dirname, '..');
const relative = file => path.relative(root, file).replaceAll('\\', '/');

// Follow real TypeScript imports (including type-only edges), not a name grep.
// An excluded root is still checked if an Asura/shared dependency imports it.
const configFile = path.join(root, 'tsconfig.ghost-asura.json');
const config = ts.readConfigFile(configFile, ts.sys.readFile);
assert.equal(config.error, undefined);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
assert.equal(parsed.errors.length, 0);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const projectFiles = program.getSourceFiles().map(file => relative(file.fileName))
  .filter(file => !file.startsWith('node_modules/') && !file.startsWith('../'));
// The global language provider shares two literal translation dictionaries.
// They contain no gameplay/card code. Keep them, but fail if code is added.
const sharedCopy = new Set(['lib/korean-copy/pages/star-beasts.ts', 'lib/korean-copy/pages/beast-game.ts']);
for (const source of program.getSourceFiles().filter(file => sharedCopy.has(relative(file.fileName)))) {
  assert(source.statements.length > 0);
  for (const statement of source.statements) {
    assert(ts.isVariableStatement(statement), 'Shared beast copy may contain only literal dictionaries');
    for (const declaration of statement.declarationList.declarations) {
      assert(declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer));
      assert(declaration.initializer.properties.every(property => ts.isPropertyAssignment(property)
        && ts.isStringLiteral(property.name) && ts.isStringLiteral(property.initializer)),
      'No imports, functions, spreads or computed entries are allowed in shared beast copy');
    }
  }
}
const beastModules = projectFiles.filter(file => /(^|\/)[^/]*beast[^/]*(\/|\.)/i.test(file) && !sharedCopy.has(file));
assert.deepEqual(beastModules, [], 'Asura entries and transitive imports must not require beast gameplay, cards or asset data');
assert(!projectFiles.includes('lib/three-in-one.ts'), 'A pure pillar check must not load the beast-bearing integration module');
for (const required of ['lib/bazi/engine.ts', 'lib/three-core-engine.ts', 'lib/dual-chart.ts',
  'lib/four-pillar-verification.ts', 'app/api/dual-chart/route.ts', 'app/api/dual-chart/session/route.ts']) {
  assert(projectFiles.includes(required), `The real shared dependency must remain checked: ${required}`);
}

const cache = new Map();
const { calculateDualChart } = load('lib/dual-chart.ts', 'zh-Hant', cache);
const result = calculateDualChart({
  birthDate: '1974-06-28', birthTime: '18:00', gender: 'male',
  calendarType: 'solar', timezone: 'Asia/Taipei',
});
assert.equal(result.core.pillars.year.ganZhi, '甲寅');
assert.equal(result.core.pillars.month.ganZhi, '庚午');
assert.equal(result.core.pillars.day.ganZhi, '庚子');
assert.equal(result.core.pillars.hour.ganZhi, '乙酉');
assert.deepEqual([...cache.keys()].map(relative).filter(file => /beast|three-in-one/i.test(file)), [],
  'Actual chart calculation must not load beast modules either');

const pureCache = new Map();
const pure = load('lib/four-pillar-verification.ts', 'zh-Hant', pureCache);
assert.equal(pureCache.size, 1, 'Pillar comparison stays dependency-free');
const keys = ['year', 'month', 'day', 'hour'];
const anchor = Object.freeze({ year: '甲寅', month: '庚午', day: '庚子', hour: '乙酉' });
for (let mask = 0; mask < 16; mask += 1) {
  const other = Object.freeze(Object.fromEntries(keys.map((key, i) => [key, mask & (1 << i) ? '' : anchor[key]])));
  const check = pure.verifyFourPillars(anchor, other);
  assert.equal(check.passed, mask === 0);
  assert.deepEqual(JSON.parse(JSON.stringify(check.differences)), keys.flatMap((key, i) =>
    mask & (1 << i) ? [{ pillar: key, bazi: anchor[key], ziwei: '' }] : []));
}
// Existing consumers retain the same export, rather than getting a second copy.
const integration = load('lib/three-in-one.ts', 'zh-Hant', pureCache);
assert.equal(integration.verifyFourPillars, pure.verifyFourPillars);
assert.equal(integration.PILLAR_LABELS, pure.PILLAR_LABELS);
console.log(`PASS: ${projectFiles.length} transitive project files isolated from beast features; 2 shared literal language dictionaries retained; real backend, 16 pillar comparisons and compatible exports verified`);
console.log('Scope: Asura dependency verification only; not a whole-site build or deployment approval.');
