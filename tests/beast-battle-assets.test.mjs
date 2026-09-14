/**
 * 戰鬥素材登記表守門：只准登記真的存在的東西，數量由核對得出，不准寫死。
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripComments } from './helpers/strip-comments.mjs';
import { auditBattleAssets } from '../scripts/audit-battle-assets.mjs';
import {
  BATTLE_ASSET_CATEGORIES,
  battleAssets,
  getBattleAsset,
  registerBattleAsset,
  assetsInCategory,
} from '../.beast-game-build/lib/beast-game/battle-assets.js';

let passed = 0;
const check = async (name, fn) => {
  await fn();
  passed += 1;
  console.log(`PASS  ${name}`);
};

const report = await auditBattleAssets();

await check('23 類分類架構完整，沒有多也沒有少', () => {
  assert.equal(BATTLE_ASSET_CATEGORIES.length, 23);
  assert.equal(new Set(BATTLE_ASSET_CATEGORIES).size, 23);
});

await check('每一項登記都對得上實體檔案或真實 CSS 動畫', () => {
  assert.deepEqual(report.brokenEntries, [], JSON.stringify(report.brokenEntries, null, 2));
});

await check('找到幾類是核對出來的，不是宣稱出來的', () => {
  const counted = BATTLE_ASSET_CATEGORIES.filter((category) => assetsInCategory(category).length > 0).length;
  assert.equal(report.foundCategories, counted);
  assert.equal(report.totalCategories - report.foundCategories, report.missingCategories.length);
  for (const category of report.missingCategories) assert.equal(assetsInCategory(category).length, 0);
});

await check('編號與路徑不重複，重複登記與查無素材都會報錯', () => {
  const assets = battleAssets();
  assert.equal(new Set(assets.map((asset) => asset.assetId)).size, assets.length);
  const mediaPaths = assets.filter((asset) => asset.kind === 'MEDIA').map((asset) => asset.path);
  assert.equal(new Set(mediaPaths).size, mediaPaths.length, '同一個檔案不得登記兩次');
  assert.throws(() => registerBattleAsset(assets[0]), /DUPLICATE_BATTLE_ASSET:BFX_001/);
  assert.throws(() => getBattleAsset('BFX_999'), /BATTLE_ASSET_NOT_FOUND:BFX_999/);
  assert.equal(battleAssets().length, assets.length, '失敗的重複登記不得改動登記表');
});

await check('登記表不引用任何不存在的檔案', () => {
  const registered = new Set(battleAssets().map((asset) => asset.path));
  for (const row of report.missingReferences) assert.ok(!registered.has(row.path), `${row.path} 不存在卻被登記`);
});

await check('本體衝鋒影片只綁自己那張卡', () => {
  for (const asset of battleAssets().filter((item) => item.type === 'WEBM' || item.type === 'MP4')) {
    assert.ok(asset.cardId, `${asset.assetId} 影片必須綁定卡片`);
  }
});

await check('素材登記表不擲骰、不碰畫面', () => {
  const source = stripComments(fs.readFileSync('lib/beast-game/battle-assets.ts', 'utf8'));
  assert.doesNotMatch(source, /Math\.random|Date\.now|from ['"](react|next)/);
});

await check('盤點結果寫進唯一的技能檔案', () => {
  const doc = fs.readFileSync('docs/beast-game-skill.md', 'utf8');
  assert.ok(doc.includes('戰鬥素材登記表'));
  assert.ok(doc.includes('npm run audit:battle-assets'));
});

console.log(`\nFOUND = ${report.foundCategories} / ${report.totalCategories}（實體媒體 ${report.mediaCategories} 類）`);
console.log(`缺少分類：${report.missingCategories.join('、') || '無'}`);
console.log(`程式引用了卻不存在：${report.missingReferences.length} 個`);
console.log(`戰鬥素材登記表 — PASS ${passed}`);
