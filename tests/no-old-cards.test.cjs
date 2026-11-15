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
// AUDIT-2 M7（fix-3）：修正誤判，不放寬。
// (1) 'beast_g_' 只在 startsWith('beast_g_') 這種「正式四象 ID 前綴」寫法時視為新卡；其他地方出現照樣算舊卡 ID。
// (2) 字串相加組出的路徑（'/beast-game/thumb/young-' + n + '.v2-480.webp'）先還原成完整路徑再檢查；結尾不是 .v2 照樣擋。
const NEW_ID_PREFIX_USE = /startsWith\(\s*['"]beast_g_['"]\s*\)/g;
const CONCAT_PATH = /(['"])(\/beast-game\/(?:thumb|front)\/(?:young|adult|guardian)-)\1\s*\+\s*(?:[^;'"`\n]|'[^'\n]*'|"[^"\n]*")+?\+\s*(['"])(\.[a-z0-9.-]+)\3/g;
const joinConcat = s => s.replace(CONCAT_PATH, (_, _q1, head, _q3, tail) => `'${head}00${tail}'`);
function scanSource(rel, raw) {
  const out = []; const s = joinConcat(raw);
  if (/<img\b[^>]*src=\{[^}]*\.thumbnail\b/.test(s)) out.push(`${rel}: 以 <img> 直接畫卡圖（應改 FrameV1Tile）`);
  const ids = s.replace(NEW_ID_PREFIX_USE, 'startsWith(NEW_GUARDIAN_PREFIX)');
  for (const m of ids.matchAll(/\bbeast_[a-z0-9_]+\b/g)) if (!NEW_ID.test(m[0]) && !NON_CARD.test(m[0])) out.push(`${rel}: 舊卡 ID ${m[0]}`);
  const im = s.match(OLD_IMG); if (im) out.push(`${rel}: 舊圖路徑 ${im[0]}`);
  return out;
}
// 守門自我檢查：真正的舊卡寫法一定要被抓到（避免這次修正把規則放寬）。
for (const [bad, why] of [
  ["const id = 'beast_young_01';", '舊卡 ID'], ["if (id === 'beast_g_') {}", '前綴不是用在 startsWith'], ["id.startsWith('beast_old_')", '舊前綴'],
  ["const u = '/beast-game/thumb/young-01.webp';", '舊圖路徑'], ["const u = '/beast-game/thumb/young-' + n + '.webp';", '相加後仍是舊圖'],
  ['<img src={card.thumbnail} />', '直接 <img>'],
]) assert.ok(scanSource('self-test', bad).length > 0, `守門自我檢查失敗（${why}）：${bad}`);
for (const ok of ["c.id.startsWith('beast_g_')", "'/beast-game/thumb/adult-' + a[1].padStart(2, '0') + '.v2-480.webp'"]) assert.deepEqual(scanSource('self-test', ok), [], `正式寫法不應誤判：${ok}`);
assert.equal(joinConcat("'/beast-game/thumb/adult-' + a[1].padStart(2, '0') + '.v2-480.webp'"), "'/beast-game/thumb/adult-00.v2-480.webp'", '相加路徑還原');
assert.equal(joinConcat("'/beast-game/thumb/young-' + n + '.webp'"), "'/beast-game/thumb/young-00.webp'", '相加舊圖還原後仍是舊圖');
const errs = [];
for (const f of BATTLE) errs.push(...scanSource(f.replace(/\\/g, '/'), rd(f)));
// 對戰卡池（cards/beasts → registry）只能有新卡 ID
for (const f of walk('cards/beasts')) for (const m of rd(f).matchAll(/\bid:\s*['"]([^'"]+)['"]/g)) if (/^beast_/.test(m[1]) && !NEW_ID.test(m[1])) errs.push(`${f}: 對戰卡池含舊卡 ID ${m[1]}`);
// 新框元件本身：卡面只能從 ART_V2 取 v2 圖
// 業主驗收過的修補圖：只認這兩個檔名，而且內容要能證明來自正式 v2 原圖（同 beast-match3-no-old-cards 的作法），否則照樣當舊圖。
//  - adult-01.tail-leaf-v3.webp：角木蛟尾巴修補，業主接受（reports/beast-rig-review/jiaomujiao-2026-11-08/static-card-acceptance.md），
//    該報告寫明 adult-01.v2.webp 也換成同一張圖 → 兩檔必須逐位元組相同。
//  - young-01.hind-paw-v1.svg：幼子後腳修補，SVG 內嵌的底圖必須和正式 young-01.v2.webp 逐位元組相同，且不得有腳本或遠端來源。
const pub = p => path.join(root, 'public', p.replace(/^\//, '').split('?')[0]);
const ACCEPTED_REPAIRS = {
  '/beast-game/front/adult-01.tail-leaf-v3.webp': () => fs.existsSync(pub('/beast-game/front/adult-01.tail-leaf-v3.webp')) && fs.readFileSync(pub('/beast-game/front/adult-01.tail-leaf-v3.webp')).equals(fs.readFileSync(pub('/beast-game/front/adult-01.v2.webp'))),
  '/beast-game/front/young-01.hind-paw-v1.svg': () => {
    if (!fs.existsSync(pub('/beast-game/front/young-01.hind-paw-v1.svg'))) return false;
    const svg = fs.readFileSync(pub('/beast-game/front/young-01.hind-paw-v1.svg'), 'utf8'); const emb = svg.match(/data:image\/webp;base64,([^"']+)/);
    return !!emb && Buffer.from(emb[1], 'base64').equals(fs.readFileSync(pub('/beast-game/front/young-01.v2.webp'))) && !/<script\b|\bon\w+\s*=|(?:href|src)=["'](?:https?:|\/\/)/i.test(svg);
  },
};
const acceptedRepair = p => Object.prototype.hasOwnProperty.call(ACCEPTED_REPAIRS, p) && ACCEPTED_REPAIRS[p]();
const tile = joinConcat(rd('components/battlefield/BeastCardTile.tsx'));
const v2 = [...tile.matchAll(/\/beast-game\/(?:thumb|front)\/[^'"`?]+/g)].map(m => m[0]);
assert.ok(v2.length >= 60 * 3, 'ART_V2 應涵蓋 60 張卡');
for (const p of v2) if (!/\.v2(-480)?\.webp(\?v=\d+)?$/.test(p) && !acceptedRepair(p)) errs.push(`BeastCardTile.tsx: 非 v2 圖 ${p}`);
assert.ok(!fs.existsSync(path.join(root, 'public/beast-game/_orig-20261023')), '舊原圖備份資料夾不應留在 public');
// 卡片資料（cards/beasts）與產生器不得再指向舊圖路徑
for (const f of [...walk('cards/beasts'), 'scripts/gen-beast-cards.mjs']) { const s = fs.existsSync(path.join(root, f)) ? rd(f) : ''; const g = s.replace(/\\$\{[^}]+\}/g, '00').replace(/\$\{[^}]+\}/g, '00'); for (const m of g.matchAll(new RegExp(OLD_IMG.source, 'g'))) errs.push(`: 資料含舊圖路徑 ${m[0]}`); }
// public/beast-game/{thumb,front} 只能留 v2 卡圖
for (const d of ['thumb', 'front']) { const a = path.join(root, 'public/beast-game', d); if (fs.existsSync(a)) for (const n of fs.readdirSync(a)) if (/^(young|adult|guardian)-/.test(n) && !/\.v2(-480)?\.webp$/.test(n) && !acceptedRepair(`/beast-game/${d}/${n}`)) errs.push(`public/beast-game/${d}/${n}: 舊卡圖檔仍在 public`); }
if (errs.length) { console.error(errs.join('\n')); assert.fail(`舊卡殘留 ${errs.length} 處`); }
console.log(`no-old-cards: OK（掃描 ${BATTLE.length} 個對戰檔案）`);
