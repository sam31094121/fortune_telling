// 首頁信任區計數器（認同／不認同／累計瀏覽次數）：伺服器端邏輯與前端不變量。
// 不連資料庫：以假的 Supabase 客戶端驗證。SQL 層見 tests/home-trust-sql.test.cjs。
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'server-only') return path.join(__dirname, 'helpers', 'empty-module.cjs');
  if (request.startsWith('@/')) request = path.join(ROOT, request.slice(2));
  return origResolve.call(this, request, ...rest);
};
for (const ext of ['.ts', '.tsx']) {
  Module._extensions[ext] = function (module, filename) {
    module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
      fileName: filename,
    }).outputText, filename);
  };
}

const lib = require(path.join(ROOT, 'lib/home-trust-counters.ts'));
const { HOME_TRUST_FLOORS } = require(path.join(ROOT, 'lib/trust-counter-floors.ts'));

let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); if (!ok) failed++; };
const json = async (res) => ({ status: res.status, headers: res.headers, body: await res.json() });
const post = (url, { origin, site, body, headers } = {}) => new Request(url, {
  method: 'POST',
  headers: { ...(origin ? { origin } : {}), ...(site ? { 'sec-fetch-site': site } : {}), ...(headers || {}) },
  body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
});
const URL_AGREE = 'http://localhost:8888/api/home-trust/agree';

// 假的 Supabase：記錄 rpc 呼叫，回傳預先指定的結果
function fakeClient({ rpc, table } = {}) {
  const calls = [];
  return {
    calls,
    rpc: async (name, args) => { calls.push({ name, args }); return rpc(name, args, calls); },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => table() }) }) }),
  };
}
const row = (a, d, v, applied) => ({ agree_count: a, disagree_count: d, view_count: v, ...(applied === undefined ? {} : { applied }) });

(async () => {
  // ---- 地板值單一來源
  check('地板值為 714／74／110397（規格 INITIAL_FLOOR）', HOME_TRUST_FLOORS.agree === 714 && HOME_TRUST_FLOORS.disagree === 74 && HOME_TRUST_FLOORS.view === 110397);
  check('normalizeCount：低於地板、NaN、小數、非字串都回地板；高於地板保留',
    lib.normalizeCount(10, 714) === 714 && lib.normalizeCount('abc', 74) === 74 && lib.normalizeCount(714.5, 714) === 714 && lib.normalizeCount(null, 74) === 74 && lib.normalizeCount(900, 714) === 900 && lib.normalizeCount('900', 714) === 900);

  // ---- 事件編號格式
  check('事件編號：合法格式', lib.isValidEventId('event_123e4567-e89b-12d3-a456-426614174000') && lib.isValidEventId('view_abcdef12'));
  check('事件編號：太短／太長／含空白或符號 → 不合法', !lib.isValidEventId('abc') && !lib.isValidEventId('x'.repeat(101)) && !lib.isValidEventId('has space 1234') && !lib.isValidEventId("a';drop table--") && !lib.isValidEventId(123456789));

  // ---- 跨站防護
  check('跨站：Origin 是別的網站 → 擋', lib.isCrossSiteRequest(post(URL_AGREE, { origin: 'https://evil.example' })));
  check('跨站：Origin = "null"（沙箱 iframe、data: 頁）→ 擋', lib.isCrossSiteRequest(post(URL_AGREE, { origin: 'null' })));
  check('跨站：Sec-Fetch-Site: cross-site → 擋', lib.isCrossSiteRequest(post(URL_AGREE, { site: 'cross-site' })));
  check('同源：Origin 與請求網址同主機 → 放行', !lib.isCrossSiteRequest(post(URL_AGREE, { origin: 'http://localhost:8888' })));
  check('無 Origin（舊客戶端、代理）→ 放行（不是安全邊界）', !lib.isCrossSiteRequest(post(URL_AGREE)));

  // ---- 讀取事件編號
  check('readEventId：JSON 本文', (await lib.readEventId(post(URL_AGREE, { body: { eventId: 'event_aaaaaaaa' } }))) === 'event_aaaaaaaa');
  check('readEventId：標頭 X-Idempotency-Key', (await lib.readEventId(post(URL_AGREE, { headers: { 'x-idempotency-key': 'key_bbbbbbbb' } }))) === 'key_bbbbbbbb');
  check('readEventId：空本文 → null（舊客戶端照常 +1，只是沒有去重）', (await lib.readEventId(post(URL_AGREE))) === null);
  check('readEventId：格式不對 → invalid', (await lib.readEventId(post(URL_AGREE, { body: { eventId: 'bad id!' } }))) === 'invalid');
  check('readEventId：壞掉的 JSON → invalid', (await lib.readEventId(post(URL_AGREE, { body: '{oops' }))) === 'invalid');
  check('readEventId：本文過大 → invalid', (await lib.readEventId(post(URL_AGREE, { body: { eventId: 'event_aaaaaaaa', pad: 'x'.repeat(2000) } }))) === 'invalid');
  check('readEventId：客戶端想帶 agreeCount 也只會被忽略，不會被採用', (await lib.readEventId(post(URL_AGREE, { body: { agreeCount: 999999 } }))) === null);

  // ---- incrementHomeTrust
  let c = fakeClient({ rpc: () => ({ data: [row(715, 74, 110397, true)], error: null }) });
  let r = await lib.incrementHomeTrust('agree', 'event_aaaaaaaa', c);
  check('累加：只傳「動作」與「事件編號」，不傳數字', c.calls.length === 1 && c.calls[0].name === 'home_trust_increment' && JSON.stringify(c.calls[0].args) === JSON.stringify({ p_kind: 'agree', p_event_id: 'event_aaaaaaaa' }));
  check('累加：回傳三個最新數字與 applied', r.agreeCount === 715 && r.disagreeCount === 74 && r.viewCount === 110397 && r.applied === true);

  c = fakeClient({ rpc: () => ({ data: [row(715, 74, 110397, false)], error: null }) });
  r = await lib.incrementHomeTrust('agree', 'event_aaaaaaaa', c);
  check('重複事件：applied=false，數字不再增加', r.applied === false && r.agreeCount === 715);

  c = fakeClient({ rpc: () => ({ data: row(100, 5, 7, true), error: null }) });
  r = await lib.incrementHomeTrust('view', null, c);
  check('資料庫回傳低於地板的異常值 → 一律不低於地板；單一物件格式也能解析', r.agreeCount === 714 && r.disagreeCount === 74 && r.viewCount === 110397);

  c = fakeClient({ rpc: (name) => name === 'home_trust_increment'
    ? { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.home_trust_increment' } }
    : { data: [row(800, 80, 110500)], error: null } });
  r = await lib.incrementHomeTrust('disagree', 'event_aaaaaaaa', c);
  check('遷移還沒套用：退回舊函式 increment_home_trust_disagree（不中斷服務）', c.calls.map((x) => x.name).join(',') === 'home_trust_increment,increment_home_trust_disagree' && r.disagreeCount === 80 && r.applied === true);

  c = fakeClient({ rpc: () => ({ data: null, error: { code: '23514', message: 'monotonic' } }) });
  let err = await lib.incrementHomeTrust('agree', null, c).catch((e) => e);
  check('一般資料庫錯誤：不退回舊函式、直接丟 HomeTrustUnavailableError', err instanceof lib.HomeTrustUnavailableError && c.calls.length === 1);

  c = fakeClient({ rpc: () => ({ data: [], error: null }) });
  err = await lib.incrementHomeTrust('agree', null, c).catch((e) => e);
  check('函式沒回資料：丟錯，不假裝成功', err instanceof lib.HomeTrustUnavailableError);

  err = await lib.incrementHomeTrust('agree', null, null).catch((e) => e);
  check('沒有資料庫設定：丟錯', err instanceof lib.HomeTrustUnavailableError);

  // ---- POST 處理（回應格式與狀態碼）
  c = fakeClient({ rpc: () => ({ data: [row(716, 74, 110397, true)], error: null }) });
  let out = await json(await lib.handleHomeTrustIncrement('agree', post(URL_AGREE, { origin: 'http://localhost:8888', body: { eventId: 'event_aaaaaaaa' } }), c));
  check('POST 成功：200、ok、三個數字、no-store', out.status === 200 && out.body.ok === true && out.body.agreeCount === 716 && out.body.applied === true && out.headers.get('cache-control') === 'no-store');
  check('POST 成功：事件編號有傳到資料庫', c.calls[0].args.p_event_id === 'event_aaaaaaaa');

  c = fakeClient({ rpc: () => ({ data: [row(716, 74, 110397, true)], error: null }) });
  out = await json(await lib.handleHomeTrustIncrement('agree', post(URL_AGREE, { origin: 'https://evil.example' }), c));
  check('POST 跨站：403 且完全沒碰資料庫', out.status === 403 && out.body.ok === false && c.calls.length === 0);

  out = await json(await lib.handleHomeTrustIncrement('agree', post(URL_AGREE, { body: { eventId: 'x' } }), c));
  check('POST 事件編號格式錯：400 且沒碰資料庫', out.status === 400 && c.calls.length === 0);

  c = fakeClient({ rpc: () => ({ data: null, error: { code: 'XX000', message: 'boom' } }) });
  out = await json(await lib.handleHomeTrustIncrement('view', post('http://localhost:8888/api/home-trust/view'), c));
  check('POST 資料庫失敗：503，只有訊息、沒有任何數字（不讓前端誤以為成功）', out.status === 503 && out.body.ok === false && out.body.agreeCount === undefined && /瀏覽次數/.test(out.body.message));

  out = await json(await lib.handleHomeTrustIncrement('agree', post(URL_AGREE), null));
  check('POST 沒有資料庫設定：503', out.status === 503);

  // ---- GET
  c = fakeClient({ table: () => ({ data: { agree_count: 720, disagree_count: 80, view_count: 110500 }, error: null }) });
  out = await json(await lib.handleHomeTrustRead(c));
  check('GET：回資料庫的正式數字，source=database', out.status === 200 && out.body.agreeCount === 720 && out.body.viewCount === 110500 && out.body.source === 'database' && out.headers.get('cache-control') === 'no-store');

  c = fakeClient({ table: () => ({ data: null, error: null }) });
  out = await json(await lib.handleHomeTrustRead(c));
  check('GET：資料列不存在 → 回地板值並標 source=floor（看得出是降級）', out.status === 200 && out.body.agreeCount === 714 && out.body.source === 'floor');

  c = fakeClient({ table: () => ({ data: null, error: { message: 'down' } }) });
  out = await json(await lib.handleHomeTrustRead(c));
  check('GET：資料庫錯誤 → 503，不回空陣列或 0 掩蓋', out.status === 503 && out.body.ok === false);

  // ---- 靜態不變量：路由、前端、遷移
  const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
  for (const [file, kind] of [['agree', 'agree'], ['disagree', 'disagree'], ['view', 'view']]) {
    const src = read(`app/api/home-trust/${file}/route.ts`);
    check(`路由 ${file}：只是共用處理的薄殼（沒有各自的 rpc／數字常數）`, src.includes(`handleHomeTrustIncrement('${kind}', request)`) && !/\.rpc\(|INITIAL_|normalizeCount/.test(src));
  }
  check('路由 GET：只呼叫共用讀取', /handleHomeTrustRead\(\)/.test(read('app/api/home-trust/route.ts')) && !/INITIAL_|\.rpc\(/.test(read('app/api/home-trust/route.ts')));

  const fb = read('components/AiTrustFeedback.tsx');
  check('前端：POST 帶 eventId（重試／補送共用同一個）', /body:\s*JSON\.stringify\(\{ eventId \}\)/.test(fb));
  check('前端：sendBeacon 也帶同一個 eventId', /sendBeacon\(endpoint,\s*new Blob\(\[JSON\.stringify\(\{ eventId \}\)\]/.test(fb));
  check('前端：重新取得焦點／回到分頁／重新連線時重新取得正式數字', /addEventListener\('focus', refreshCounters\)/.test(fb) && /addEventListener\('online', refreshCounters\)/.test(fb) && /addEventListener\('visibilitychange', refreshWhenVisible\)/.test(fb) && /removeEventListener\('visibilitychange', refreshWhenVisible\)/.test(fb));
  check('前端：地板值來自單一來源，沒有寫死 714／74', /HOME_TRUST_FLOORS\.agree/.test(fb) && !/=\s*714;|=\s*74;/.test(fb));
  check('前端：不以 0 初始化畫面數字', !/useState\(0\)/.test(fb));
  check('前端：不再出現「人」單位或「每來一位」', !/>\s*人\s*</.test(fb) && !fb.includes('每來一位'));
  check('前端：只增不減保護仍在（monotonicCount）', fb.includes('monotonicCount('));
  check('前端：連點保護仍在（送出中不重複送出）', /if \(submittingChoice\) return;/.test(fb));

  const fv = read('components/FeatureVisitorCounter.tsx');
  check('瀏覽計數：首頁的瀏覽事件帶 eventId', /eventId:\s*`view_\$\{visitId\.current\}`/.test(fv));
  check('瀏覽計數：不再出現「累計瀏覽人數」「每來一位」', !fv.includes('累計瀏覽人數') && !fv.includes('每來一位'));

  const mig = read('supabase/migrations/20261006170000_harden_home_trust_counters.sql');
  check('遷移：沒有任何 UPDATE／INSERT 的 RLS 策略（客戶端不得指定數字）', !/create policy/i.test(mig) && /drop policy if exists "Allow rpc increment"/.test(mig));
  check('遷移：函式只授權給 service_role', /revoke all on function public\.home_trust_increment\(text, text\) from public, anon, authenticated/.test(mig) && /grant execute on function public\.home_trust_increment\(text, text\) to service_role/.test(mig));
  check('遷移：種子只在不存在時建立（on conflict do nothing），沒有覆寫既有數字的 UPDATE', /on conflict \(id\) do nothing/.test(mig) && !/update public\.home_trust_counters set (agree|disagree|view)_count = (714|74|110397)/i.test(mig));

  console.log(failed ? `\n${failed} 項失敗` : '\n全部通過');
  process.exitCode = failed ? 1 : 0;
})().catch((e) => { console.error('測試本身出錯', e); process.exitCode = 1; });
