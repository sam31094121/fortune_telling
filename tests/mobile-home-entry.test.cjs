const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('HomeToolsCard keeps language and font-size controls, and does not force a load scroll', () => {
  const src = fs.readFileSync('components/HomeToolsCard.tsx', 'utf8');
  assert.match(src, /data-home-tools-card/);
  assert.match(src, /data-text-size-switch/);
  assert.match(src, /data-text-size-option/);
  assert.match(src, /data-home-tools-language/);
  assert.equal(/from ['"]@\/components\/useMobileHomeEntry['"]/.test(src), false);
  assert.equal(/useMobileHomeEntry\s*\(/.test(src), false);
  assert.equal(/scrollIntoView\s*\(/.test(src), false);
  assert.equal(/useLayoutEffect\s*\(/.test(src), false);
});

test('the mobile load-alignment hook is gone, so a fresh visit cannot snap to the tools card', () => {
  assert.equal(fs.existsSync('components/useMobileHomeEntry.ts'), false);
  assert.equal(fs.existsSync('components/useMobileHomeEntry.tsx'), false);
});
