const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Isolate data dir by monkeypatching via temp copy of module is heavy;
// instead unit-test the normalize formula we rely on.
function normalize(displayCount, visitIds) {
  const ids = Array.from(new Set(visitIds.filter((x) => typeof x === 'string'))).slice(-5000);
  return Math.max(displayCount, ids.length, 0);
}

assert.equal(normalize(2025, Array.from({length: 100}, (_,i)=>String(i))), 2025, 'must not shrink to visitIds');
assert.equal(normalize(10, Array.from({length: 50}, (_,i)=>String(i))), 50, 'can rise with visitIds');
assert.equal(normalize(50, Array.from({length: 50}, (_,i)=>String(i))), 50);

// Live API monotonic probe
async function probe() {
  const base = 'http://127.0.0.1:8888';
  async function get(url) {
    const r = await fetch(url, { cache: 'no-store' });
    return r.json();
  }
  async function post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
    return r.json();
  }
  const v0 = await get(`${base}/api/visitor/record?featureKey=home`);
  const v1 = await post(`${base}/api/visitor/record`, { featureKey: 'home', visitId: `test-${Date.now()}-${Math.random()}` });
  assert.ok(v1.ok);
  assert.ok(v1.displayCount >= v0.displayCount, `visitor must not drop ${v0.displayCount} -> ${v1.displayCount}`);
  const l0 = await get(`${base}/api/ai-like`);
  const l1 = await post(`${base}/api/ai-like`, {});
  assert.ok(l1.ok);
  assert.ok(l1.totalCount >= l0.totalCount, `like must not drop ${l0.totalCount} -> ${l1.totalCount}`);
  const s0 = await get(`${base}/api/ai-suggestion`);
  const s1 = await post(`${base}/api/ai-suggestion`, {});
  assert.ok(s1.ok);
  assert.ok(s1.totalCount >= s0.totalCount, `suggestion must not drop ${s0.totalCount} -> ${s1.totalCount}`);
  console.log(JSON.stringify({
    visitor: { before: v0.displayCount, after: v1.displayCount },
    like: { before: l0.totalCount, after: l1.totalCount, didLike: l1.didLike },
    improve: { before: s0.totalCount, after: s1.totalCount, didSend: s1.didSend },
  }, null, 2));
  console.log('PASS trust-counter-monotonic');
}
probe().catch((e) => { console.error(e); process.exit(1); });