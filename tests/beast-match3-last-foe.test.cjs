// 敵方只剩最後一隻時放大成魔王般的大卡片（業主 2026-11-11）：結構守門。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const src = fs.readFileSync('components/battlefield/Match3Board.tsx', 'utf8');
assert(/const lastFoeReady = rigEnabled && foes\.length > 1 && !over && foes\.filter\(f => f\.hp > 0\)\.length === 1 && !guardianDuelReady;/.test(src), '最後一隻條件：敵方多於一隻、只剩一隻存活、尚未結束、守護獸決戰另走原路');
assert(/else if \(!busy\) setLastFoeSettled\(true\)/.test(src), '等本回合動畫結束才放大（不打斷死亡演出）');
assert(/const bigFoe = guardianDuel \|\| lastFoeBig;/.test(src));
assert(src.includes('data-guardian-duel={bigFoe || undefined} data-last-foe={lastFoeBig || undefined}'), '沿用決戰排版並標記最後一隻');
assert(!src.includes('rigSrc={lastFoe') && src.includes('rigSrc={guardianDuel && duelArt && i === 4 ? duelArt : f.thumbnail}'), '大圖仍只給守護獸，最後一隻用自己的卡圖');
assert(src.split('!bigFoe').length - 1 === 1, '欄位排版跟著放大狀態');
assert(src.includes("data-fused={rigEnabled ? (bigFoe ? 'duel' : true) : undefined}"), '一體成型幾何跟著放大狀態');
console.log('PASS last-foe enlarge structure');
// 我方最後一隻（業主手機實測回報）
assert(/const lastAllyReady = rigEnabled && team\.length > 1 && !over && team\.filter\(u => u\.hp > 0\)\.length === 1;/.test(src), '我方只剩一隻存活');
assert(/else if \(!busy\) setLastAllySettled\(true\)/.test(src), '我方放大也等動畫結束');
assert(src.includes('data-last-ally={lastAllyBig || undefined}'), '標記我方最後一隻');
const css = fs.readFileSync('components/battlefield/Match3Board.module.css', 'utf8');
assert(/\.team\[data-last-ally="true"\] \{ grid-template-columns: minmax\(0, min\(56%, 220px\)\)/.test(css) && /\.ally\[data-hp="0"\] \{ display: none; \}/.test(css), '放大排版與隱藏倒下的隊友');
assert(/.fusedUnit > .allyCard > img:first-child { object-fit: contain; object-position: 50% 50%; }/.test(css), '放大的神獸完整顯示（contain 置中），不裁掉頭、尾巴、腳');
console.log('PASS last-ally enlarge structure');
