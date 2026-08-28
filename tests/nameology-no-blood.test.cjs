// Run with node tests/nameology-no-blood.test.cjs; no network or personal data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
};
const { buildNameologyAnalysis } = require('../lib/nameology-engine.ts');
const { getNamePersonalityScores } = require('../lib/name-model-db.ts');
const input = { gender: 'male', birthDate: '1990-01-01' };
const scores = getNamePersonalityScores('王小明');
const baseline = buildNameologyAnalysis('王小明', scores, input);
const withoutTimestamps = value => JSON.parse(JSON.stringify(value, (key, item) => key === 'verifiedAt' ? undefined : item));
for (const bloodType of ['A', 'B', 'AB', 'O', '', 'invalid']) {
  assert.deepEqual(withoutTimestamps(buildNameologyAnalysis('王小明', scores, { ...input, bloodType })), withoutTimestamps(baseline));
}
assert.equal(JSON.stringify(baseline).includes('血型'), false);
assert.equal('bloodTypeLens' in baseline.crossCheck, false);

// Exercise the actual route validator without loading the route's external services.
const route = fs.readFileSync(path.join(root, 'app/api/nameology-analyze/route.ts'), 'utf8');
const ast = ts.createSourceFile('route.ts', route, ts.ScriptTarget.Latest, true);
const validator = ast.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'validateNameologyRequest');
assert.ok(validator);
const code = ts.transpileModule(validator.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const validate = vm.runInNewContext(code + '\nvalidateNameologyRequest', {
  VALID_GENDERS: ['male', 'female'], isValidBirthday: value => value === '1990-01-01',
  normalizeNameologyShichen: require('../lib/nameology-bazi-crosscheck.ts').normalizeNameologyShichen,
});
assert.equal(validate({ name: '王小明', ...input }), null);
assert.equal(validate({ name: '王小明', ...input, bloodType: 'invalid' }), null);
assert.ok(validate({ name: '', ...input }));
assert.ok(validate({ name: '王小明', ...input, birthDate: 'invalid' }));

// Legacy stored profiles must not reintroduce blood type into outgoing forms.
const profileSource = fs.readFileSync(path.join(root, 'lib/nameology-self-profile.ts'), 'utf8');
const profileCode = ts.transpileModule(profileSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
let stored = JSON.stringify({ name: '王小明', ...input, bloodType: 'A' });
const box = { exports: {}, window: { localStorage: { getItem: () => stored, setItem: (_, value) => { stored = value; } } } };
vm.runInNewContext(profileCode, box);
assert.equal('bloodType' in box.exports.readNameologySelfProfile(), false);
box.exports.saveNameologySelfProfile({ name: '王小明', ...input, bloodType: 'A' });
assert.equal('bloodType' in JSON.parse(stored), false);
console.log('PASS: blood-independent results, API validation, and legacy-profile sanitization');
