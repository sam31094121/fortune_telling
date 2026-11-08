const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
let externalCalls = 0;
const modules = new Map();
function load(file) {
  file = path.resolve(file);
  if (modules.has(file)) return modules.get(file).exports;
  const mod = { exports: {} };
  modules.set(file, mod);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const localRequire = (id) => {
    if (id === 'server-only') return {};
    if (id === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    if (/genai|openai|anthropic|generative-ai/.test(id)) { externalCalls++; throw Error('No generation allowed'); }
    if (id.startsWith('@/') || id.startsWith('.')) {
      let target = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(file), id);
      if (!path.extname(target)) target += '.ts';
      return load(target);
    }
    return require(id);
  };
  vm.runInNewContext(code, { require: localRequire, module: mod, exports: mod.exports,
    console: { ...console, error() {} }, process, Response,
    fetch() { externalCalls++; throw Error('No external requests allowed'); },
  }, { filename: file });
  return mod.exports;
}
(async () => {
  const route = 'app/api/karma-story-generate/route.ts';
  assert.doesNotMatch(fs.readFileSync(route, 'utf8'), /getFallbackKarmaStory|前世的執念|雷風恆卦/);
  process.env.GEMINI_API_KEY = 'test-key-must-not-enable-generation';
  const { POST } = load(route);
  const personA = { name: '甲', birthDate: '1990-05-20', bloodType: 'A', gender: 'male', shichen: 7 };
  const personB = { ...personA, name: '乙', birthDate: '1992-01-01' };
  const request = (body, ip) => new Request('http://localhost/api/karma-story-generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(body),
  });
  for (let i = 0; i < 3; i++) {
    const response = await POST(request({ personA, personB, matchResult: { match_score: 99 }, verified: true }, 'test-valid'));
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.code, 'TEMPORARILY_UNAVAILABLE');
    assert.equal(body.message, '暫時無法取得');
    assert.equal(body.ok, false);
    assert.ok(body.requestId);
    assert.equal(body.karma_story, undefined);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal((await POST(request({}, 'test-invalid'))).status, 400);
  const invalidJson = new Request('http://localhost/api/karma-story-generate', { method: 'POST', body: '{' });
  assert.equal((await POST(invalidJson)).status, 400);
  for (let i = 0; i < 5; i++) await POST(request({}, 'test-limit'));
  assert.equal((await POST(request({}, 'test-limit'))).status, 429);
  assert.equal(externalCalls, 0);
  console.log('PASS disabled karma route: repeat requests stay unavailable, no story/cache/fallback/generation; invalid input and rate limit preserved');
})().catch((error) => { console.error(error); process.exitCode = 1; });
