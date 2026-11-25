#!/usr/bin/env node
'use strict';
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
const {
  canAcceptTreasurePress, decrementTreasureCatalog,
  upsertTreasureFlight, removeTreasureFlight, deathWarmTargets,
} = require('../lib/beast-game/match3/treasure-rapid-fire.ts');
const { isKeluWeapon, keluTiming, OTHER_TREASURE_CLEAR_MS } = require('../lib/beast-game/match3/kelu-combo.ts');
const M = require('../lib/beast-game/match3/index.ts');
const pool = require('../lib/beast-game/registry.ts').playableCards();

const team = E.ELEMENTS.map(element => {
  const c = pool.find(c => c.element === element && c.form === 'ADULT');
  return { id: c.id, name: c.name, thumbnail: '', element, hp: 100000, maxHp: 100000, attack: 100, energy: 0, cd: 1 };
});
const board = M.generateBoard(M.seededRng(1), 8, 7, true);
const magic = M.emptyMagic(board);
const base = { board, magic, path: [], team, foes: team.map(x => ({ ...x, attackEnergy: 75, hp: 100000, maxHp: 100000 })), mode: 'hard45', wins: 0, target: 0, seed: 1001, move: 0, chosen: {}, rule: 'all-attack', attackBoost: 1 };

// --- 閘門：一般寶器不因飛行動畫而鎖住；斷風輪維持 clearAt ---
const gate = (over = {}) => canAcceptTreasurePress({
  over: false, hasTarget: true, modeAllowed: true, boardActionLocked: false,
  isKelu: false, now: 1000, keluUnlockAt: 0, count: 3, available: true, ...over,
});
assert.equal(gate(), true);
assert.equal(gate({ over: true }), false);
assert.equal(gate({ hasTarget: false }), false);
assert.equal(gate({ modeAllowed: false }), false);
assert.equal(gate({ boardActionLocked: true }), false);
assert.equal(gate({ count: 0 }), false);
assert.equal(gate({ count: 1, available: false }), false);
const clearAt = keluTiming(1).clearAt;
assert.equal(canAcceptTreasurePress({ over: false, hasTarget: true, modeAllowed: true, boardActionLocked: false, isKelu: true, now: 1000, keluUnlockAt: 1000 + clearAt, count: 2, available: true }), false, '斷風輪在 clearAt 前不可再按');
assert.equal(canAcceptTreasurePress({ over: false, hasTarget: true, modeAllowed: true, boardActionLocked: false, isKelu: true, now: 1000 + clearAt, keluUnlockAt: 1000 + clearAt, count: 2, available: true }), true, '斷風輪 clearAt 當下可再按');
assert.ok(clearAt < OTHER_TREASURE_CLEAR_MS);
assert.equal(isKeluWeapon('AIR', 4), true);

// 庫存顯示：1 件按一次後變 0（既有沒庫存＝disabled），不會是看得到卻按不了的正數死按鈕
const one = [{ element: 'WATER', variant: 0, count: 1, available: true }];
const afterOne = decrementTreasureCatalog(one, 'WATER', 0);
assert.equal(afterOne[0].count, 0);
assert.equal(gate({ count: afterOne[0].count }), false);

// --- 伺服端連續 3 次使用：每次獨立 actionId，庫存 3→2→1→0，不會變負、不會重複扣 ---
let book = T.emptyTreasureBook();
book.counts.WATER = 3;
const damages = [];
const catalogs = [];
for (let i = 1; i <= 3; i++) {
  const r = T.resolveTreasureUse({ ...base, treasures: book, actionId: 'rapid-water-' + i, foes: base.foes.map(f => ({ ...f })) }, 'WATER');
  assert.equal(r.book.counts.WATER, 3 - i);
  assert.ok(r.effect.damage > 0, '第 ' + i + ' 次必須造成傷害');
  assert.equal(r.effect.id, 'rapid-water-' + i);
  damages.push(r.effect.damage);
  catalogs.push(r.catalog.find(c => c.element === 'WATER' && c.variant === 0).count);
  book = r.book;
}
assert.deepEqual(catalogs, [2, 1, 0]);
assert.equal(book.counts.WATER, 0);
assert.throws(() => T.resolveTreasureUse({ ...base, treasures: book, actionId: 'rapid-water-4' }, 'WATER'), /沒有可使用的寶器/);
assert.throws(() => T.resolveTreasureUse({ ...base, treasures: book, actionId: 'rapid-water-3' }, 'WATER'), /已處理/);

// 同一本書、相同 actionId 不可扣兩次
book = T.emptyTreasureBook(); book.counts.FIRE = 2;
const first = T.resolveTreasureUse({ ...base, treasures: book, actionId: 'same-id' }, 'FIRE');
assert.equal(first.book.counts.FIRE, 1);
assert.throws(() => T.resolveTreasureUse({ ...base, treasures: first.book, actionId: 'same-id' }, 'FIRE'), /已處理/);

// --- 每次按都留下自己的飛行動畫，不會被下一次蓋掉 ---
let flights = [];
flights = upsertTreasureFlight(flights, { effect: { id: 'a1' }, intent: false });
flights = upsertTreasureFlight(flights, { effect: { id: 'a2' }, intent: false });
assert.equal(flights.length, 2);
assert.deepEqual(flights.map(f => f.effect.id), ['a1', 'a2']);
flights = upsertTreasureFlight(flights, { effect: { id: 'a1', damage: 9 }, intent: false });
assert.equal(flights.length, 2);
assert.equal(flights[0].effect.damage, 9);
flights = removeTreasureFlight(flights, 'a1');
assert.deepEqual(flights.map(f => f.effect.id), ['a2']);

// --- 擊倒後預熱：resume=false 時不把新目標加進去 ---
const all = [{ foeId: 'old' }, { foeId: 'next' }];
assert.deepEqual(deathWarmTargets(all, { deathPending: true, warmFreeze: ['old'], resume: true, hold: null }).map(x => x.foeId), ['old']);
assert.deepEqual(deathWarmTargets(all, { deathPending: false, warmFreeze: ['old'], resume: false, hold: ['old'] }).map(x => x.foeId), ['old']);
assert.deepEqual(deathWarmTargets(all, { deathPending: false, warmFreeze: ['old'], resume: true, hold: ['old'] }).map(x => x.foeId), ['old', 'next']);


const boardSrc = fs.readFileSync(path.resolve(__dirname, '../components/battlefield/Match3Board.tsx'), 'utf8');
assert.match(boardSrc, /treasureFlights\.map\(flight => <TreasureAnimation key=\{flight\.effect\.id\} flight=\{flight\}\/>\)/);
assert.match(boardSrc, /disabled=\{\!\!over \|\| \(busy && treasureVisuals === 0\)\}/);
assert.match(boardSrc, /canAcceptTreasurePress/);
assert.match(boardSrc, /requestIdleCallback\(kick, \{ timeout: 200 \}\)/);
assert.doesNotMatch(boardSrc, /disabled=\{busy \|\| \!\!over\}/);
assert.doesNotMatch(boardSrc, /if \(busy \|\| turnRequest\.current\) return;[\s\S]{0,200}treasureElement/);

console.log('beast-match3-treasure-rapid-fire.test.cjs ok', { damages, catalogs });
