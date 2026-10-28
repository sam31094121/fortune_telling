// Run actual page handlers; control only hooks, transport and browser lifetime.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const load = require('./helpers/load-iching-shensha-ui.cjs');
const source = ts.transpileModule(fs.readFileSync('app/numerology/page.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const tick = () => new Promise(resolve => setImmediate(resolve));
const fixture = value => ({ ok: true, value, matrix: {},
  crossVerdict: { version: 'number-cross-verdict-v1', score: 50, matrix: { score: 50, weight: 60, contribution: 30 }, iching: { score: 50, weight: 40, contribution: 20, signalSummary: 'test' } },
  iching: { kingWen: 1, chainScore: 50, digitReadings: [], crossChain: [] },
});
function mount() {
  let cursor = 0, tree, dirty = true, identity = 'guest', growthCalls = 0;
  const hooks = [], queue = [], requests = [], timers = new Map(), listeners = new Map();
  let timerId = 0;
  const jsx = (type, props) => ({ type, props: props || {} });
  const react = {
    useState(initial) { const i = cursor++; if (!hooks[i]) hooks[i] = { value: initial }; return [hooks[i].value, next => {
      const value = typeof next === 'function' ? next(hooks[i].value) : next;
      if (!Object.is(value, hooks[i].value)) { hooks[i].value = value; dirty = true; }
    }]; },
    useRef(initial) { const i = cursor++; return hooks[i] ??= { current: initial }; },
    useMemo(fn) { return fn(); },
    useCallback(fn, deps) { const i = cursor++, old = hooks[i]; if (!old || deps.some((d,j) => !Object.is(d,old.deps[j]))) hooks[i] = { deps, fn }; return hooks[i].fn; },
    useEffect(fn, deps) { const i = cursor++, old = hooks[i]; if (!old || !deps || deps.some((d,j) => !Object.is(d, old.deps[j]))) {
      hooks[i] = { deps, cleanup: old?.cleanup }; queue.push(() => { hooks[i].cleanup?.(); hooks[i].cleanup = fn(); });
    } },
  };
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, AbortController, TypeError, console,
    window: {
      localStorage: { getItem: () => null },
      addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
      removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
      setTimeout(fn) { timers.set(++timerId, fn); return timerId; }, clearTimeout(id) { timers.delete(id); },
    },
    fetch(url, options) { return new Promise((resolve, reject) => requests.push({ url, options, resolve, reject })); },
    require(id) {
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (id === '@/lib/identity-split-client') return { getAnalysisIdentityTarget: () => identity, getIdentityRequiredMessage: () => '選擇對象', IDENTITY_TARGET_UPDATED_EVENT: 'identity' };
      if (id === '@/lib/growth-center-client') return { markGrowthModuleCompleted: () => growthCalls++ };
      if (id.startsWith('@/lib/')) return load(id.slice(2) + '.ts');
      if (id.startsWith('@/components/') || id === 'next/link') return () => null;
      return require(id);
    },
  });
  function render() {
    for (let n = 0; n < 20; n++) {
      dirty = false; cursor = 0; tree = module.exports.default();
      while (queue.length) queue.shift()();
      if (!dirty) return tree;
    }
    throw new Error('Render did not settle');
  }
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const child of node) { const found = find(child, predicate); if (found) return found; } return; }
    if (predicate(node)) return node;
    return find(node.props?.children, predicate);
  }
  const button = name => find(render(), n => n.type === 'button' && n.props.children === name);
  return {
    requests, timers,
    edit(value) { find(render(), n => n.props?.['aria-label'] === '輸入數字').props.onChange({ target: { value } }); render(); },
    submit() { return button('30 秒看數字訊號').props.onClick(); },
    submitHandler() { return button('30 秒看數字訊號').props.onClick; },
    result(value) { return Boolean(find(render(), n => n.type === 'span' && n.props.children === value)); },
    busy() { return Boolean(button('易經正在完成判定')); },
    error() { return find(render(), n => n.props?.role === 'alert')?.props.children; },
    input() { return find(render(), n => n.props?.['aria-label'] === '輸入數字').props.value; },
    changeIdentity(next) { identity = next; for (const fn of listeners.get('identity') ?? []) fn(); render(); },
    unmount() { hooks.forEach(h => h?.cleanup?.()); },
    growthCalls: () => growthCalls,
    success(index, value) { requests[index].resolve({ ok: true, json: async () => fixture(value) }); },
    fail(index) { requests[index].reject(new Error('synthetic connection failure')); },
  };
}
test('editing completed number removes the old answer', async () => {
  const p = mount(); p.edit('2559'); const run = p.submit(); p.success(0,'2559'); await run;
  assert.ok(p.result('2559')); p.edit('1688'); assert.equal(p.result('2559'),false);
});
test('late success, error and finally cannot replace the newer request', async () => {
  for (const failOld of [false,true]) {
    const p = mount(); p.edit('2559'); const a = p.submit(); p.edit('1688');
    assert.ok(p.requests[0].options.signal.aborted); const b = p.submit();
    failOld ? p.fail(0) : p.success(0,'2559'); await a;
    assert.equal(p.result('2559'),false); assert.ok(p.busy()); assert.equal(p.error(),undefined);
    p.success(1,'1688'); await b; assert.ok(p.result('1688')); assert.equal(p.busy(),false);
  }
});
test('same-render double submission sends only once', async () => {
  const p = mount(); p.edit('2559'); const submit = p.submitHandler(); const a = submit(), b = submit();
  assert.equal(p.requests.length,1); p.success(0,'2559'); await Promise.all([a,b]);
});
test('identity change and unmount cancel pending work without growth writes', async () => {
  for (const action of ['identity','unmount']) {
    const p = mount(); p.edit('2559'); const a = p.submit();
    action === 'identity' ? p.changeIdentity('self') : p.unmount();
    assert.ok(p.requests[0].options.signal.aborted); p.success(0,'2559'); await a;
    assert.equal(p.growthCalls(),0); assert.equal(p.timers.size,0);
  }
});
test('failure keeps input and permits retry; editing during JSON parsing cancels stale data', async () => {
  const p = mount(); p.edit('2559'); const a = p.submit(); p.fail(0); await a;
  assert.equal(p.input(),'2559'); assert.equal(p.busy(),false); assert.ok(p.error());
  const b = p.submit(); let finish;
  p.requests[1].resolve({ ok: true, json: () => new Promise(resolve => { finish = resolve; }) }); await tick();
  p.edit('1688'); finish(fixture('2559')); await b;
  assert.equal(p.result('2559'),false); assert.equal(p.input(),'1688'); assert.equal(p.busy(),false);
});
test('timeout cannot accept an abort-ignoring response, and retry remains available', async () => {
  const p = mount(); p.edit('2559'); const run = p.submit();
  [...p.timers.values()][0](); p.success(0,'2559'); await run;
  assert.equal(p.result('2559'),false); assert.match(p.error(),/等太久/); assert.equal(p.busy(),false);
  const retry = p.submit(); p.success(1,'2559'); await retry; assert.ok(p.result('2559'));
  p.unmount(); assert.equal(p.timers.size,0);
});
