// Real skill-form handlers: late responses must not outlive the form.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const React = require('react');
const states = [];
const cleanups = [];
let cursor = 0;
let display = null;
let writes = 0;
let requests = [];
const hooks = {
  ...React,
  useState(initial) {
    const i = cursor++;
    if (!(i in states)) states[i] = initial;
    return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }];
  },
  useRef(initial) { const i = cursor++; return states[i] ??= { current: initial }; },
  useEffect(fn) { const i = cursor++; if (!(i in states)) { states[i] = true; cleanups.push(fn()); } },
};
const moduleObject = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/ghost-asura/skill/AsuraSkillReading.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, {
  module: moduleObject, exports: moduleObject.exports, AbortController,
  fetch: (_url, options) => new Promise((resolve, reject) => requests.push({ options, resolve, reject })),
  require(id) {
    if (id === 'react') return hooks;
    if (id === 'react/jsx-runtime') return require(id);
    if (id.endsWith('.module.css')) return {};
    if (id.includes('/GhostAsuraCard')) return { GhostAsuraCard: () => null, GhostAsuraCardShell: () => null };
    if (id.includes('asura-display-alias')) return { asuraScrub: text => text };
    if (id === './AsuraReadingContext') return { useAsuraReading: () => ({ display, setDisplay(value) { display = value; writes++; } }) };
    throw new Error(id);
  },
});
function render() { cursor = 0; return moduleObject.exports.default(); }
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...React.Children.toArray(node.props?.children).flatMap(nodes)];
}
function get(predicate) { return nodes(render()).find(predicate); }
function fill(name, value) { get(n => n.props?.name === name).props.onChange({ target: { value } }); }
function submit() { return get(n => n.type === 'form').props.onSubmit({ preventDefault() {} }); }
function response(name) { return { ok: true, json: async () => ({ data: { contract: 'ghost-asura-display/v1', targetName: name } }) }; }
(async () => {
  await submit();
  assert.equal(requests.length, 0, 'missing data does not start calculation');
  fill('birthDate', '1974-06-28');
  fill('birthTime', '17:30');
  get(n => n.props?.name === 'gender' && n.props.value === 'male').props.onChange();
  const first = submit();
  await submit();
  assert.equal(requests.length, 1, 'double submit creates only one request');
  fill('birthDate', '1990-02-15');
  assert.equal(requests[0].options.signal.aborted, true);
  const second = submit();
  requests[1].resolve(response('second'));
  await second;
  requests[0].resolve(response('first'));
  await first;
  assert.equal(display.targetName, 'second', 'late first customer cannot replace second customer');
  fill('birthDate', '1974-06-28');
  const third = submit();
  render();
  for (const cleanup of cleanups) cleanup?.();
  const writesAtUnmount = writes;
  requests[2].resolve(response('after-unmount'));
  await third;
  assert.equal(requests[2].options.signal.aborted, true, 'unmount must cancel the request');
  assert.equal(writes, writesAtUnmount, 'late response must not update shared result after unmount');
  console.log('PASS: skill form missing input, double submit, changed customer, stale response and unmount');
})().catch(error => { console.error(error); process.exitCode = 1; });
