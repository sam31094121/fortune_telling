const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

// Execute the actual component and handlers. Only React's hook scheduler,
// child components, the browser and network are controlled by this harness.
const source = ts.transpileModule(fs.readFileSync('app/dual-chart/DualChart.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const formSource = ts.transpileModule(fs.readFileSync('lib/dual-chart-form.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const profile = { birthDate: '1990-01-01', gender: 'male', birthHourBranch: 'mao', birthTime: '05:30' };
const nextProfile = { ...profile, birthDate: '1995-02-23', gender: 'female' };
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function mount() {
  let cursor = 0, tree, props = { unlocked: true, configured: true };
  const hooks = [], effects = [], network = [], timers = new Map(), listeners = new Map();
  const router = { refresh() {} };
  const jsx = (type, props) => ({ type, props: props || {} });
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!hooks[i]) hooks[i] = { value: initial };
      return [hooks[i].value, next => { hooks[i].value = typeof next === 'function' ? next(hooks[i].value) : next; }];
    },
    useRef(initial) { const i = cursor++; return hooks[i] ??= { current: initial }; },
    useEffect(fn, deps) {
      const i = cursor++, old = hooks[i];
      if (!old || !deps || deps.some((d, j) => !Object.is(d, old.deps[j]))) {
        hooks[i] = { deps, cleanup: old?.cleanup };
        effects.push(() => { hooks[i].cleanup?.(); hooks[i].cleanup = fn(); });
      }
    },
  };
  const formModule = { exports: {} };
  vm.runInNewContext(formSource, { module: formModule, exports: formModule.exports });
  const module = { exports: {} };
  const window = {
    innerWidth: 390,
    addEventListener(name, fn) { listeners.set(name, fn); },
    removeEventListener(name, fn) { if (listeners.get(name) === fn) listeners.delete(name); },
    setTimeout(fn) { const id = timers.size + 1; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  vm.runInNewContext(source, { module, exports: module.exports, window, AbortController, DOMException, URL,
    fetch(url, options) { const d = deferred(); network.push({ ...d, url, options }); return d.promise; },
    require(id) {
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
      if (id === 'next/navigation') return { useRouter: () => router };
      if (id === '@/components/InterfaceLanguage') return { useInterfaceLanguage: () => ({ language: 'zh-Hant' }) };
      if (id === '@/components/UnifiedBirthForm') return { UnifiedBirthForm: 'BirthForm' };
      if (id === '@/lib/dual-chart-form') return formModule.exports;
      if (id.endsWith('.module.css')) return {};
      if (id === './BaziIChingShenShaCard') return { __esModule: true, default: 'ResultCard' };
      return {};
    },
  });
  function render(nextProps) {
    props = { ...props, ...nextProps };
    cursor = 0; tree = module.exports.default(props);
    while (effects.length) effects.shift()();
    return tree;
  }
  function nodes(node = tree) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(n => nodes(n));
    return [node, ...nodes(node.props?.children ?? null)];
  }
  const get = type => nodes().find(n => n.type === type);
  render();
  return {
    render, network,
    submit(value = profile) { render(); get('BirthForm').props.onSubmit(value); render(); },
    edit(value = nextProfile) { render(); get('BirthForm').props.onChange(value); render(); },
    result() { render(); return get('ResultCard')?.props.result ?? null; },
    busy() { render(); return get('BirthForm')?.props.disabled; },
    error() { render(); return nodes().find(n => n.props?.role === 'alert')?.props.children; },
    show() { listeners.get('pageshow')?.(); render(); },
    expire() { for (const fn of [...timers.values()]) fn(); render(); },
    unmount() { for (const h of hooks) h?.cleanup?.(); },
    async resolve(index, data, status = 200) {
      network[index].resolve({ ok: status === 200, status, json: async () => status === 200 ? { data } : { error: '測試失敗' } });
      await tick(); render();
    },
  };
}

test('late response cannot replace a newer result, even if transport ignores abort', async () => {
  const app = mount(); app.submit(); app.submit(nextProfile);
  assert.equal(app.network[0].options.signal.aborted, true);
  const current = { chart: 'new' };
  await app.resolve(1, current); await app.resolve(0, { chart: 'old' });
  assert.equal(app.result(), current); assert.equal(app.busy(), false);
});
test('editing during JSON parsing invalidates the prior response', async () => {
  const app = mount(); app.submit(); const json = deferred();
  app.network[0].resolve({ ok: true, status: 200, json: () => json.promise });
  await tick(); app.edit(); json.resolve({ data: { chart: 'old' } }); await tick();
  assert.equal(app.result(), null); assert.equal(app.busy(), false);
});
test('editing a completed form cannot leave a previous customer result attached', async () => {
  const app = mount(); app.submit(); await app.resolve(0, { chart: 'old' }); app.edit();
  assert.equal(app.result(), null);
});
for (const event of ['show', 'expire']) test(`${event} cancels an in-flight chart and prevents its resurrection`, async () => {
  const app = mount(); app.submit(); app[event](); await app.resolve(0, { chart: 'stale' });
  assert.equal(app.result(), null); assert.equal(app.busy(), false);
  assert.equal(app.network[0].options.signal.aborted, true);
});
test('losing the unlocked session invalidates a pending chart', async () => {
  const app = mount(); app.submit(); app.render({ unlocked: false });
  await app.resolve(0, { chart: 'stale' }); app.render({ unlocked: true });
  assert.equal(app.result(), null); assert.equal(app.busy(), false);
});
test('incomplete resubmission cancels the old request without leaving the form busy', async () => {
  const app = mount(); app.submit(); app.submit({ ...profile, birthDate: '' });
  await app.resolve(0, { chart: 'stale' });
  assert.equal(app.result(), null); assert.equal(app.busy(), false); assert.ok(app.error());
});
test('unmount invalidates the pending response', async () => {
  const app = mount(); app.submit(); app.unmount(); await app.resolve(0, { chart: 'old' });
  assert.equal(app.result(), null);
});
test('failed latest request shows an error, never a fabricated no-hit result', async () => {
  const app = mount(); app.submit(); await app.resolve(0, null, 400);
  assert.equal(app.result(), null); assert.equal(app.busy(), false); assert.ok(app.error());
});
