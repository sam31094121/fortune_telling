/**
 * EffectComposer：依合體結果挑選 4～8 個真實登記素材，決定性、不擲骰。
 */
import assert from 'node:assert/strict';
import { stripComments } from './helpers/strip-comments.mjs';
import fs from 'node:fs';
import {
  composeBattleEffects,
  composeBattleEffectIds,
  EFFECT_PICK_MIN,
  EFFECT_PICK_MAX,
} from '../.beast-game-build/lib/beast-game/effect-composer.js';
import { battleAssets } from '../.beast-game-build/lib/beast-game/battle-assets.js';

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  console.log(`PASS  ${name}`);
};

check('合體階層愈高，挑選數量落在 4～8，且皆為登記素材', () => {
  for (const tier of ['NONE', 'RESONANCE', 'DUAL_UNSEAL', 'TRUE_FUSION', 'RAGE_ULTIMATE']) {
    const result = composeBattleEffects({ tier, element: 'SPACE', cardIds: ['beast_a01'] });
    assert.ok(result.assets.length >= EFFECT_PICK_MIN, `${tier} 太少：${result.assets.length}`);
    assert.ok(result.assets.length <= EFFECT_PICK_MAX, `${tier} 太多：${result.assets.length}`);
    for (const asset of result.assets) {
      assert.ok(battleAssets().some((row) => row.assetId === asset.assetId));
    }
  }
});

check('同輸入兩次結果完全一致（無 Math.random）', () => {
  const a = composeBattleEffectIds({ tier: 'TRUE_FUSION', element: 'FIRE', cardIds: ['beast_a02'] });
  const b = composeBattleEffectIds({ tier: 'TRUE_FUSION', element: 'FIRE', cardIds: ['beast_a02'] });
  assert.deepEqual(a, b);
});

check('手機模式不挑非 mobileSafe／視訊', () => {
  const result = composeBattleEffects({
    tier: 'RAGE_ULTIMATE',
    element: 'WATER',
    cardIds: ['beast_a01'],
    mobile: true,
  });
  for (const asset of result.assets) {
    assert.equal(asset.mobileSafe, true);
    assert.notEqual(asset.type, 'WEBM');
    assert.notEqual(asset.type, 'MP4');
  }
});

check('reducedMotion 不挑螢幕震動與強度 5', () => {
  const result = composeBattleEffects({
    tier: 'RAGE_ULTIMATE',
    reducedMotion: true,
  });
  for (const asset of result.assets) {
    assert.notEqual(asset.category, 'SCREEN_SHAKE');
    assert.ok(asset.intensity < 5);
  }
});

check('專屬卡衝鋒片不會出現在錯誤 cardId', () => {
  const without = composeBattleEffects({ tier: 'TRUE_FUSION', cardIds: ['beast_a99'] });
  assert.ok(without.assets.every((a) => a.cardId !== 'beast_a01'));
});

check('原始碼禁止亂數與 React', () => {
  const source = stripComments(fs.readFileSync('lib/beast-game/effect-composer.ts', 'utf8'));
  assert.doesNotMatch(source, /Math\.random|Date\.now|from ['"](react|next)/);
});

console.log(`\nEffectComposer 測試 PASS ${passed}`);
