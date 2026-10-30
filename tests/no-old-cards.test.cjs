'use strict';
/* 舊卡防回歸：對戰相關畫面不得出現舊卡 ID、舊圖路徑、非 v2 卡圖。
 * 2026-10-30：正式站 main 已統一用 BeastCardFace（a513fb6），其內部仍以 BeastCardFrame.module.css 當 63:88 外殼，
 * 那是卡框樣式不是舊卡，故移除「frameStyles／BeastCardFrame」規則；卡圖可帶 ?v=N 快取參數。 */
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const walk = (d, o = []) => { const a = path.join(root, d); if (!fs.existsSync(a)) return o; for (const e of fs.readdirSync(a, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p, o) : /\.(tsx?|json)$/.test(e.name) && o.push(p); } return o; };
const BATTLE = [
  'components/BeastLegacyGame.tsx', 'components/BeastDuelRitual.tsx', 'components/GrowthStakeSlots.tsx',
  'components/BeastStakeResult.tsx', 'components/BeastTurnGame.tsx', 'components/BeastTechCard.tsx',
  'components/BeastWagerPanel.tsx', 'components/DuelCollectionShelf.tsx',
  ...walk('components/battlefield').filter(f => !/BeastCardTile\.tsx$/.test(f) && /\.tsx$/.test(f)),
  ...walk('app/beast-game'),
];
const NEW_ID = /^beast_(g_[a-z]+|[ay]\d{2})$/;
const NON_CARD = /^beast_(game_[a-z0-9_]+|turn_account|count)$/; // 儲存鍵、統計欄位，不是卡
const OLD_IMG = /\/beast-game\/(?:(?:thumb|front)\/(?:young|adult|guardian)-[a-z0-9]+(?:-\d+)?\.(?:webp|png|jpe?g)|_orig-\d+)/;
const errs = [];
for (const f of BATTLE) {
  const s = rd(f); const rel = f.replace(/\\/g, '/');
  if (/<img\b[^>]*src=\{[^}]*\.thumbnail\b/.test(s)) errs.push(`${rel}: 以 <img> 直接畫卡圖（應改 FrameV1Tile）`);
  for (const m of s.matchAll(/\bbeast_[a-z0-9_]+\b/g)) if (!NEW_ID.test(m[0]) && !NON_CARD.test(m[0])) errs.push(`${rel}: 舊卡 ID ${m[0]}`);
  const im = s.match(OLD_IMG); if (im) errs.push(`${rel}: 舊圖路徑 ${im[0]}`);
}
// 對戰卡池（cards/beasts → registry）只能有新卡 ID
for (const f of walk('cards/beasts')) for (const m of rd(f).matchAll(/\bid:\s*['"]([^'"]+)['"]/g)) if (/^beast_/.test(m[1]) && !NEW_ID.test(m[1])) errs.push(`${f}: 對戰卡池含舊卡 ID ${m[1]}`);
// 新框元件本身：卡面只能從 ART_V2 取 v2 圖
const tile = rd('components/battlefield/BeastCardTile.tsx');
const v2 = [...tile.matchAll(/\/beast-game\/(?:thumb|front)\/[^'"`?]+/g)].map(m => m[0]);
assert.ok(v2.length >= 60 * 3, 'ART_V2 應涵蓋 60 張卡');
for (const p of v2) if (!/\.v2(-480)?\.webp(\?v=\d+)?$/.test(p)) errs.push(`BeastCardTile.tsx: 非 v2 圖 ${p}`);
assert.ok(!fs.existsSync(path.join(root, 'public/beast-game/_orig-20261023')), '舊原圖備份資料夾不應留在 public');
// 卡片資料（cards/beasts）與產生器不得再指向舊圖路徑
for (const f of [...walk('cards/beasts'), 'scripts/gen-beast-cards.mjs']) { const s = fs.existsSync(path.join(root, f)) ? rd(f) : ''; const g = s.replace(/\\$\{[^}]+\}/g, '00').replace(/\$\{[^}]+\}/g, '00'); for (const m of g.matchAll(new RegExp(OLD_IMG.source, 'g'))) errs.push(`: 資料含舊圖路徑 ${m[0]}`); }
// public/beast-game/{thumb,front} 只能留 v2 卡圖
for (const d of ['thumb', 'front']) { const a = path.join(root, 'public/beast-game', d); if (fs.existsSync(a)) for (const n of fs.readdirSync(a)) if (/^(young|adult|guardian)-/.test(n) && !/\.v2(-480)?\.webp$/.test(n)) errs.push(`public/beast-game/${d}/${n}: 舊卡圖檔仍在 public`); }
if (errs.length) { console.error(errs.join('\n')); assert.fail(`舊卡殘留 ${errs.length} 處`); }
console.log(`no-old-cards: OK（掃描 ${BATTLE.length} 個對戰檔案）`);
