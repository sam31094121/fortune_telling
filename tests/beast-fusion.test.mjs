/**
 * 封印寶珠 × 暴怒合體 V2 守門
 *
 * 鎖住三件事：寶珠再多也不能亂合體、相生只有一張表、狀態機不能跳關。
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripComments } from './helpers/strip-comments.mjs';
import {
  isElementCompatible,
  checkFusionCompatibility,
  resolveFusionTier,
  unlockedUltimates,
  evaluateFusion,
  canFuse,
  rageStage,
  canTransitionFusion,
  transitionFusion,
  bossCounterOptions,
  ULTIMATE_LABEL,
  BOSS_COUNTER_TELEGRAPH_MS,
} from '../.beast-game-build/lib/beast-game/fusion.js';
import { ELEMENTS, elementGenerates } from '../.beast-game-build/lib/beast-game/elements.js';

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  console.log(`PASS  ${name}`);
};

const card = (id, element, fusionBonds) => ({ id, name: id, element, fusionBonds });
const base = (overrides = {}) => ({
  cardA: card('water', 'WATER'),
  cardB: card('air', 'AIR'),
  rage: 70,
  availableOrbs: 3,
  bothAlive: true,
  controlled: false,
  bossSealActive: false,
  fusionCooldown: 0,
  ...overrides,
});

check('相生沿用 elements.ts 唯一一張表', () => {
  for (const a of ELEMENTS) {
    for (const b of ELEMENTS) {
      assert.equal(
        isElementCompatible(card('a', a), card('b', b)),
        elementGenerates(a, b) || elementGenerates(b, a),
        `${a}+${b}`,
      );
    }
  }
  const source = stripComments(fs.readFileSync('lib/beast-game/fusion.ts', 'utf8'));
  assert.doesNotMatch(source, /SPACE\s*:\s*['"](AIR|WATER|FIRE|EARTH)['"]/, '不得在合體模組另立相生表');
});

check('寶珠再多，不相生也沒羈絆就不能合', () => {
  assert.equal(elementGenerates('SPACE', 'FIRE') || elementGenerates('FIRE', 'SPACE'), false);
  const result = evaluateFusion(base({ cardA: card('s', 'SPACE'), cardB: card('f', 'FIRE'), availableOrbs: 5, rage: 100 }));
  assert.equal(result.ready, false);
  assert.equal(result.tier, 'NONE');
  assert.deepEqual(result.blockers, ['NOT_COMPATIBLE']);
  assert.deepEqual(result.ultimates, []);
});

check('羈絆：搭檔／血脈／宿命可合，秘密不行，對手要暴怒 80', () => {
  const bonded = (type, rage = 0, onSecond = false) => {
    const a = card('s', 'SPACE', onSecond ? undefined : [{ targetId: 'f', type }]);
    const b = card('f', 'FIRE', onSecond ? [{ targetId: 's', type }] : undefined);
    return checkFusionCompatibility(a, b, rage);
  };
  for (const type of ['PARTNER', 'BLOODLINE', 'DESTINED']) {
    assert.deepEqual(bonded(type), { compatible: true, via: type });
    assert.deepEqual(bonded(type, 0, true), { compatible: true, via: type }, '羈絆寫在任一張都算');
  }
  assert.equal(bonded('SECRET', 100).compatible, false);
  assert.equal(bonded('RIVAL', 79).compatible, false);
  assert.deepEqual(bonded('RIVAL', 80), { compatible: true, via: 'RIVAL' });
  assert.equal(checkFusionCompatibility(card('x', 'WATER'), card('x', 'AIR'), 100).compatible, false, '不能跟自己合');
});

check('合體等級門檻', () => {
  const table = [
    [0, 100, 'NONE'], [1, 0, 'RESONANCE'], [2, 49, 'RESONANCE'], [2, 50, 'DUAL_UNSEAL'],
    [3, 69, 'DUAL_UNSEAL'], [3, 70, 'TRUE_FUSION'], [4, 100, 'TRUE_FUSION'], [5, 99, 'TRUE_FUSION'],
    [5, 100, 'RAGE_ULTIMATE'], [9, 250, 'RAGE_ULTIMATE'], [-1, -5, 'NONE'], [Number.NaN, 100, 'NONE'],
  ];
  for (const [orbs, rage, tier] of table) assert.equal(resolveFusionTier(orbs, rage), tier, `${orbs}珠/${rage}`);
});

check('合體資格逐項把關，擋下時講得出原因', () => {
  const ok = evaluateFusion(base());
  assert.equal(ok.ready, true);
  assert.equal(ok.tier, 'TRUE_FUSION');
  assert.equal(canFuse(base()), true);

  const cases = [
    [{ controlled: true }, ['CONTROLLED'], 'RESONANCE'],
    [{ bossSealActive: true }, ['BOSS_SEAL'], 'RESONANCE'],
    [{ fusionCooldown: 1 }, ['COOLDOWN'], 'RESONANCE'],
    [{ bothAlive: false }, ['NOT_ALIVE'], 'NONE'],
    [{ availableOrbs: 1 }, ['ORBS'], 'RESONANCE'],
    [{ availableOrbs: 0 }, ['ORBS'], 'NONE'],
    [{ availableOrbs: 2, rage: 49 }, ['RAGE'], 'RESONANCE'],
  ];
  for (const [overrides, blockers, tier] of cases) {
    const result = evaluateFusion(base(overrides));
    assert.equal(result.ready, false, JSON.stringify(overrides));
    assert.deepEqual(result.blockers, blockers);
    assert.equal(result.tier, tier);
    assert.deepEqual(result.ultimates, [], '沒合成就不能開大絕');
  }
});

check('三大絕招在真合體解鎖，究極技只屬五珠＋暴怒 100', () => {
  assert.deepEqual(unlockedUltimates('DUAL_UNSEAL'), []);
  assert.deepEqual(unlockedUltimates('TRUE_FUSION'), ['SEAL_BREAKER', 'RAGE_QUAKE', 'HEAVEN_EARTH_DESTRUCTION']);
  assert.deepEqual(unlockedUltimates('RAGE_ULTIMATE'), ['SEAL_BREAKER', 'RAGE_QUAKE', 'HEAVEN_EARTH_DESTRUCTION', 'RAGE_WORLD_END']);
  assert.equal(new Set(Object.values(ULTIMATE_LABEL)).size, 4, '四招不能同名');
  assert.equal(evaluateFusion(base({ availableOrbs: 5, rage: 100 })).tier, 'RAGE_ULTIMATE');
});

check('暴怒階段邊界', () => {
  for (const [rage, stage] of [[0, 'CALM'], [39, 'CALM'], [40, 'AWAKENING'], [69, 'AWAKENING'], [70, 'RAGING'], [99, 'RAGING'], [100, 'MAX_RAGE']]) {
    assert.equal(rageStage(rage), stage, String(rage));
  }
});

check('狀態機不能跳關，合體中與大絕施放互斥', () => {
  const path = ['IDLE', 'SYNERGY_CHECK', 'ORB_RESONANCE', 'UNSEALING', 'FUSION_READY', 'FUSING', 'FUSION_ACTIVE', 'ULTIMATE_READY', 'ULTIMATE_CASTING', 'COOLDOWN', 'IDLE'];
  let state = path[0];
  for (const next of path.slice(1)) state = transitionFusion(state, next);
  assert.equal(state, 'IDLE');

  assert.throws(() => transitionFusion('FUSING', 'ULTIMATE_CASTING'));
  assert.throws(() => transitionFusion('ULTIMATE_CASTING', 'FUSING'));
  assert.throws(() => transitionFusion('IDLE', 'FUSING'));
  assert.throws(() => transitionFusion('ORB_RESONANCE', 'FUSION_ACTIVE'));

  const states = path.slice(0, -1);
  for (const from of states) {
    const seen = new Set([from]);
    const queue = [from];
    while (queue.length) {
      const current = queue.shift();
      for (const to of states) if (canTransitionFusion(current, to) && !seen.has(to)) { seen.add(to); queue.push(to); }
    }
    assert.ok(seen.has('IDLE'), `${from} 必須回得到 IDLE，否則會卡死`);
    if (from === 'IDLE') assert.equal(seen.size, states.length, '每個狀態都要走得到');
  }
});

check('首領反制只在困難模式，而且一律先蓄力', () => {
  for (const difficulty of ['EASY', 'NORMAL']) {
    assert.deepEqual(bossCounterOptions(difficulty, 5, 100, 'ULTIMATE_READY'), []);
  }
  const names = (...args) => bossCounterOptions('HARD', ...args).map((option) => option.counter);
  assert.deepEqual(names(1, 100, 'IDLE'), []);
  for (const orbs of [2, 3, 4]) assert.ok(names(orbs, 0, 'IDLE').includes('ORB_SEAL'));
  assert.ok(names(3, 70, 'FUSION_ACTIVE').includes('FUSION_BREAK'));
  assert.ok(!names(3, 70, 'IDLE').includes('FUSION_BREAK'));
  assert.deepEqual(names(5, 100, 'ULTIMATE_READY'), ['DESPERATION_MODE']);
  for (const option of bossCounterOptions('HARD', 3, 70, 'FUSION_ACTIVE')) {
    assert.ok(option.telegraphMs >= 1000, '反制要看得到才防得住');
  }
  assert.equal(BOSS_COUNTER_TELEGRAPH_MS, 1200);
});

check('規則層不擲骰、不碰畫面', () => {
  const source = stripComments(fs.readFileSync('lib/beast-game/fusion.ts', 'utf8'));
  assert.doesNotMatch(source, /Math\.random|Date\.now|performance\.now/);
  assert.doesNotMatch(source, /from ['"](react|next)|components\//);
});

check('規則寫進唯一的技能檔案', () => {
  const doc = fs.readFileSync('docs/beast-game-skill.md', 'utf8');
  assert.ok(doc.includes('封印寶珠 × 暴怒合體 V2'));
  assert.ok(doc.includes('暴怒合體升級（已接入三卡免費戰場）'), '接入範圍要寫清楚，沒接的戰場不得宣稱');
});

console.log(`\n封印寶珠 × 暴怒合體 V2 — PASS ${passed}`);
