// Scoped read-only regression entry; no source-status upgrades or automatic rollback.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const npxCli = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npx-cli.js');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'docs/技能戰鬥檔案/鬼魅阿修羅/三步技能版本.json'), 'utf8'));
assert.equal(registry.scope, 'ghost-asura-guided-conversation');
assert.equal(registry.physicalPhoneVerified, false, 'this runner does not certify physical phones');
assert.deepEqual(registry.skills.map(skill => skill.id), ['summary', 'why', 'action']);
assert.deepEqual(registry.skills.map(skill => skill.order), [1, 2, 3]);
function exists(relative) {
  const target = path.resolve(root, relative);
  assert.ok(target.startsWith(root + path.sep), 'registered paths stay inside project');
  assert.ok(fs.statSync(target).isFile(), `missing registered file: ${relative}`);
}
exists(registry.authority);
registry.evidence.forEach(exists);
const tests = new Set();
for (const skill of registry.skills) {
  assert.match(skill.version, /^\d+\.\d+\.\d+$/);
  assert.equal(skill.state, 'CONNECTED');
  assert.ok(skill.condition.trim() && skill.missing.trim());
  exists(skill.source); exists(skill.implementation);
  assert.ok(skill.tests.length);
  skill.tests.forEach(test => { exists(test); tests.add(test); });
}
assert.ok(registry.reserved.every(skill => skill.state === 'ARCHIVED'));
for (const test of [
  ...tests,
  'tests/ghost-asura-page-flow.test.cjs',
  'tests/ghost-asura-skill-reading-flow.test.cjs',
  'tests/ghost-asura-effects-lifecycle.test.cjs',
  'tests/ghost-asura-dependency-boundary.test.cjs',
  ...(process.argv.includes('--browser') ? ['tests/ghost-asura-conversation.e2e.mjs'] : []),
]) {
  // Use the same cached tsx runner as the existing test; never install during a check.
  const args = test.endsWith('.test.mjs')
    ? [npxCli, '--no-install', 'tsx', test] : [test];
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', windowsHide: true, timeout: 300000 });
  if (result.error || result.status !== 0) {
    console.error(`FAIL ${test}: ${result.error?.message || result.signal || result.status}`);
    process.exit(1);
  }
}
console.log('PASS Asura registry and scoped regression; not whole-site or physical-phone certification.');
