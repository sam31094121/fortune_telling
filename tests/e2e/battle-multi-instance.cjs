'use strict';
/**
 * AUDIT-2 M9（fix-3）：多執行個體（模擬 Vercel）戰局紀錄 E2E，收進 repo，可重跑。
 * 需要先起兩個 `next start` 行程（同一份正式建置、不同埠），用環境變數告訴本腳本：
 *   M3_E2E_A=http://127.0.0.1:3178 M3_E2E_B=http://127.0.0.1:3179 M3_E2E_EXPECT=degraded node tests/e2e/battle-multi-instance.cjs
 * M3_E2E_EXPECT：
 *   degraded ＝ 兩台都沒有共用儲存（不論有沒有金鑰）→ 必須全部 503 'unavailable'（安全降級，不得出現 409 誤判或 200 重放）。
 *   observe  ＝ 只列出結果不判定（例如故意把 M3_BATTLE_SINGLE_INSTANCE=1 錯設在兩台，觀察誤傷）。
 * 只用新正式卡（青龍＋幼子、二十八宿成獸）。金鑰只放在伺服器行程的環境變數，本腳本不讀也不寫任何金鑰。
 */
const ts = require('typescript'), fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), assert = require('node:assert/strict');
process.env.NEXT_PUBLIC_M3_FEED_CHAIN = '1'; process.env.NEXT_PUBLIC_M3_BATTLE_RESUME = '1';
const ROOT = path.resolve(__dirname, '..', '..');
const A = process.env.M3_E2E_A, Bx = process.env.M3_E2E_B, EXPECT = process.env.M3_E2E_EXPECT || 'observe';
if (!A || !Bx) { console.log('SKIP battle-multi-instance：沒有設定 M3_E2E_A／M3_E2E_B（需要兩個執行中的 next start）'); process.exit(0); }
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, resolveJsonModule: true, esModuleInterop: true } }).outputText, f);
const res0 = Module._resolveFilename; Module._resolveFilename = function (id, ...a) { return res0.call(this, id.startsWith('@/') ? path.resolve(ROOT, id.slice(2)) : id, ...a); };
const BR = require(ROOT + '/lib/beast-game/match3/battle-resume.ts');
const R = require(ROOT + '/lib/beast-game/registry.ts'), Face = require(ROOT + '/lib/beast-game/card-face-stats.ts').CARD_FACE_STATS;
const P = require(ROOT + '/lib/beast-game/match3/progression.ts'), E = require(ROOT + '/lib/beast-game/match3/enemies.ts'), PS = require(ROOT + '/lib/beast-game/match3/player-skills.ts'), D = require(ROOT + '/lib/beast-game/match3/drag.ts'), B = require(ROOT + '/lib/beast-game/match3/board.ts');
const pool = R.playableCards().filter(c => Face[c.id]);
function lineup(wins, seed) {
  const rng = B.seededRng(seed); const q = pool.find(c => c.name === '青龍'); const mates = pool.filter(c => c.form === 'YOUNG').slice(0, 4);
  const unit = c => ({ id: c.id, name: c.name, element: c.element, thumbnail: c.art.thumbnail, attack: Face[c.id].attack, hp: Face[c.id].hp, maxHp: Face[c.id].hp, energy: 0, faceAttack: Face[c.id].attack });
  const team = PS.initializePlayerSkills([q, ...mates].map(unit)).team;
  const sel = P.selectProgressionEnemies(pool, rng, wins), st = P.progressionLineupStats(sel, wins, pool);
  const foes = E.initializeAvailableFoes(sel.map((c, i) => ({ id: c.id, element: c.element, hp: st[i].hp, maxHp: st[i].hp, attack: st[i].attack, cd: 1, name: c.name, thumbnail: c.art.thumbnail })), wins + 1);
  const board = D.generateDragBoard(rng, 8, 7, true, P.progressionStage(wins).minChain);
  return JSON.parse(JSON.stringify({ meta: { mode: 'hard45', wins, seed, rule: 'tap-lead' }, core: { board, magic: board.map(r => r.map(() => 0)), team, foes, move: 0, attackBoost: 1, treasureGuard: 1 } }));
}
function findPath(board) { let best = []; const dfs = rt => { if (rt.length > best.length) best = rt.slice(); if (rt.length >= 6) return; const l = rt[rt.length - 1];
  for (const dr of [-1, 0, 1]) for (const dc of [-1, 0, 1]) { if (!dr && !dc) continue; const n = { r: l.r + dr, c: l.c + dc };
    if (n.r < 0 || n.r > 7 || n.c < 0 || n.c > 6 || board[n.r][n.c] !== board[l.r][l.c] || rt.some(p => p.r === n.r && p.c === n.c)) continue;
    if (dr && dc && rt.slice(1).some((b, i) => { const a = rt[i]; return a.r !== b.r && a.c !== b.c && a.r + b.r === l.r + n.r && a.c + b.c === l.c + n.c; })) continue;
    rt.push(n); dfs(rt); rt.pop(); } }; for (let r = 0; r < 8; r++) for (let c = 0; c < 7; c++) dfs([{ r, c }]); return best; }
const postTo = async (base, p, body) => { const r = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json().catch(() => null); return { status: r.status, code: j?.code ?? null, reason: j?.reason ?? null, j }; };
const DEVX = 'e2e-multi-dev-aaaa-1111';
const turnBody2 = (b, over = {}) => ({ ...b.core, path: findPath(b.core.board), mode: b.meta.mode, wins: b.meta.wins, target: Math.max(0, E.availableFoeTarget(b.core.foes, 0, b.meta.wins + 1)), seed: BR.orbTurnSeed(b.meta.seed, b.core.move), chosen: {}, rule: b.meta.rule, actionId: b.meta.battleId + ':turn:' + b.core.move, session: { token: b.session.token, battleId: b.meta.battleId, device: DEVX }, battleSeed: b.meta.seed, ...over });
(async () => {
  const out = { A, B: Bx, expect: EXPECT };
  out.statusA = await postTo(A, '/api/beast-game/orb-battle-record', { action: 'status' }).then(r => [r.status, r.j?.ok ? r.j.mode : r.code, r.reason]);
  out.statusB = await postTo(Bx, '/api/beast-game/orb-battle-record', { action: 'status' }).then(r => [r.status, r.j?.ok ? r.j.mode : r.code, r.reason]);
  const start = async (wins, seed) => { const l = lineup(wins, seed); const s = await postTo(A, '/api/beast-game/orb-battle-record', { action: 'start', meta: l.meta, core: l.core, device: DEVX }); return { l, s }; };
  // S1：開局在 A，第 1 步到 B，第 2 步回 A
  { const { l, s } = await start(2, 901); out.S1_startOnA = [s.status, s.code];
    if (s.status === 200) { let b = { meta: s.j.meta, core: l.core, session: s.j.session };
      const t1 = await postTo(Bx, '/api/beast-game/orb-turn', turnBody2(b)); out.S1_turn1_onB = [t1.status, t1.code];
      if (t1.status === 200) { b = { ...b, core: t1.j.battleCore, session: t1.j.battleSession }; const t2 = await postTo(A, '/api/beast-game/orb-turn', turnBody2(b)); out.S1_turn2_backOnA = [t2.status, t2.code]; } } }
  // S2：在 A 放棄，到 B 接回／出手
  { const { l, s } = await start(2, 902); out.S2_startOnA = [s.status, s.code];
    if (s.status === 200) { const b = { meta: s.j.meta, core: l.core, session: s.j.session };
      const c = await postTo(A, '/api/beast-game/orb-battle-record', { action: 'close', token: b.session.token, meta: b.meta, core: b.core, device: DEVX }); out.S2_closeOnA = [c.status, c.code];
      const r = await postTo(Bx, '/api/beast-game/orb-battle-record', { action: 'resume', token: b.session.token, meta: b.meta, core: b.core, device: DEVX }); out.S2_resumeClosedOnB = [r.status, r.code];
      const t = await postTo(Bx, '/api/beast-game/orb-turn', turnBody2(b)); out.S2_turnClosedOnB = [t.status, t.code]; } }
  // S3：在 A 走兩步，拿第 0 號舊收據到 B 重放
  { const { l, s } = await start(2, 903); out.S3_startOnA = [s.status, s.code];
    if (s.status === 200) { const b0 = { meta: s.j.meta, core: l.core, session: s.j.session }; let b = b0;
      for (let i = 0; i < 2; i++) { const t = await postTo(A, '/api/beast-game/orb-turn', turnBody2(b)); if (t.status !== 200) { out.S3_turnOnA = [t.status, t.code]; break; } b = { ...b, core: t.j.battleCore, session: t.j.battleSession }; }
      const rp = await postTo(Bx, '/api/beast-game/orb-turn', turnBody2(b0)); out.S3_replaySeq0OnB = [rp.status, rp.code]; } }
  // S5：降級時，一般模式（不帶收據）的回合在兩台都要能照常結算
  { const l = lineup(2, 905); const body = turnBody2({ meta: l.meta, core: l.core, session: { token: '' } }); delete body.session; delete body.actionId; delete body.battleSeed;
    const ta = await postTo(A, '/api/beast-game/orb-turn', body), tb = await postTo(Bx, '/api/beast-game/orb-turn', body); out.S5_plainTurn = [ta.status, tb.status]; }
  console.log(JSON.stringify(out));
  if (process.env.M3_E2E_OUT) fs.writeFileSync(process.env.M3_E2E_OUT, JSON.stringify(out, null, 1));
  if (EXPECT === 'degraded') {
    for (const k of ['statusA', 'statusB']) assert.equal(out[k][1], 'unavailable', `${k} 應回 unavailable`);
    for (const k of ['S1_startOnA', 'S2_startOnA', 'S3_startOnA']) assert.deepEqual(out[k], [503, 'unavailable'], `${k} 應安全降級 503`);
    assert.deepEqual(out.S5_plainTurn, [200, 200], '一般模式回合在兩台都要能結算');
    console.log('PASS battle-multi-instance（degraded）：沒有共用儲存時兩台都安全降級、一般模式照常');
  }
})().catch(e => { console.error(e); process.exit(1); });
