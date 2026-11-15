// PLAN-v2 A6：困難模式（寶珠闖關）中途重整接回原戰局。只用新正式卡 cards/beasts；數字皆為【待平衡暫定值】。
// 透過真的 API 路由（app/api/beast-game/orb-turn、orb-battle-record 的 POST）跑，伺服端回合規則照舊。
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript'), fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ROOT = path.resolve(__dirname, '..');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, resolveJsonModule: true, esModuleInterop: true } }).outputText, filename);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (id, ...args) { return resolve.call(this, id.startsWith('@/') ? path.resolve(ROOT, id.slice(2)) : id, ...args); };
process.env.NEXT_PUBLIC_M3_BATTLE_RESUME = '1';
process.env.NEXT_PUBLIC_M3_FEED_CHAIN = '1';
const BR = require('../lib/beast-game/match3/battle-resume.ts');
const BS = require('../lib/beast-game/match3/orb-battle-ledger.ts');
const ST = require('../lib/beast-game/match3/battle-snapshot-store.ts');
const R = require('../lib/beast-game/registry.ts');
const Face = require('../lib/beast-game/card-face-stats.ts').CARD_FACE_STATS;
const P = require('../lib/beast-game/match3/progression.ts');
const E = require('../lib/beast-game/match3/enemies.ts');
const PS = require('../lib/beast-game/match3/player-skills.ts');
const D = require('../lib/beast-game/match3/drag.ts');
const B = require('../lib/beast-game/match3/board.ts');
const C = require('../lib/beast-game/match3/hard-campaign.ts');
const orbRoute = require('../app/api/beast-game/orb-turn/route.ts');
// fix-3：測試全部從同一個「來源」快速呼叫，每個測試前歸零頻率計數（頻率限制本身另有專門測試）。
test.beforeEach(() => require('../lib/beast-game/match3/rate-limit.ts').__resetRateLimitForTest());
const sessRoute = require('../app/api/beast-game/orb-battle-record/route.ts');

const pool = R.playableCards().filter(c => Face[c.id]);
const DEV = 'dev-aaaaaaaa-1111', DEV2 = 'dev-bbbbbbbb-2222';
/** 依 Match3Board.pickLineup 同式組開局（hard45、wins 關）。 */
function lineup(wins, seed = 4242) {
  const rng = B.seededRng(seed);
  const qinglong = pool.find(c => c.name === '青龍');
  const mates = pool.filter(c => c.form === 'YOUNG').slice(0, 4);
  const unit = c => ({ id: c.id, name: c.name, element: c.element, thumbnail: c.art.thumbnail, attack: Face[c.id].attack, hp: Face[c.id].hp, maxHp: Face[c.id].hp, energy: 0, faceAttack: Face[c.id].attack });
  const team = PS.initializePlayerSkills([qinglong, ...mates].map(unit)).team;
  const selected = P.selectProgressionEnemies(pool, rng, wins), stats = P.progressionLineupStats(selected, wins, pool);
  const foes = E.initializeAvailableFoes(selected.map((c, i) => ({ id: c.id, element: c.element, hp: stats[i].hp, maxHp: stats[i].hp, attack: stats[i].attack, cd: 1, name: c.name, thumbnail: c.art.thumbnail })), wins + 1);
  const board = D.generateDragBoard(rng, 8, 7, true, P.progressionStage(wins).minChain);
  return JSON.parse(JSON.stringify({ meta: { mode: 'hard45', wins, seed, rule: 'tap-lead' }, core: { board, magic: board.map(r => r.map(() => 0)), team, foes, move: 0, attackBoost: 1, treasureGuard: 1 } }));
}
async function call(route, body) {
  const res = await route.POST(new Request('http://x/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  return { status: res.status, body: await res.json() };
}
const start = async (wins = 0, seed = 4242, device = DEV) => { const l = lineup(wins, seed); const r = await call(sessRoute, { action: 'start', meta: l.meta, core: l.core, device }); assert.equal(r.status, 200, JSON.stringify(r.body)); return { meta: r.body.meta, core: l.core, session: r.body.session, device }; };
/** 找一條合法同色路徑（優先長的；8 方向、不可交叉）。 */
function findPath(board, min = 3) {
  let best = [];
  const dfs = route => { if (route.length > best.length) best = route.slice(); if (route.length >= 7) return; const l = route[route.length - 1];
    for (const dr of [-1, 0, 1]) for (const dc of [-1, 0, 1]) { if (!dr && !dc) continue; const n = { r: l.r + dr, c: l.c + dc };
      if (n.r < 0 || n.r > 7 || n.c < 0 || n.c > 6 || board[n.r][n.c] !== board[l.r][l.c] || route.some(p => p.r === n.r && p.c === n.c)) continue;
      if (dr && dc && route.slice(1).some((b, i) => { const a = route[i]; return a.r !== b.r && a.c !== b.c && a.r + b.r === l.r + n.r && a.c + b.c === l.c + n.c; })) continue;
      route.push(n); dfs(route); route.pop(); } };
  for (let r = 0; r < 8; r++) for (let c = 0; c < 7; c++) dfs([{ r, c }]);
  assert(best.length >= min); return best;
}
/** 依 Match3Board.release 同式送一步連珠。 */
const turnBody = (b, path = findPath(b.core.board)) => ({ ...b.core, path, mode: b.meta.mode, wins: b.meta.wins, target: Math.max(0, E.availableFoeTarget(b.core.foes, 0, b.meta.wins + 1)), seed: BR.orbTurnSeed(b.meta.seed, b.core.move), chosen: {}, rule: b.meta.rule, actionId: b.meta.battleId + ':turn:' + b.core.move, session: { token: b.session.token, battleId: b.meta.battleId, device: b.device }, battleSeed: b.meta.seed });
async function turn(b, override = {}) {
  const r = await call(orbRoute, { ...turnBody(b), ...override });
  if (r.status === 200) return { ...r, next: { ...b, core: r.body.battleCore, session: r.body.battleSession } };
  return r;
}
const resume = (b, extra = {}) => call(sessRoute, { action: 'resume', token: b.session.token, meta: b.meta, core: b.core, device: b.device, ...extra });

test('開局：伺服端核對數值後發 battleId 與第 0 號收據；開局竄改（敵人血量、我方攻擊超過上限、回合不是 0）一律拒絕', async () => {
  const b = await start();
  assert.match(b.meta.battleId, /^[0-9a-f-]{36}$/); assert.equal(b.session.seq, 0);
  for (const bad of [
    l => { l.core.foes[0].hp -= 1; },
    l => { l.core.foes[0].maxHp = l.core.foes[0].hp = 1; },
    l => { l.core.team[0].attack = Face[l.core.team[0].id].attack * 3; },
    l => { l.core.team[1].hp = l.core.team[1].maxHp = 99999; },
    l => { l.core.move = 5; },
    l => { l.core.team[0].energy = 100; },
  ]) { const l = lineup(0); bad(l); const r = await call(sessRoute, { action: 'start', meta: l.meta, core: l.core, device: DEV }); assert.equal(r.status, 400); assert.equal(r.body.code, 'invalid'); }
});

test('打到一半重新整理：接回後血量、盤面、敵人、回合、能量都和重整前一致', async () => {
  let b = await start(1);
  for (let i = 0; i < 3; i++) { const t = await turn(b); assert.equal(t.status, 200, JSON.stringify(t.body)); b = t.next; }
  assert.equal(b.core.move, 3);
  // 模擬 Match3Board 每回合把收據寫進快照，再「重新整理」：從快照讀出來接回。
  installStorage();
  ST.writeBattleSnapshot({ v: 1, owner: 'self', meta: b.meta, core: b.core, session: b.session, savedAt: Date.now(), ui: { target: 0, chosen: {}, totalDmg: 123, cardAttackKey: 0, energyActionKey: 0, treasureAction: 0 } });
  const read = ST.readBattleSnapshot('self'); assert.equal(read.status, 'ok');
  const r = await resume({ ...b, ...read.snapshot, device: DEV });
  assert.equal(r.status, 200); assert.equal(r.body.advanced, false);
  const pick = c => ({ board: c.board, magic: c.magic, move: c.move, hp: c.team.map(u => u.hp), energy: c.team.map(u => u.energy), foes: c.foes.map(f => [f.id, f.hp, f.attackEnergy ?? 0]) });
  assert.deepEqual(pick(r.body.core), pick(b.core));
  assert(b.core.team.some(u => u.energy > 0) || b.core.foes.some(f => f.hp < f.maxHp), '這 3 步要真的改變過狀態，比對才有意義');
  // 接回後可以直接繼續打下一步。
  const t = await turn({ ...b, core: r.body.core, session: r.body.session }); assert.equal(t.status, 200);
});

test('重新整理時最後一步剛好送出：快照停在舊收據，接回會拿到伺服端最新結果（不能重打那一步）', async () => {
  let b = await start(1, 777);
  const t1 = await turn(b); b = t1.next;
  const old = b;
  const t2 = await turn(b); // 伺服端算完了，但瀏覽器在收到前就重整（快照仍是 old）
  const r = await resume(old);
  assert.equal(r.status, 200); assert.equal(r.body.advanced, true);
  assert.deepEqual(r.body.core, t2.body.battleCore);
  // 用舊收據重打一步（想換一條路線重抽）→ 拒絕
  // 用舊收據換一條路線重打（想重抽補珠）→ 拒絕。
  const again = await turn(old, { actionId: old.meta.battleId + ':reroll' }); assert.equal(again.status, 409); assert.equal(again.body.code, 'stale');
  // 原樣重送同一份請求（H4 冪等）：只會拿回伺服端已經算好的同一個結果，不會重抽。
  const same = await turn(old); assert.equal(same.status, 200); assert.deepEqual(same.body.battleCore, t2.body.battleCore); assert.equal(same.body.battleSession.seq, t2.body.battleSession.seq);
});

test('竄改存檔：改血量、改能量、改盤面、改關卡編號、改種子、偽造收據 → 一律拒絕，不能接回也不能出手', async () => {
  let b = await start(1, 99);
  b = (await turn(b)).next;
  const mut = f => { const c = JSON.parse(JSON.stringify(b)); f(c); return c; };
  const cases = {
    回滿血: c => { const u = c.core.team[0]; u.hp = u.hp === u.maxHp ? u.maxHp - 1 : u.maxHp; },
    敵人血量: c => { c.core.foes[0].hp = 1; },
    能量灌滿: c => { c.core.team.forEach(u => { u.energy = 100; }); },
    重新洗盤: c => { c.core.board = c.core.board.map(r => r.map(() => 'FIRE')); },
    關卡編號: c => { c.meta.wins = 7; },
    換模式: c => { c.meta.mode = 'hard45b'; },
    偽造收據: c => { const [body, mac] = c.session.token.split('.'); const p = JSON.parse(Buffer.from(body, 'base64url')); p.s = 0; c.session.token = Buffer.from(JSON.stringify(p)).toString('base64url') + '.' + mac; },
  };
  for (const [name, f] of Object.entries(cases)) {
    const c = mut(f);
    const r = await resume(c); assert.notEqual(r.status, 200, name); assert.equal(r.body.code, 'tampered', name);
    const t = await turn(c); assert.notEqual(t.status, 200, name);
  }
  // 自選種子重抽補珠：種子不等於開局種子＋回合式 → 拒絕
  const t = await call(orbRoute, { ...turnBody(b), seed: 12345 }); assert.equal(t.status, 400);
  // 原樣仍可繼續（上面的拒絕都沒有讓伺服端前進）
  assert.equal((await turn(b)).status, 200);
});

test('重放舊回合：已經走過的收據不能再送一次', async () => {
  let b = await start(1, 5);
  const s0 = b; b = (await turn(b)).next; const s1 = b; b = (await turn(b)).next;
  for (const old of [s0, s1]) { const r = await turn(old, { actionId: old.meta.battleId + ':replay' }); assert.equal(r.status, 409); assert.equal(r.body.code, 'stale'); }
  // 更早的收據即使原樣重送也不是「最後一步的重送」→ stale。
  const r0 = await turn(s0); assert.equal(r0.status, 409); assert.equal(r0.body.code, 'stale');
});

test('兩個分頁同時打：同一張收據只接受第一個，第二個分頁被拒（不會重複記帳）', async () => {
  const b = await start(1, 31);
  // 兩個分頁的 actionId 不同（Match3Board 每個分頁各有分頁編號）；同一份請求的重送才算冪等（見下方 H4 測試）。
  const [a, c] = await Promise.all([turn(b, { actionId: b.meta.battleId + ':tabA:turn:0' }), turn(b, { actionId: b.meta.battleId + ':tabB:turn:0' })]);
  const ok = [a, c].filter(x => x.status === 200), no = [a, c].filter(x => x.status !== 200);
  assert.equal(ok.length, 1); assert.equal(no.length, 1); assert.equal(no[0].body.code, 'stale');
  assert.match(no[0].body.error, /別的分頁/);
});

test('別台裝置拿同一場的收據：不能代打、不能結算', async () => {
  const b = await start(1, 32);
  const r = await turn({ ...b, device: DEV2 }); assert.equal(r.status, 409); assert.equal(r.body.code, 'device');
  const s = await call(sessRoute, { action: 'settle', token: b.session.token, meta: b.meta, core: b.core, device: DEV2 }); assert.equal(s.body.code, 'device');
});

test('結算：伺服端紀錄敵方沒全倒不能記勝；全倒才記一次，同裝置重送＝重複、別台裝置拒絕；結算後不能再出手', async () => {
  let b = await start(1, 41);
  const early = await call(sessRoute, { action: 'settle', token: b.session.token, meta: b.meta, core: b.core, device: DEV });
  assert.equal(early.body.code, 'not-finished');
  // 伺服端內部推進到敵方全倒（模擬打贏；瀏覽器無法自己做到這一步）
  const won = await BS.runBattleTurn({ token: b.session.token, meta: b.meta, core: b.core, device: DEV }, () => ({ result: {}, nextCore: { ...b.core, move: b.core.move + 1, foes: b.core.foes.map(f => ({ ...f, hp: 0 })) } }));
  b = { ...b, core: JSON.parse(JSON.stringify(won.nextCore)), session: won.session };
  const s1 = await call(sessRoute, { action: 'settle', token: b.session.token, meta: b.meta, core: b.core, device: DEV });
  assert.equal(s1.status, 200); assert.equal(s1.body.wins, 1); assert.equal(s1.body.duplicate, false); assert.equal(s1.body.battleId, b.meta.battleId);
  const s2 = await call(sessRoute, { action: 'settle', token: b.session.token, meta: b.meta, core: b.core, device: DEV });
  assert.equal(s2.status, 200); assert.equal(s2.body.duplicate, true);
  const s3 = await call(sessRoute, { action: 'settle', token: b.session.token, meta: b.meta, core: b.core, device: DEV2 }); assert.equal(s3.body.code, 'device');
  assert.equal((await turn(b)).status, 409);
  // 帳面：同一 battleId 當 matchId，闖關存檔只多 1 勝；重送不會再加。
  let p = C.chooseCampaignHero(C.newCampaign(1), pool.find(c => c.name === '青龍').id);
  p = { ...p, teamIds: [p.heroId, ...pool.filter(c => c.form === 'YOUNG').slice(0, 4).map(c => c.id)] };
  const w1 = C.campaignWin(p, s1.body.battleId, s1.body.wins); assert.equal(w1.profile.wins, 2);
  const w2 = C.campaignWin(w1.profile, s2.body.battleId, s2.body.wins); assert.equal(w2.duplicate, true); assert.equal(w2.profile.wins, 2);
  assert.throws(() => C.campaignWin(w1.profile, 'other', s1.body.wins), /進度已變更/, '關卡編號對不上就拒絕記帳');
});

test('重新整理逃不掉輸局：落敗後伺服端關閉這場，舊快照接回被拒；打到一半放棄也一樣關閉', async () => {
  let b = await start(1, 51);
  const lost = await BS.runBattleTurn({ token: b.session.token, meta: b.meta, core: b.core, device: DEV }, () => ({ result: {}, nextCore: { ...b.core, move: 1, team: b.core.team.map(u => ({ ...u, hp: 0 })) } }));
  const atLoss = { ...b, core: JSON.parse(JSON.stringify(lost.nextCore)), session: lost.session };
  // 快要輸時重新整理：接回仍是同一個快輸的局面（不會回滿血）
  const r0 = await resume(atLoss); assert.equal(r0.status, 200); assert(r0.body.core.team.every(u => u.hp === 0));
  assert.equal((await turn(atLoss)).status, 409, '已分出勝負不能再出手');
  const c = await call(sessRoute, { action: 'close', token: atLoss.session.token, meta: atLoss.meta, core: atLoss.core, device: DEV });
  assert.equal(c.status, 200); assert.equal(c.body.outcome, 'lose');
  const r1 = await resume(atLoss); assert.equal(r1.body.code, 'closed'); assert.match(r1.body.error, /記為落敗/);
  const s = await call(sessRoute, { action: 'settle', token: atLoss.session.token, meta: atLoss.meta, core: atLoss.core, device: DEV }); assert.notEqual(s.status, 200);
  // 打到一半放棄
  b = (await turn(await start(1, 52))).next;
  const f = await call(sessRoute, { action: 'close', token: b.session.token, meta: b.meta, core: b.core, device: DEV });
  assert.equal(f.body.outcome, 'forfeit');
  assert.equal((await turn(b)).status, 409); assert.equal((await resume(b)).body.code, 'closed');
});

test('過期：最後一次收據超過 24 小時就不能接回（照實提示作廢）', async () => {
  const b = await start(1, 61);
  const r = BS.resumeBattle.length; assert(r >= 1);
  await assert.rejects(() => BS.resumeBattle({ token: b.session.token, meta: b.meta, core: b.core, device: DEV, now: Date.now() + BR.BATTLE_RESUME_POLICY.expireMs + 1000 }), e => e.code === 'expired');
  assert.match(BR.BATTLE_SESSION_MESSAGES.expired, /24 小時/);
});

test('伺服器重啟（記憶體紀錄消失）：簽章仍擋竄改；找不到紀錄照實回 lost（不再從收據重建，AUDIT-2 X3）；換了金鑰的舊收據全部作廢', async () => {
  let b = await start(1, 71); b = (await turn(b)).next;
  await BS.__resetBattleLedgerForTest();
  const bad = JSON.parse(JSON.stringify(b)); bad.core.team[0].hp = bad.core.team[0].maxHp;
  if (bad.core.team[0].hp === b.core.team[0].hp) bad.core.team[0].energy += 10;
  assert.equal((await resume(bad)).body.code, 'tampered');
  const r = await resume(b); assert.equal(r.status, 409); assert.equal(r.body.code, 'lost'); assert.match(r.body.error, /找不到這場的紀錄/); assert.doesNotMatch(r.body.error, /修改/);
  assert.equal((await turn(b)).body.code, 'lost', '紀錄不見後也不能拿舊收據繼續出手');
  await BS.__resetBattleLedgerForTest({ rotateSecret: true });
  assert.equal((await resume(b)).body.code, 'tampered');
});

function memStore() { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), data: m }; }
function installStorage() {
  const local = memStore(), session = memStore();
  global.window = { localStorage: local, sessionStorage: session, crypto: require('node:crypto').webcrypto };
  return { local, session };
}

test('瀏覽器快照：損毀與過期有安全退路與照實提示；結算後清掉殘留；新鍵不動既有存檔鍵', () => {
  const { local, session } = installStorage();
  local.setItem('match3-hard-campaign-self-v1', '{"keep":1}');
  assert.equal(ST.readBattleSnapshot('self').status, 'none');
  local.setItem(ST.BATTLE_SNAPSHOT_KEYS.self, '{broken');
  const bad = ST.readBattleSnapshot('self'); assert.equal(bad.status, 'corrupt'); assert.match(bad.message, /損毀/); assert.match(bad.message, /不發獎勵、勝場不變/);
  local.setItem(ST.BATTLE_SNAPSHOT_KEYS.self, JSON.stringify({ v: 1, owner: 'self' }));
  assert.equal(ST.readBattleSnapshot('self').status, 'corrupt');
  const l = lineup(1);
  const snap = { v: 1, owner: 'self', meta: { ...l.meta, battleId: 'b-1' }, core: l.core, session: { token: 'x.y', seq: 0 }, savedAt: Date.now() - BR.BATTLE_RESUME_POLICY.expireMs - 1, ui: { target: 0, chosen: {}, totalDmg: 0, cardAttackKey: 0, energyActionKey: 0, treasureAction: 0 } };
  ST.writeBattleSnapshot(snap);
  const ex = ST.readBattleSnapshot('self'); assert.equal(ex.status, 'expired'); assert.match(ex.message, /24 小時/);
  ST.writeBattleSnapshot({ ...snap, savedAt: Date.now() });
  assert.equal(ST.readBattleSnapshot('self').status, 'ok'); assert.equal(ST.hasPendingBattle('self', 'hard45'), true);
  ST.clearBattleSnapshot('self', 'other-battle'); assert.equal(ST.readBattleSnapshot('self').status, 'ok', '別場的結算不能清掉這場');
  ST.clearBattleSnapshot('self', 'b-1'); assert.equal(ST.readBattleSnapshot('self').status, 'none');
  assert.equal(local.getItem('match3-hard-campaign-self-v1'), '{"keep":1}', '既有闖關存檔不受影響');
  ST.writeBattleSnapshot({ ...snap, owner: 'guest', savedAt: Date.now() });
  assert.equal(session.data.has(ST.BATTLE_SNAPSHOT_KEYS.guest), true, '親朋好友只存在本分頁');
  const id = ST.battleDeviceId(); assert.equal(ST.battleDeviceId(), id);
});

test('每回合存檔成本：快照大小與寫入時間（記錄數字，不設門檻造假）', async () => {
  installStorage();
  let b = await start(8, 81);
  for (let i = 0; i < 4; i++) { const t = await turn(b); if (t.status !== 200) break; b = t.next; }
  const runs = [];
  for (let i = 0; i < 200; i++) runs.push(ST.writeBattleSnapshot({ v: 1, owner: 'self', meta: b.meta, core: b.core, session: b.session, savedAt: Date.now(), ui: { target: 0, chosen: {}, totalDmg: 0, cardAttackKey: 0, energyActionKey: 0, treasureAction: 0 } }));
  const ms = runs.map(r => r.ms).sort((a, z) => a - z);
  const out = { chars: runs[0].chars, medianMs: +ms[100].toFixed(3), p95Ms: +ms[190].toFixed(3) };
  console.log('[A6 snapshot cost node]', JSON.stringify(out));
  assert(out.chars < BR.BATTLE_RESUME_POLICY.maxSnapshotChars);
});

test('開關關閉：戰局紀錄 API 回 404；帶 session 的回合被拒；不帶 session 的舊回合照舊可打', async () => {
  const b = await start(1, 91);
  delete process.env.NEXT_PUBLIC_M3_BATTLE_RESUME;
  try {
    assert.equal((await call(sessRoute, { action: 'start' })).status, 404);
    assert.equal((await call(orbRoute, turnBody(b))).status, 400);
    const { session, battleSeed, ...legacy } = turnBody(b);
    const r = await call(orbRoute, legacy); assert.equal(r.status, 200); assert.equal(r.body.battleSession, undefined);
  } finally { process.env.NEXT_PUBLIC_M3_BATTLE_RESUME = '1'; }
});

// ───────────── AUDIT-2 fix-3：X1–X3 安全預設、H4 冪等、M1 開局上限、M2 頻率限制、L2 清理順序 ─────────────
const LS = require('../lib/beast-game/match3/battle-ledger-store.ts');
const RL = require('../lib/beast-game/match3/rate-limit.ts');
async function withEnv(env, fn) {
  const keep = {}; for (const k of Object.keys(env)) { keep[k] = process.env[k]; if (env[k] === undefined) delete process.env[k]; else process.env[k] = env[k]; }
  try { return await fn(); } finally { for (const k of Object.keys(env)) { if (keep[k] === undefined) delete process.env[k]; else process.env[k] = keep[k]; } }
}
const SECRET = 'test-secret-for-fix3-only-0123456789abcdef';

test('X1–X3 安全預設：正式環境沒有共用儲存 → 開關打開也拒絕啟用（503 unavailable，照實提示，不誤判作廢）', async () => {
  const b = await start(1, 201);
  for (const env of [
    { NODE_ENV: 'production', M3_BATTLE_SECRET: undefined, M3_BATTLE_SINGLE_INSTANCE: undefined, VERCEL: undefined },
    { NODE_ENV: 'production', M3_BATTLE_SECRET: SECRET, M3_BATTLE_SINGLE_INSTANCE: undefined, VERCEL: undefined },
    { NODE_ENV: 'production', M3_BATTLE_SECRET: SECRET, M3_BATTLE_SINGLE_INSTANCE: '1', VERCEL: '1' },
    { NODE_ENV: 'production', M3_BATTLE_SECRET: undefined, M3_BATTLE_SINGLE_INSTANCE: '1', VERCEL: undefined },
  ]) await withEnv(env, async () => {
    const l = lineup(1, 202);
    const s = await call(sessRoute, { action: 'start', meta: l.meta, core: l.core, device: DEV });
    assert.equal(s.status, 503, JSON.stringify(env)); assert.equal(s.body.code, 'unavailable'); assert.match(s.body.error, /一般模式/); assert.doesNotMatch(s.body.error, /修改/);
    assert.equal((await resume(b)).status, 503);
    const t = await call(orbRoute, turnBody(b)); assert.equal(t.status, 503); assert.equal(t.body.code, 'unavailable');
    const st = await call(sessRoute, { action: 'status' }); assert.equal(st.status, 503); assert.ok(['no-secret', 'no-shared-store', 'vercel-memory'].includes(st.body.reason));
    assert.equal(JSON.stringify(st.body).includes(SECRET), false, '狀態回應不能洩漏金鑰');
    // 一般（不帶收據）的回合照舊可以打：降級不影響玩家。
    const { session, battleSeed, ...legacy } = turnBody(b); assert.equal((await call(orbRoute, legacy)).status, 200);
  });
  // 自架單一行程＋金鑰：明確宣告才允許；註冊共用儲存＋金鑰：允許。
  await withEnv({ NODE_ENV: 'production', M3_BATTLE_SECRET: SECRET, M3_BATTLE_SINGLE_INSTANCE: '1', VERCEL: undefined }, async () => {
    assert.equal(BS.battleLedgerStatus().mode, 'single-instance');
  });
  const shared = Object.assign(LS.createMemoryBattleLedgerStore({ max: 100, ttlMs: 1e9 }), { kind: 'shared' });
  LS.setBattleLedgerStore(shared);
  try {
    await withEnv({ NODE_ENV: 'production', M3_BATTLE_SECRET: SECRET, M3_BATTLE_SINGLE_INSTANCE: undefined, VERCEL: '1' }, async () => {
      assert.equal(BS.battleLedgerStatus().mode, 'shared');
      const s = await start(1, 203); assert.equal((await turn(s)).status, 200);
    });
    await withEnv({ NODE_ENV: 'production', M3_BATTLE_SECRET: undefined }, async () => { assert.equal(BS.battleLedgerStatus().ok, false, '共用儲存也要有金鑰'); });
  } finally { LS.setBattleLedgerStore(undefined); }
});

test('X2／X3 多執行個體（共用金鑰、各自記憶體）：別台沒有紀錄 → lost，不從收據重建；逃輸局、重放舊收據都擋下', async () => {
  // 用兩個獨立的記憶體儲存模擬兩台伺服器 A、B（共用同一把測試金鑰）。
  const A = LS.createMemoryBattleLedgerStore({ max: 100, ttlMs: 1e9 }), B = LS.createMemoryBattleLedgerStore({ max: 100, ttlMs: 1e9 });
  const on = st => LS.setBattleLedgerStore(Object.assign(st, { kind: 'shared' }));
  try {
    on(A); let b = await start(1, 211); const s0 = b; b = (await turn(b)).next;
    on(B); assert.equal((await turn(b)).body.code, 'lost', '換到 B：照實回 lost，不是 tampered／stale');
    on(A); const c = await call(sessRoute, { action: 'close', token: b.session.token, meta: b.meta, core: b.core, device: DEV }); assert.equal(c.status, 200);
    on(B); assert.notEqual((await resume(b)).status, 200, '在 A 放棄後到 B 接回：拒絕'); assert.notEqual((await turn(s0)).status, 200, '舊收據到 B 重放：拒絕');
  } finally { LS.setBattleLedgerStore(undefined); }
});

test('H4 冪等：回應遺失後原樣重送 → 回同一份結果、伺服端不多走一步；換一條路徑才是 stale（提示叫你按重新接回）', async () => {
  const b = await start(1, 221);
  const body = turnBody(b);
  const first = await call(orbRoute, body); assert.equal(first.status, 200);
  const again = await call(orbRoute, body); assert.equal(again.status, 200, JSON.stringify(again.body));
  assert.deepEqual(again.body.battleSession, first.body.battleSession); assert.deepEqual(again.body.battleCore, first.body.battleCore);
  const next = { ...b, core: first.body.battleCore, session: first.body.battleSession };
  const r = await resume(next); assert.equal(r.body.session.seq, 1, '伺服端只前進一號');
  const other = await call(orbRoute, { ...body, actionId: body.actionId + ':x' }); assert.equal(other.status, 409); assert.equal(other.body.code, 'stale'); assert.match(other.body.error, /重新接回/);
  assert.equal((await turn(next)).status, 200, '接回後照常出手');
});

test('M1 開局上限：攻擊不能超過跨層級天花板、全隊開局能量不能超過 60', async () => {
  const MT = require('../lib/beast-game/match3/merge-tier.ts');
  const l = lineup(1, 231);
  const u = l.core.team[1];
  const cap = MT.tierAttackCap(u.id);
  const ok = lineup(1, 231); ok.core.team[1].attack = Face[u.id].attack + cap;
  assert.equal((await call(sessRoute, { action: 'start', meta: ok.meta, core: ok.core, device: DEV })).status, 200, '剛好在天花板：允許');
  const over = lineup(1, 231); over.core.team[1].attack = Face[u.id].attack + cap + 1;
  assert.equal((await call(sessRoute, { action: 'start', meta: over.meta, core: over.core, device: DEV })).body.code, 'invalid', '超過天花板一點：拒絕');
  const en = lineup(1, 231); en.core.team.forEach(x => { x.energy = 20; });
  assert.equal((await call(sessRoute, { action: 'start', meta: en.meta, core: en.core, device: DEV })).body.code, 'invalid', '全隊 100 能量：拒絕');
  const en60 = lineup(1, 231); en60.core.team.forEach((x, i) => { x.energy = i < 3 ? 20 : 0; });
  assert.equal((await call(sessRoute, { action: 'start', meta: en60.meta, core: en60.core, device: DEV })).status, 200, '全隊 60：允許');
  // 成獸：卡面高於同方位四大神獸的（虛日鼠、觜火猴）天花板是 0 → 卡面 +1 就拒絕
  const zero = pool.filter(c => c.form === 'ADULT' && MT.tierAttackCap(c.id) === 0);
  assert(zero.length >= 1);
});

test('M2 頻率限制：同一來源超過上限回 429（照實提示），換來源不受影響；開關關閉的舊回合不受限', async () => {
  RL.__resetRateLimitForTest();
  const t0 = 1_000_000;
  for (let i = 0; i < RL.M3_RATE_LIMITS.start.max; i++) assert.equal(RL.allowRequest('start', '1.2.3.4', t0), true);
  assert.equal(RL.allowRequest('start', '1.2.3.4', t0), false);
  assert.equal(RL.allowRequest('start', '5.6.7.8', t0), true);
  assert.equal(RL.allowRequest('start', '1.2.3.4', t0 + RL.M3_RATE_LIMITS.start.windowMs), true, '時間窗過了就恢復');
  RL.__resetRateLimitForTest();
  const req = new Request('http://x/api', { method: 'POST', headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' } }); assert.equal(RL.clientKey(req), '9.9.9.9');
  for (let i = 0; i < RL.M3_RATE_LIMITS.start.max; i++) RL.allowRequest('start', 'unknown');
  const l = lineup(1, 241); const r = await call(sessRoute, { action: 'start', meta: l.meta, core: l.core, device: DEV });
  assert.equal(r.status, 429); assert.equal(r.body.code, 'rate-limited'); assert.match(r.body.error, /稍等/);
  // 帶收據的回合超過上限 → 429；不帶收據的舊回合照舊 200。
  RL.__resetRateLimitForTest();
  const b = await start(1, 242);
  for (let i = 0; i < RL.M3_RATE_LIMITS.turn.max; i++) RL.allowRequest('turn', 'unknown');
  const t = await call(orbRoute, turnBody(b)); assert.equal(t.status, 429); assert.equal(t.body.code, 'rate-limited');
  const { session, battleSeed, ...legacy } = turnBody(b); assert.equal((await call(orbRoute, legacy)).status, 200);
  RL.__resetRateLimitForTest();
});

test('L2 記憶體儲存清理：超過上限先清已結束的，正在打的最後才清', async () => {
  const st = LS.createMemoryBattleLedgerStore({ max: 3, ttlMs: 1e12 });
  const e = (id, status, at) => ({ meta: { battleId: id }, core: {}, seq: 0, token: 't', device: 'd', startAt: at, lastAt: at, status });
  await st.put(e('open-1', 'open', 1), null); await st.put(e('done-1', 'closed', 2), null); await st.put(e('open-2', 'open', 3), null);
  await st.put(e('open-3', 'open', 4), null);
  assert.equal(await st.get('done-1'), undefined); assert.ok(await st.get('open-1')); assert.ok(await st.get('open-3'));
  assert.equal(await st.put(e('open-3', 'open', 5), null), false, 'expect=null 但已存在：比對失敗');
});
