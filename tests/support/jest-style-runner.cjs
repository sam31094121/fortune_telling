#!/usr/bin/env node
/**
 * 極小 jest 風格執行器（零新增依賴）：讓 tests/*.test.ts 的 describe/it/test/expect/beforeAll 能直接跑。
 * 用法：node tests/support/jest-style-runner.cjs tests/asura-wording.test.ts [更多檔案…]
 * 作法：以專案既有的 typescript 套件 transpileModule 成 CommonJS（不做型別檢查）＋本檔提供的全域函式；'@/…' 對應專案根目錄。
 * 型別宣告：tests/support/jest-style-globals.d.ts（讓整專案 tsc 認得這些全域名）。
 */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const util = require('node:util');
const ts = require('typescript');

const root = path.resolve(__dirname, '..', '..');

// ---- .ts/.tsx 載入 ----
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (mod, filename) => {
    const src = fs.readFileSync(filename, 'utf8');
    const out = ts.transpileModule(src, {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX, resolveJsonModule: true },
    }).outputText;
    mod._compile(out, filename);
  };
}
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith('@/')) request = path.join(root, request.slice(2));
  return origResolve.call(this, request, ...rest);
};

// ---- describe/test 收集 ----
const mkSuite = (name, parent) => ({ name, parent, children: [], beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] });
const rootSuite = mkSuite('', null);
let current = rootSuite;
const describe = (name, fn) => {
  const s = mkSuite(name, current);
  current.children.push({ kind: 'suite', suite: s });
  const prev = current; current = s;
  try { fn(); } finally { current = prev; }
};
const test = (name, fn) => current.children.push({ kind: 'test', name, fn });
test.skip = (name) => current.children.push({ kind: 'skip', name });
describe.skip = (name) => current.children.push({ kind: 'skip', name });
const hook = (k) => (fn) => current[k].push(fn);

// ---- expect ----
class ExpectError extends Error {}
const show = (v) => util.inspect(v, { depth: 4, breakLength: 120 });
const makeMatchers = (actual, negate) => {
  const check = (pass, msg) => { if (pass === negate) throw new ExpectError(`expect(${show(actual)})${negate ? '.not' : ''}.${msg}`); };
  return {
    toBe: (e) => check(Object.is(actual, e), `toBe(${show(e)})`),
    toEqual: (e) => check(util.isDeepStrictEqual(actual, e), `toEqual(${show(e)})`),
    toStrictEqual: (e) => check(util.isDeepStrictEqual(actual, e), `toStrictEqual(${show(e)})`),
    toBeDefined: () => check(actual !== undefined, 'toBeDefined()'),
    toBeUndefined: () => check(actual === undefined, 'toBeUndefined()'),
    toBeNull: () => check(actual === null, 'toBeNull()'),
    toBeTruthy: () => check(Boolean(actual), 'toBeTruthy()'),
    toBeFalsy: () => check(!actual, 'toBeFalsy()'),
    toContain: (e) => check(actual != null && typeof actual.includes === 'function' && actual.includes(e), `toContain(${show(e)})`),
    toMatch: (re) => check(typeof actual === 'string' && (typeof re === 'string' ? actual.includes(re) : new RegExp(re.source, re.flags.replace('g', '')).test(actual)), `toMatch(${show(re)})`),
    toHaveLength: (n) => check(actual != null && actual.length === n, `toHaveLength(${n})`),
    toBeGreaterThan: (n) => check(actual > n, `toBeGreaterThan(${n})`),
    toBeGreaterThanOrEqual: (n) => check(actual >= n, `toBeGreaterThanOrEqual(${n})`),
    toBeLessThan: (n) => check(actual < n, `toBeLessThan(${n})`),
    toBeLessThanOrEqual: (n) => check(actual <= n, `toBeLessThanOrEqual(${n})`),
    toThrow: (e) => {
      let threw = false, err;
      try { actual(); } catch (x) { threw = true; err = x; }
      const ok = threw && (e === undefined || (e instanceof RegExp ? e.test(String(err && err.message)) : String(err && err.message).includes(String(e))));
      check(ok, `toThrow(${e === undefined ? '' : show(e)})`);
    },
  };
};
const expect = (actual) => Object.assign(makeMatchers(actual, false), { not: makeMatchers(actual, true) });

Object.assign(globalThis, { describe, it: test, test, expect, beforeAll: hook('beforeAll'), afterAll: hook('afterAll'), beforeEach: hook('beforeEach'), afterEach: hook('afterEach') });

// ---- 執行 ----
const results = { pass: 0, fail: 0, skip: 0, failures: [] };
const eachHooks = (s, k) => { const list = []; for (let p = s; p; p = p.parent) list.unshift(...p[k]); return k === 'afterEach' ? list.reverse() : list; };
async function runSuite(s, depth) {
  const pad = '  '.repeat(depth);
  if (s.name) console.log(`${pad}${s.name}`);
  try { for (const h of s.beforeAll) await h(); } catch (e) {
    results.fail++; results.failures.push({ name: `${s.name} (beforeAll)`, e }); console.log(`${pad}  ✗ beforeAll: ${e.message}`); return;
  }
  for (const c of s.children) {
    if (c.kind === 'suite') { await runSuite(c.suite, depth + 1); continue; }
    if (c.kind === 'skip') { results.skip++; console.log(`${pad}  - ${c.name} (skip)`); continue; }
    try {
      for (const h of eachHooks(s, 'beforeEach')) await h();
      await c.fn();
      for (const h of eachHooks(s, 'afterEach')) await h();
      results.pass++; console.log(`${pad}  ✓ ${c.name}`);
    } catch (e) {
      results.fail++; results.failures.push({ name: c.name, e }); console.log(`${pad}  ✗ ${c.name}\n${pad}    ${e && e.message}`);
    }
  }
  for (const h of s.afterAll) await h();
}

(async () => {
  const files = process.argv.slice(2);
  if (!files.length) { console.error('usage: node tests/support/jest-style-runner.cjs <test file…>'); process.exit(2); }
  for (const f of files) require(path.resolve(process.cwd(), f));
  await runSuite(rootSuite, 0);
  console.log(`\n${results.fail ? 'FAIL' : 'PASS'}  ${results.pass} passed, ${results.fail} failed, ${results.skip} skipped  (${files.join(', ')})`);
  process.exit(results.fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });