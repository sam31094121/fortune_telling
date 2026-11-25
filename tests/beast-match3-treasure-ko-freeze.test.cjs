#!/usr/bin/env node
'use strict';
// 回歸測試（2026-11-25）：寶器連發時第一發打倒最後一隻敵人，第二發不可讓盤面永久鎖住；
// 失敗只取消還沒送出的排隊項；已確認的那一發照常扣血、收動畫；全倒後不再接受按壓。
// 另含一般寶器樂觀起飛的時間計算、擊倒後預熱 B 案（放手＋閒置 ≥1 秒）。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require('./helpers/server-only-runtime.cjs');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
const Module = require('node:module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (id, ...args) { return resolve.call(this, id.startsWith('@/') ? path.resolve(__dirname, '..', id.slice(2)) : id, ...args); };

const T = require('../lib/beast-game/match3/treasures.ts');
const E = require('../lib/beast-game/elements.ts');
const M = require('../lib/beast-game/match3/index.ts');
const R = require('../lib/beast-game/match3/treasure-rapid-fire.ts');
const pool = require('../lib/beast-game/registry.ts').playableCards();

// --- 1. 伺服端真實結算：最後一隻敵人被第一發打倒 → 第二發判定 no-target（退庫存、不報錯）---
const team = E.ELEMENTS.map(element => {
  const c = pool.find(c => c.element === element && c.form === 'ADULT');
  return { id: c.id, name: c.name, thumbnail: '', element, hp: 100000, maxHp: 100000, attack: 100, energy: 0, cd: 1 };
});
const board = M.generateBoard(M.seededRng(1), 8, 7, true);
const foes = team.map((x, i) => ({ ...x, id: 'foe-' + i, attackEnergy: 75, hp: i === 0 ? 1 : 0, maxHp: 100000 }));
let book = T.emptyTreasureBook(); book.counts.WATER = 2;
const base = { board, magic: M.emptyMagic(board), path: [], team, foes, mode: 'hard45', wins: 0, target: 0, seed: 1001, move: 0, chosen: {}, rule: 'all-attack', attackBoost: 1 };
assert.ok(R.anyFoeAlive(foes), '開火前還有一隻活的');
const d1 = R.treasureRunDecision({ pressGen: 0, fireGen: 0, pressQueueGen: 0, queueGen: 0, foes, preferred: 0 });
assert.deepEqual(d1, { kind: 'fire', target: 0 });
const first = T.resolveTreasureUse({ ...base, treasures: book, actionId: 'ko-1' }, 'WATER');
assert.ok(first.foes.every(f => f.hp <= 0), '第一發要打倒最後一隻');
// 第二發已在排隊（按下時還有目標），輪到它時伺服端敵人已全倒
const d2 = R.treasureRunDecision({ pressGen: 0, fireGen: 0, pressQueueGen: 0, queueGen: 0, foes: first.foes, preferred: 0 });
assert.deepEqual(d2, { kind: 'no-target' }, '第二發 = no-target，不丟錯');
assert.equal(R.anyFoeAlive(first.foes), false, '全倒後不再接受寶器按壓');
assert.equal(R.canAcceptTreasurePress({ over: false, hasTarget: R.anyFoeAlive(first.foes), modeAllowed: true, boardActionLocked: false, isKelu: false, now: 0, keluUnlockAt: 0, count: 1, available: true }), false);

// 失敗只取消排隊中、還沒送出的；整局重置（fireGen）也會取消
assert.deepEqual(R.treasureRunDecision({ pressGen: 0, fireGen: 0, pressQueueGen: 0, queueGen: 1, foes, preferred: 0 }), { kind: 'cancelled' });
assert.deepEqual(R.treasureRunDecision({ pressGen: 0, fireGen: 1, pressQueueGen: 0, queueGen: 0, foes, preferred: 0 }), { kind: 'cancelled' });
// 前一發失敗之後才按的新一發不受影響
assert.deepEqual(R.treasureRunDecision({ pressGen: 0, fireGen: 0, pressQueueGen: 1, queueGen: 1, foes, preferred: 0 }), { kind: 'fire', target: 0 });
// 目標已死但別隻還活著 → 換目標，照常開火
const twoFoes = [{ hp: 0 }, { hp: 5 }];
assert.deepEqual(R.treasureRunDecision({ pressGen: 0, fireGen: 0, pressQueueGen: 0, queueGen: 0, foes: twoFoes, preferred: 0 }), { kind: 'fire', target: 1 });

// --- 2. 時序模型（模擬 Match3Board useTreasure 的排隊與 later()）：第一發扣血＋收動畫一定跑完，盤面 busy 回到 false ---
function simulate({ secondErrors }) {
  const st = { fireGen: 0, queueGen: 0, visuals: 0, busy: false, flights: new Set(), stock: 2, appliedDamage: 0, log: null, synced: foes.map(f => ({ ...f })) };
  const timers = [];
  const later = (fn, ms) => timers.push({ fn, ms });
  const bump = d => { st.visuals = Math.max(0, st.visuals + d); st.busy = st.visuals > 0; };
  const press = (id, serverResult) => {
    if (!R.anyFoeAlive(st.synced)) return false;
    const gen = st.fireGen, queueGen = st.queueGen;
    st.stock -= 1; bump(1); st.flights.add(id); // 按下即起飛
    return () => {
      const d = R.treasureRunDecision({ pressGen: gen, fireGen: st.fireGen, pressQueueGen: queueGen, queueGen: st.queueGen, foes: st.synced, preferred: 0 });
      if (d.kind !== 'fire') { st.flights.delete(id); st.stock += 1; bump(-1); return; }
      try {
        if (serverResult instanceof Error) throw serverResult;
        st.synced = serverResult.foes;
        const { damageDelay, clearDelay } = R.optimisticTreasureDelays(381);
        later(() => { if (gen !== st.fireGen) return; st.appliedDamage += serverResult.effect.damage; }, damageDelay);
        later(() => { if (gen !== st.fireGen) return; st.flights.delete(id); bump(-1); }, clearDelay);
      } catch (e) {
        st.queueGen += 1; st.flights.delete(id); st.stock += 1; bump(-1); st.log = e.message;
      }
    };
  };
  const r1 = press('ko-1', first);
  const r2 = press('ko-2', secondErrors ? new Error('暫時無法使用寶器，請重試。') : first);
  assert.ok(r1 && r2, '兩下都在敵人全倒前按下（80ms 連按）');
  r1(); r2();
  assert.equal(press('ko-3', first), false, '全倒後第三下不被接受');
  timers.sort((a, b) => a.ms - b.ms).forEach(t => t.fn());
  return st;
}
for (const secondErrors of [false, true]) {
  const st = simulate({ secondErrors });
  assert.equal(st.appliedDamage, first.effect.damage, '第一發的傷害一定套用');
  assert.equal(st.visuals, 0, '寶器動畫計數歸零');
  assert.equal(st.busy, false, '盤面不再鎖在「戰鬥演出中」');
  assert.equal(st.flights.size, 0, '飛行動畫全部收掉');
  assert.equal(st.stock, 1, '第二發退回庫存');
  if (!secondErrors) assert.equal(st.log, null, 'no-target 不顯示錯誤');
}

// --- 3. 一般寶器樂觀起飛：從按下起算 950／1900ms；確認晚到時數字至少留 1250ms ---
assert.deepEqual(R.optimisticTreasureDelays(0), { damageDelay: 950, clearDelay: 1900 });
assert.deepEqual(R.optimisticTreasureDelays(595), { damageDelay: 355, clearDelay: 1305 });
assert.deepEqual(R.optimisticTreasureDelays(3000), { damageDelay: 0, clearDelay: 1250 });

// --- 4. 預熱 B 案：手指按著、或有動畫、或 1 秒內有輸入都不預熱 ---
assert.equal(R.deathWarmIdleWait({ now: 5000, pointerDown: true, lastInputAt: 0, quietSince: 0 }), 1000);
assert.equal(R.deathWarmIdleWait({ now: 5000, pointerDown: false, lastInputAt: 0, quietSince: null }), 1000);
assert.equal(R.deathWarmIdleWait({ now: 5000, pointerDown: false, lastInputAt: 4500, quietSince: 0 }), 500);
assert.equal(R.deathWarmIdleWait({ now: 5000, pointerDown: false, lastInputAt: 4950, quietSince: 0 }), 950);
assert.equal(R.deathWarmIdleWait({ now: 5000, pointerDown: false, lastInputAt: 0, quietSince: 4900 }), 900);
assert.equal(R.deathWarmIdleWait({ now: 5000, pointerDown: false, lastInputAt: 3900, quietSince: 3000 }), 0);

// --- 5. 原始碼守門：catch 不再 fireGen++；不再丟「目前不能使用寶器」；一般寶器也先起飛；預熱走閒置窗 ---
const src = fs.readFileSync(path.resolve(__dirname, '../components/battlefield/Match3Board.tsx'), 'utf8');
const useT = src.slice(src.indexOf('const useTreasure = '), src.indexOf('const release = async'));
assert.ok(useT.length > 1000);
assert.doesNotMatch(useT, /fireGen\.current \+= 1/, 'useTreasure 失敗不可再 fireGen++（會取消已確認那一發）');
assert.match(useT, /treasureQueueGen\.current \+= 1/);
assert.doesNotMatch(useT, /throw new Error\('目前不能使用寶器'\)/);
assert.match(useT, /treasureRunDecision\(/);
assert.match(useT, /role: slot\.role[\s\S]{0,800}intent: true/, '一般寶器按下即起飛（意圖動畫）');
assert.match(useT, /optimisticTreasureDelays\(elapsed\)/);
assert.match(useT, /effect:kelu \? result\.effect : \{ \.\.\.result\.effect, id: actionId \}/, '一般寶器確認後沿用本機 actionId（訪客模式伺服端 id 不同），動畫才收得掉');
assert.match(useT, /anyFoeAlive\(/);
assert.match(src, /deathWarmIdleWait\(/);
assert.match(src, /requestIdleCallback\(kick, \{ timeout: 200 \}\)/, '保留 requestIdleCallback 後備');
console.log('beast-match3-treasure-ko-freeze.test.cjs ok', { firstDamage: first.effect.damage });
