const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the real components and their click handlers. Network outcomes are
// controlled; no visits or likes are sent to a customer's live counters.
async function run(file, outcome, buttonIndex = 0) {
  const states = [];
  const storage = new Map();
  const react = {
    useState(value) {
      const index = states.length;
      states.push(value);
      return [value, next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
    },
    useRef: value => ({ current: value }),
    useCallback: value => value,
    useMemo: fn => fn(),
    useEffect() {},
  };
  const jsx = (type, props) => ({ type, props });
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === '@/lib/trust-counter-floors') return {
        AI_LIKE_FLOOR: 356, AI_SUGGESTION_FLOOR: 36,
        HOME_TRUST_FLOORS: { agree: 714, disagree: 74, view: 110397 },
        monotonicCount: (...values) => Math.max(0, ...values),
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    window: {
      localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
      setTimeout(fn, delay) { if (delay === 650) fn(); return 1; },
      clearTimeout() {},
    },
    document: { cookie: '' }, navigator: { sendBeacon: () => outcome === 'queued' },
    crypto: { randomUUID: () => 'a1111111-1111-4111-8111-111111111111' },
    AbortController, Blob,
    fetch: async () => {
      if (outcome === 'failed' || outcome === 'queued') throw new Error('offline');
      return { ok: true, json: async () => ({ ok: true, totalCount: 500, agreeCount: 800, disagreeCount: 90, viewCount: 110500, applied: true, didLike: true, didSend: true }) };
    },
  });
  const tree = module.exports.default({});
  const buttons = [];
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.type === 'button' && node.props.onClick) buttons.push(node);
    walk(node.props?.children);
  }
  walk(tree);
  const before = states.slice();
  await buttons[buttonIndex].props.onClick();
  return { states, before };
}

(async () => {
  for (const outcome of ['failed', 'queued']) {
    for (const index of [0, 1]) {
      const result = await run('components/AiTrustFeedback.tsx', outcome, index);
      assert.equal(result.states[0], result.before[0], `${outcome}: likes must not increase`);
      assert.equal(result.states[1], result.before[1], `${outcome}: suggestions must not increase`);
      assert.equal(result.states[2], null, 'unconfirmed operation must not appear accepted');
      assert.equal(result.states[5].tone, 'error', 'unconfirmed operation must not show success');
    }
  }
  const failedLike = await run('components/AiLikeFeedback.tsx', 'failed');
  assert.equal(failedLike.states[0], failedLike.before[0]);
  assert.equal(failedLike.states[1], false);
  // 首頁信任區讀新 API 的 agreeCount（地板 714，所以用 800 驗證）；AiLikeFeedback 仍讀 totalCount。
  for (const [file, expected] of [['components/AiTrustFeedback.tsx', 800], ['components/AiLikeFeedback.tsx', 500]]) {
    const result = await run(file, 'confirmed');
    assert.equal(result.states[0], expected, 'display the acknowledged server total, without adding another vote');
  }
  // 不認同按鈕：確認後顯示伺服器回的 disagreeCount，認同數不動。
  const dislike = await run('components/AiTrustFeedback.tsx', 'confirmed', 1);
  assert.equal(dislike.states[1], 90, 'dislike shows the acknowledged server total');
  assert.equal(dislike.states[0], dislike.before[0], 'dislike must not change the like count');
  console.log('PASS: real feedback handlers preserve totals on failure and queued delivery, and display only acknowledged increments');
})().catch(error => { console.error(error); process.exitCode = 1; });
