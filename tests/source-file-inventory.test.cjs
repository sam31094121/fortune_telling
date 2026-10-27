const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const { listSourceFiles } = require('./helpers/source-file-inventory.cjs');

test('release archive scans new source, preserves roots/extensions, excludes generated and private files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'source-inventory-review-'));
  try {
    const samples = {
      'lib/new-engine.ts': "import bad from '@ziweijs/core'",
      'app/new-card/page.tsx': '科學證實',
      'components/新卡.tsx': 'new card',
      'app/api/new/route.ts': 'backend',
      'app/.env.local': 'private',
      'app/notes.txt': 'not source',
      'app/.next/cache.ts': 'generated',
      'app/node_modules/module.ts': 'dependency',
      'components/backups/old.tsx': 'backup',
      'data/customer.ts': 'outside source roots',
    };
    for (const [file, text] of Object.entries(samples)) {
      const target = path.join(root, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, text);
    }
    assert.equal(fs.existsSync(path.join(root, '.git')), false);
    const all = listSourceFiles(['lib', 'app', 'components'], /\.(ts|tsx|js|mjs)$/, root);
    assert.deepEqual(all, ['app/api/new/route.ts', 'app/new-card/page.tsx', 'components/新卡.tsx', 'lib/new-engine.ts']);
    const bannedImport = /(from\s+['"]@ziweijs\/core['"]|require\(\s*['"]@ziweijs\/core['"]\s*\)|import\(\s*['"]@ziweijs\/core['"]\s*\))/;
    assert.deepEqual(all.filter(f => bannedImport.test(fs.readFileSync(path.join(root, f), 'utf8'))), ['lib/new-engine.ts']);
    const frontend = listSourceFiles(['app', 'components'], /\.(tsx?|jsx?)$/, root).filter(f => !f.startsWith('app/api/'));
    assert.deepEqual(frontend, ['app/new-card/page.tsx', 'components/新卡.tsx']);
    assert.deepEqual(frontend.filter(f => fs.readFileSync(path.join(root, f), 'utf8').includes('科學證實')), ['app/new-card/page.tsx']);
    assert.throws(() => listSourceFiles(['missing'], /\.ts$/, root), 'missing source root must not silently pass');
  } finally {
    const resolved = fs.realpathSync(root);
    assert(resolved.startsWith(fs.realpathSync(os.tmpdir()) + path.sep));
    assert(path.basename(resolved).startsWith('source-inventory-review-'));
    fs.rmSync(resolved, { recursive: true });
  }
});
