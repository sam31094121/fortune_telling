// Exercise the real page handlers with a small hook harness; browser QA covers focus/geometry.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const load = require('./helpers/load-iching-shensha-ui.cjs');
const { dualChartHourStatus } = load('lib/dual-chart-form.ts');
const BirthForm = () => null;
const Card = () => null;
let cursor = 0;
const states = [];
const effects = [];
let pendingEffects = [];
let unlocked = true;
const listeners = new Map();
const timers = new Map();
let timerId = 0;
const router = { refresh() {} };
const hooks = {
  ...React, useMemo: fn => fn(), useCallback: fn => fn,
  useRef(initial) { const index = cursor++; return states[index] ??= { current: initial }; },
  useEffect(fn, deps) {
    const index = cursor++;
    if (!effects[index] || deps.some((x, i) => !Object.is(x, effects[index].deps[i]))) {
      pendingEffects.push(() => { effects[index]?.cleanup?.(); effects[index] = { deps, cleanup: fn() }; });
    }
  },
  useState(initial) {
    const index = cursor++;
    if (!(index in states)) states[index] = initial;
    return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
  },
};
let send;
let requests = 0;
const target = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/ghost-asura/GhostAsuraPageClient.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, {
  module: target, exports: target.exports, console: { error() {} }, AbortController,
  window: {
    addEventListener: (key, fn) => listeners.set(key, fn),
    removeEventListener: key => listeners.delete(key),
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; },
    clearTimeout: id => timers.delete(id),
    matchMedia: () => ({ matches: true }),
  },
  fetch: (...args) => { requests++; return send(...args); },
  require(id) {
    if (id === 'react') return hooks;
    if (id === 'next/navigation') return { useRouter: () => router };
    if (id === 'next/link') return () => null;
    if (id.endsWith('.module.css')) return {};
    if (id === '@/components/UnifiedBirthForm') return { UnifiedBirthForm: BirthForm };
    if (id === '@/features/ghost-asura/components/GhostAsuraCard') return { GhostAsuraCard: Card };
    if (id === '@/lib/dual-chart-form') return { dualChartHourStatus };
    return require(id);
  },
});
function render() {
  cursor = 0;
  const tree = target.exports.default({ unlocked, configured: true });
  const queued = pendingEffects; pendingEffects = []; queued.forEach(fn => fn());
  return tree;
}
function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return undefined;
  if (predicate(tree)) return tree;
  for (const child of React.Children.toArray(tree.props?.children)) {
    const hit = find(child, predicate);
    if (hit) return hit;
  }
}
const form = () => find(render(), item => item.type === BirthForm);
const result = () => find(render(), item => item.props?.['data-ghost-asura-result'] === 'ready');
const tick = () => new Promise(resolve => setImmediate(resolve));
const ready = { birthDate: '1990-01-01', gender: 'male', birthHourBranch: 'wu', birthTime: '11:30' };
(async () => {
  form().props.onChange(ready);
  send = async () => ({ ok: true, status: 200, json: async () => ({ data: { contract: 'ghost-asura-display/v1', fixture: 'A' } }) });
  form().props.onSubmit(ready);
  assert.equal(find(render(), item => item.type === 'fieldset').props.disabled, true, 'All choices lock during request');
  await tick();
  assert.ok(result());
  form().props.onChange({ ...ready });
  assert.ok(result(), 'A no-op blur must not erase the chart');
  const changed = { ...ready, birthDate: '1990-02-09' };
  form().props.onChange(changed);
  assert.equal(result(), undefined, 'Changed birth data must remove stale result immediately');
  form().props.onSubmit(changed);
  await tick();
  assert.ok(result());
  const unknown = { ...changed, timeUnknown: true, birthHourBranch: 'unknown' };
  form().props.onChange(unknown);
  const before = requests;
  form().props.onSubmit(unknown);
  await tick();
  assert.equal(requests, before, 'Unknown hour never calls the calculation endpoint');
  assert.equal(result(), undefined);
  assert.match(find(render(), item => item.props?.role === 'alert').props.children, /阿修羅秘卷/);
  form().props.onChange(ready);
  send = async () => { throw new Error('連線失敗，請稍後再試。'); };
  form().props.onSubmit(ready);
  await tick();
  assert.equal(result(), undefined, 'Failed requests never keep or fabricate a result');
  assert.equal(form().props.disabled, false, 'Retry is available after an error');
  assert.match(find(render(), item => item.props?.role === 'alert').props.children, /連線失敗/);
  assert.equal(form().props.value.birthDate, ready.birthDate, 'Failed request does not erase the form');

  const pending = [];
  send = (url, options) => new Promise((resolve, reject) => pending.push({ resolve, reject, options }));
  const succeed = (request, fixture) => request.resolve({ ok: true, status: 200, json: async () => ({ data: { contract: 'ghost-asura-display/v1', fixture } }) });
  const currentFixture = () => find(render(), x => x.type === Card)?.props.display.fixture;
  const submit = form().props.onSubmit;
  const calls = requests;
  submit(ready); submit(ready);
  assert.equal(requests - calls, 1, 'Same-render double click must send exactly one request');
  form().props.onChange(changed);
  assert.equal(pending[0].options.signal.aborted, true, 'Input change aborts transport');
  form().props.onSubmit(changed);
  succeed(pending[1], 'new'); await tick();
  succeed(pending[0], 'old'); await tick(); // even an abort-ignoring transport cannot revive it
  assert.equal(currentFixture(), 'new', 'Late old result cannot replace current result');

  form().props.onSubmit(changed);
  const stale = pending[2];
  form().props.onChange(ready);
  form().props.onSubmit(ready);
  stale.reject(new Error('OLD ERROR')); await tick();
  assert.equal(form().props.disabled, true, 'Old finally cannot unlock a newer request');
  assert.equal(find(render(), x => x.props?.role === 'alert'), undefined, 'Old error cannot pollute current form');
  succeed(pending[3], 'latest'); await tick();
  assert.equal(currentFixture(), 'latest');
  form().props.onSubmit(ready);
  listeners.get('pageshow')();
  succeed(pending[4], 'before-refresh'); await tick();
  assert.equal(result(), undefined, 'Page restoration invalidates in-flight result');
  form().props.onSubmit(ready);
  [...timers.values()][0]();
  succeed(pending[5], 'expired'); await tick();
  assert.equal(result(), undefined, 'Expired session cannot revive result');
  form().props.onSubmit(ready);
  unlocked = false; render();
  succeed(pending[6], 'locked'); await tick();
  unlocked = true; render();
  assert.equal(result(), undefined, 'Relocking then unlocking never revives a previous request');
  form().props.onSubmit(ready);
  effects.forEach(effect => effect?.cleanup?.());
  succeed(pending[7], 'unmounted'); await tick();
  assert.equal(result(), undefined, 'Unmounted request is invalidated');
  console.log('PASS: actual page handlers, no-op input, retry, unknown time, double submit, abort-ignoring stale success/error/finally, pageshow, expiry, lock and unmount');
})().catch(error => { console.error(error); process.exitCode = 1; });
