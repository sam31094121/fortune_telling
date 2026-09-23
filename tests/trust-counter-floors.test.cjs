async function main() {
  const base = 'http://127.0.0.1:8888';
  const get = async (u) => (await fetch(u, { cache: 'no-store' })).json();
  const post = async (u, b) => (await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b), cache: 'no-store' })).json();
  const v0 = await get(base + '/api/visitor/record?featureKey=home');
  const v1 = await post(base + '/api/visitor/record', { featureKey: 'home', visitId: 'floor-test-' + Date.now() });
  const l0 = await get(base + '/api/ai-like');
  const l1 = await post(base + '/api/ai-like', {});
  const s0 = await get(base + '/api/ai-suggestion');
  const s1 = await post(base + '/api/ai-suggestion', {});
  const out = { visitor: [v0.displayCount, v1.displayCount], like: [l0.totalCount, l1.totalCount], sug: [s0.totalCount, s1.totalCount] };
  console.log(JSON.stringify(out, null, 2));
  if (v0.displayCount < 110128 || v1.displayCount < v0.displayCount) throw new Error('visitor floor/monotonic fail');
  if (l0.totalCount < 356 || l1.totalCount < l0.totalCount) throw new Error('like floor/monotonic fail');
  if (s0.totalCount < 36 || s1.totalCount < s0.totalCount) throw new Error('sug floor/monotonic fail');
  console.log('PASS floors+monotonic');
}
main().catch((e) => { console.error(e); process.exit(1); });