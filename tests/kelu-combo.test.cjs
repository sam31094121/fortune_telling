#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ready = spawnSync('node', [path.join(root, 'scripts/beast-build.mjs')], { cwd: root, stdio: 'inherit', env: process.env });
if (ready.status) process.exit(ready.status || 1);
const {
  isKeluWeapon, keluTiming, advanceKeluCombo, emptyKeluCombo,
  KELU_ELEMENT, KELU_VARIANT, KELU_NAME, KELU_COMBO_WINDOW_MS,
  OTHER_TREASURE_DAMAGE_MS, OTHER_TREASURE_CLEAR_MS,
} = require(path.join(root, '.beast-game-build/lib/beast-game/match3/kelu-combo.js'));

assert.equal(KELU_NAME, '斷風輪');
assert.equal(isKeluWeapon('AIR', 4), true);
assert.equal(isKeluWeapon('AIR', 3), false);
assert.equal(isKeluWeapon('FIRE', 4), false);
assert.equal(isKeluWeapon('WATER', 4), false);
assert.equal(isKeluWeapon('SPACE', 4), false);
assert.equal(isKeluWeapon('EARTH', 4), false);
assert.equal(KELU_ELEMENT, 'AIR');
assert.equal(KELU_VARIANT, 4);

const t1 = keluTiming(1);
const t2 = keluTiming(2);
const t3 = keluTiming(3);
const t9 = keluTiming(9);
assert.equal(t1.chain, 1);
assert.ok(t1.flightMs < OTHER_TREASURE_CLEAR_MS);
assert.ok(t1.damageAt < OTHER_TREASURE_DAMAGE_MS);
assert.ok(t1.clearAt < t1.flightMs || t1.clearAt <= 300);
assert.ok(t1.damageAt < t1.clearAt);
assert.ok(t2.flightMs < t1.flightMs && t2.damageAt < t1.damageAt && t2.clearAt < t1.clearAt);
assert.ok(t3.flightMs < t2.flightMs && t3.damageAt < t2.damageAt && t3.clearAt < t2.clearAt);
assert.deepEqual(t9.flightMs, t3.flightMs);
assert.equal(t9.chain, 9);
assert.equal(keluTiming(0).chain, 1);
assert.equal(keluTiming(-3).chain, 1);

let s = emptyKeluCombo();
assert.equal(s.chain, 0);
const a = advanceKeluCombo(s, 1000);
assert.equal(a.timing.chain, 1);
assert.equal(a.state.chain, 1);
assert.equal(a.state.expiresAt, 1000 + a.timing.clearAt + KELU_COMBO_WINDOW_MS);

const b = advanceKeluCombo(a.state, a.state.expiresAt);
assert.equal(b.timing.chain, 2);
const c = advanceKeluCombo(b.state, b.state.expiresAt);
assert.equal(c.timing.chain, 3);
const d = advanceKeluCombo(c.state, c.state.expiresAt + 1);
assert.equal(d.timing.chain, 1);
assert.equal(OTHER_TREASURE_DAMAGE_MS, 950);
assert.equal(OTHER_TREASURE_CLEAR_MS, 1900);
console.log('kelu-combo.test.cjs ok', { t1, t2, t3 });
