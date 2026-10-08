const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');
const { NextResponse } = require('next/server');

// Compatibility checks only. No live requests, customer files or scan writes.
// Passing does not certify that audio generation or persistent scan storage exists.
function loadRoute({ exists = false } = {}) {
  const calls = { reads: [], checks: [], logs: [] };
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('app/api/audio/guide/[cardId]/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, {
    module, exports: module.exports, process, Date,
    console: { log(...args) { calls.logs.push(args); }, error() {} },
    require(id) {
      if (id === 'next/server') return { NextResponse };
      if (id === 'path') return path;
      if (id === 'fs') return {
        existsSync(file) { calls.checks.push(file); return exists; },
        readFileSync(file) { calls.reads.push(file); return Buffer.from('test-audio'); },
      };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return { ...module.exports, calls };
}

test('GET awaits route params before validating an invalid card ID', async () => {
  const route = loadRoute();
  const response = await route.GET(new Request('http://test.invalid/'), {
    params: Promise.resolve({ cardId: '../invalid' }),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: '無效的卡片 ID' });
  assert.equal(route.calls.checks.length, 0);
});

test('GET with promised valid params preserves the pending-audio fallback', async () => {
  const route = loadRoute();
  const response = await route.GET(new Request('http://test.invalid/'), {
    params: Promise.resolve({ cardId: '012345abcdef' }),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.audioStatus, 'pending');
  assert.equal(body.cardId, 'universal');
  assert.equal(route.calls.reads.length, 0);
  assert.equal(route.calls.checks[0], path.join(process.cwd(), 'public/audio/guides/012345abcdef.mp3'));
});

test('GET with promised valid params preserves an existing audio response', async () => {
  const route = loadRoute({ exists: true });
  const response = await route.GET(new Request('http://test.invalid/'), {
    params: Promise.resolve({ cardId: '012345abcdef' }),
  });
  assert.equal(response.headers.get('content-type'), 'audio/mpeg');
  assert.equal(await response.text(), 'test-audio');
  assert.equal(route.calls.reads.length, 1);
});

test('POST awaits params before its existing log-only handler', async () => {
  const route = loadRoute();
  const response = await route.POST(new Request('http://test.invalid/', { method: 'POST' }), {
    params: Promise.resolve({ cardId: '012345abcdef' }),
  });
  assert.equal((await response.json()).status, 'success');
  assert.equal(route.calls.logs.length, 1);
  assert.equal(route.calls.logs[0][1].cardId, '012345abcdef');
  assert.equal(route.calls.reads.length, 0);
});
