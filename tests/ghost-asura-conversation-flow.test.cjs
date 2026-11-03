// Execute actual component handlers with delayed transports, including transports ignoring abort.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
let cursor = 0;
const states = [], effects = [], pending = [];
const requests = [];
const timers = new Map();
let nextTimer = 0;
function expireTimer() {
  assert.equal(timers.size, 1, 'exactly one deadline per active request');
  const [id, timer] = [...timers][0];
  assert.equal(timer.delay, 30000);
  timers.delete(id);
  timer.callback();
}
let birthInput = { birthDate: '1974-06-28', birthTime: '17:30', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei' };
const hooks = {
  ...React,
  useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], v => { states[i] = typeof v === 'function' ? v(states[i]) : v; }]; },
  useRef(initial) { const i = cursor++; return states[i] ??= { current: initial }; },
  useEffect(fn, deps) { const i = cursor++; if (!effects[i] || deps.some((v, j) => !Object.is(v, effects[i].deps[j]))) pending.push(() => { effects[i]?.cleanup?.(); effects[i] = { deps, cleanup: fn() }; }); },
};
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/ghost-asura/skill/AsuraConversation.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, {
  module: mod, exports: mod.exports, AbortController,
  setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; },
  clearTimeout(id) { timers.delete(id); },
  fetch: (url, options) => new Promise((resolve, reject) => requests.push({ url, options, resolve, reject })),
  require(id) { if (id === 'react') return hooks; if (id.endsWith('.module.css')) return {}; return require(id); },
});
function render() { cursor = 0; const tree = mod.exports.default({ birthInput }); while (pending.length) pending.shift()(); return tree; }
function nodes(node) { if (!node || typeof node !== 'object') return []; return [node, ...React.Children.toArray(node.props?.children).flatMap(nodes)]; }
const get = predicate => nodes(render()).find(predicate);
const button = () => get(n => n.type === 'button');
const tick = () => new Promise(resolve => setImmediate(resolve));
function finish(request, answer = '後端真實內容', status = 'READY') {
  const body = JSON.parse(request.options.body);
  const number = { summary: 1, why: 2, action: 3 }[body.intent];
  request.resolve({ ok: true, json: async () => ({ status, topic: body.topic, intent: body.intent, answer, scopeNote: '後端範圍說明', step: { number, total: 3, label: ['結論', '依據', '行動'][number - 1], complete: number === 3 }, options: number === 1 ? [{ id: 'intent:why', label: '看依據' }] : number === 2 ? [{ id: 'intent:action', label: '看行動提醒' }] : [{ id: 'topic:past', label: '看過去' }] }) });
}
(async () => {
  render(); assert.equal(requests.length, 0, 'no automatic followup request');
  const click = button().props.onClick; click(); click();
  assert.equal(requests.length, 1, 'same-render double click is deduplicated');
  assert.equal(button().props.disabled, true);
  assert.deepEqual(JSON.parse(requests[0].options.body).birthInput, birthInput);
  finish(requests[0]); await tick();
  assert.equal(timers.size, 0, 'success clears deadline');
  assert.equal(get(n => n.props?.['data-asura-conversation-answer'] === true).props.children, '後端真實內容');
  assert.equal(get(n => n.props?.['data-asura-conversation-step'] === 1).props.children[4], '結論');
  button().props.onClick();
  assert.equal(JSON.parse(requests.at(-1).options.body).intent, 'why', 'first server option advances to actual basis');
  finish(requests.at(-1)); await tick();
  button().props.onClick();
  assert.equal(JSON.parse(requests.at(-1).options.body).intent, 'action', 'second server option advances to action');
  finish(requests.at(-1)); await tick();
  assert.equal(nodes(render()).filter(n => n.props?.['data-asura-conversation-scope'] === true).length, 3, 'each answer preserves its own scope notice');
  for (let i = 0; i < 8; i++) { button().props.onClick(); finish(requests.at(-1), `answer-${i}`); await tick(); }
  assert.equal(nodes(render()).filter(n => n.type === 'li').length, 6, 'history bounded to six');
  button().props.onClick(); const old = requests.at(-1);
  birthInput = { ...birthInput, birthDate: '1990-02-15' }; render(); render();
  assert.equal(timers.size, 0, 'customer reset clears deadline');
  assert.equal(old.options.signal.aborted, true);
  assert.equal(nodes(render()).filter(n => n.type === 'li').length, 0, 'customer change clears history');
  button().props.onClick(); const current = requests.at(-1);
  old.reject(new Error('old error')); await tick();
  assert.equal(button().props.disabled, true, 'old finally cannot unlock new request');
  assert.equal(get(n => n.props?.role === 'alert'), undefined);
  finish(current, 'new customer'); await tick();
  assert.equal(get(n => n.props?.['data-asura-conversation-answer'] === true).props.children, 'new customer');
  button().props.onClick();
  finish(requests.at(-1), '這段目前沒有可對應的依據。', 'UNAVAILABLE'); await tick();
  assert.equal(nodes(render()).filter(n => n.props?.['data-asura-conversation-answer'] === true).at(-1).props.children, '這段目前沒有可對應的依據。', 'missing basis is displayed honestly without substituted answer');
  button().props.onClick(); const stuck = requests.at(-1);
  expireTimer();
  assert.equal(stuck.options.signal.aborted, true);
  assert.equal(button().props.disabled, false, 'timeout releases busy without transport cooperation');
  assert.match(get(n => n.props?.role === 'alert').props.children, /等待過久/);
  button().props.onClick(); const retry = requests.at(-1);
  const beforeLate = nodes(render()).filter(n => n.type === 'li').length;
  finish(stuck, 'late timed out result'); await tick();
  assert.equal(button().props.disabled, true, 'late timed-out finally cannot release retry');
  assert.equal(nodes(render()).filter(n => n.type === 'li').length, beforeLate);
  assert.equal(timers.size, 1, 'late finally cannot clear retry timer');
  retry.reject(new TypeError('Failed to fetch')); await tick();
  assert.equal(timers.size, 0);
  assert.equal(button().props.disabled, false, 'offline rejection allows manual retry');
  button().props.onClick(); const slowJson = requests.at(-1);
  let resolveJson;
  slowJson.resolve({ ok: true, json: () => new Promise(resolve => { resolveJson = resolve; }) });
  await tick(); expireTimer();
  assert.equal(button().props.disabled, false, 'deadline also includes JSON read');
  button().props.onClick(); const recovered = requests.at(-1);
  resolveJson({}); await tick();
  assert.equal(button().props.disabled, true);
  finish(recovered, 'recovered'); await tick();
  assert.equal(timers.size, 0);
  button().props.onClick(); const unmounted = requests.at(-1);
  effects.forEach(e => e?.cleanup?.());
  assert.equal(timers.size, 0, 'unmount clears deadline');
  const snapshot = JSON.stringify(states);
  finish(unmounted, 'too late'); await tick();
  assert.equal(unmounted.options.signal.aborted, true);
  assert.equal(JSON.stringify(states), snapshot, 'unmounted response cannot mutate state');
  console.log('PASS: conversation opt-in, deduplication, history cap, customer reset, stale errors, unmount');
})().catch(error => { console.error(error); process.exitCode = 1; });
