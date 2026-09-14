/**
 * 暴怒合體升級守門：相生出招才解封魔珠、受傷才累積暴怒、等級與加成跟規則層一致。
 */

import assert from 'node:assert/strict';
import {
  newMatch,
  advance,
  interactiveCatalog,
  RAGE_TIERS,
  RAGE_ATTACK_BONUS,
  rageTierInfo,
} from '../.beast-game-build/lib/beast-game/interactive.js';
import { rageFusionGuide } from '../.beast-game-build/lib/beast-game/rage-guide.js';
import { resolveFusionTier } from '../.beast-game-build/lib/beast-game/fusion.js';

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  console.log(`PASS  ${name}`);
};

const cards = interactiveCatalog();
const id = (element) => cards.find((card) => card.element === element).id;
// 風生火：主戰火、後備風＝相生；主戰火、後備水＝不相生。
const paired = () => newMatch([id('FIRE'), id('AIR')], [id('FIRE'), id('AIR')], 21);
const unpaired = () => newMatch([id('FIRE'), id('WATER')], [id('EARTH'), id('WATER')], 21);
const hit = { type: 'ATTACK' };

check('等級表與規則層門檻一致，加成逐級提高', () => {
  assert.equal(RAGE_TIERS[0].tier, 'NONE');
  assert.equal(RAGE_TIERS[0].bonus, RAGE_ATTACK_BONUS, '基礎暴怒合體沿用原本加成');
  for (const tier of RAGE_TIERS) assert.equal(resolveFusionTier(tier.orbs, tier.rage), tier.tier);
  for (let i = 1; i < RAGE_TIERS.length; i += 1) assert.ok(RAGE_TIERS[i].bonus > RAGE_TIERS[i - 1].bonus);
});

check('開局魔珠與暴怒都是 0', () => {
  const s = paired();
  assert.equal(s.player.orbs, 0);
  assert.equal(s.player.rage, 0);
  assert.equal(rageTierInfo(s, 'player').tier, 'NONE');
});

check('有相生後備、出招打中才解封魔珠；沒有相生就不解封', () => {
  const s = advance(paired(), hit, hit);
  assert.equal(s.player.orbs, 1);
  assert.ok(s.log.some((entry) => entry.side === 'player' && entry.orbGained));
  const u = advance(unpaired(), hit, hit);
  assert.equal(u.player.orbs, 0);
  assert.ok(!u.log.some((entry) => entry.side === 'player' && entry.orbGained));
});

check('暴怒＝受到的傷害（含護盾）除以 2 無條件進位', () => {
  const s = paired();
  const next = advance(s, hit, hit);
  const before = s.player.team[0];
  const after = next.player.team[0];
  const lost = before.hp + before.shield - (after.hp + after.shield);
  assert.ok(lost > 0);
  assert.equal(next.player.rage, Math.ceil(lost / 2));
});

check('用過暴怒合體後魔珠與暴怒歸零，也不再累積', () => {
  const s = paired();
  s.player.orbs = 2;
  s.player.rage = 60;
  const used = advance(s, { type: 'RAGE' }, hit);
  assert.equal(used.player.rageAvailable, 0);
  assert.equal(used.player.orbs, 0);
  const later = advance(used, hit, hit);
  assert.equal(later.player.orbs, 0);
  assert.equal(later.player.rage, 0);
});

check('等級越高打得越重；真合體以上先擊碎護盾', () => {
  const damageAt = (orbs, rage) => {
    const s = paired();
    s.player.orbs = orbs;
    s.player.rage = rage;
    s.opponent.team[0].shield = 40;
    const next = advance(s, { type: 'RAGE' }, hit);
    const entry = next.log.find((item) => item.side === 'player' && item.action === 'RAGE');
    const target = next.opponent.team[0];
    return { lost: 160 + 40 - (target.hp + target.shield), entry };
  };
  const base = damageAt(0, 0);
  const dual = damageAt(2, 50);
  const trueFusion = damageAt(3, 70);
  const ultimate = damageAt(5, 100);
  assert.equal(base.entry.fusionTier, 'NONE');
  assert.equal(dual.entry.fusionTier, 'DUAL_UNSEAL');
  assert.equal(trueFusion.entry.fusionTier, 'TRUE_FUSION');
  assert.equal(ultimate.entry.fusionTier, 'RAGE_ULTIMATE');
  assert.ok(dual.lost > base.lost && trueFusion.lost > dual.lost && ultimate.lost > trueFusion.lost);
  assert.doesNotMatch(dual.entry.text, /破封斬/);
  assert.match(trueFusion.entry.text, /迴天滅地/);
  assert.match(trueFusion.entry.text, /破封斬：擊碎護盾 40/);
  assert.match(ultimate.entry.text, /暴怒・天地終焉/);
});

check('舊存檔沒有魔珠與暴怒欄位也能照打', () => {
  const s = paired();
  delete s.player.orbs;
  delete s.player.rage;
  const next = advance(s, hit, hit);
  assert.equal(next.player.orbs, 1);
  assert.ok(next.player.rage > 0);
});

check('同一狀態同一操作重播結果相同，且不改動輸入', () => {
  const s = paired();
  s.player.orbs = 3;
  s.player.rage = 70;
  const frozen = JSON.stringify(s);
  assert.deepEqual(advance(s, { type: 'RAGE' }, hit), advance(s, { type: 'RAGE' }, hit));
  assert.equal(JSON.stringify(s), frozen);
});

check('教學三步驟照真實狀態回報', () => {
  const s = paired();
  const guide = rageFusionGuide(s, 'player');
  assert.equal(guide.steps[0].done, true);
  assert.equal(guide.partnerCardId, s.player.team[1].cardId);
  assert.equal(guide.steps[1].value, '0/5');
  assert.match(guide.headline, /現在可放「暴怒合體」.*雙珠解封/);
  assert.equal(guide.ladder.filter((row) => row.current).length, 1);

  const none = rageFusionGuide(unpaired(), 'player');
  assert.equal(none.steps[0].done, false);
  assert.equal(none.headline, '先湊齊相生卡，才能暴怒合體');
  assert.equal(none.partnerCardId, null);

  const top = paired();
  top.player.orbs = 5;
  top.player.rage = 100;
  assert.match(rageFusionGuide(top, 'player').headline, /已達究極/);

  const used = paired();
  used.player.rageAvailable = 0;
  assert.equal(rageFusionGuide(used, 'player').headline, '本場暴怒合體已使用');
});

console.log(`\n暴怒合體升級 — PASS ${passed}`);
