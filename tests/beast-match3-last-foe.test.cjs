// 敵方只剩最後一隻時放大成魔王般的大卡片（業主 2026-11-11）：結構守門。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const src = fs.readFileSync('components/battlefield/Match3Board.tsx', 'utf8');
assert(/const lastFoeReady = rigEnabled && foes\.length > 1 && !over && foes\.filter\(f => f\.hp > 0\)\.length === 1 && !guardianDuelReady;/.test(src), '最後一隻條件：敵方多於一隻、只剩一隻存活、尚未結束、守護獸決戰另走原路');
assert(/else if \(!busy\) setLastFoeSettled\(true\)/.test(src), '等本回合動畫結束才放大（不打斷死亡演出）');
assert(/const bigFoe = guardianDuel \|\| lastFoeShown;/.test(src)); // 分出勝負後沿用凍結的放大狀態（lastFoeShown = held ?? 即時 lastFoeBig）
assert(src.includes('data-guardian-duel={bigFoe || undefined} data-last-foe={lastFoeShown || undefined}'), '沿用決戰排版並標記最後一隻');
assert(!src.includes('rigSrc={lastFoe') && src.includes('rigSrc={guardianDuel && duelArt && i === 4 ? duelArt : f.thumbnail}'), '大圖仍只給守護獸，最後一隻用自己的卡圖');
assert(src.split('!bigFoe').length - 1 === 1, '欄位排版跟著放大狀態');
assert(src.includes("data-fused={rigEnabled ? (bigFoe ? 'duel' : true) : undefined}"), '一體成型幾何跟著放大狀態');
console.log('PASS last-foe enlarge structure');
// 我方最後一隻（業主手機實測回報）
assert(/const lastAllyReady = rigEnabled && team\.length >= 1 && !over && team\.filter\(u => u\.hp > 0\)\.length === 1;/.test(src), '單隻開場或只剩一隻存活均使用大卡');
assert(/else if \(!busy\) setLastAllySettled\(true\)/.test(src), '我方放大也等動畫結束');
assert(src.includes('data-last-ally={lastAllyBig || undefined}'), '標記我方最後一隻');
const css = fs.readFileSync('components/battlefield/Match3Board.module.css', 'utf8');
assert(/\.team\[data-last-ally="true"\] \{ grid-template-columns: minmax\(0, min\(72%, 290px, var\(--last-ally-max, 290px\)\)\)/.test(css) && /\.ally\[data-hp="0"\] \{ display: none; \}/.test(css), '放大排版與隱藏倒下的隊友；卡寬受 --last-ally-max 限制，不搶寶珠空間');
assert(/--last-ally-art-ratio/.test(css) && /--art-h: calc\(100cqw \/ var\(--art-ratio\)\)/.test(css), '卡框比例跟隨卡圖，填滿外框');
assert(/.fusedUnit > .allyCard > img:first-child { object-fit: contain; object-position: 50% 50%; }/.test(css), '放大的神獸完整顯示（contain 置中），不裁掉頭、尾巴、腳');
console.log('PASS last-ally enlarge structure');

assert(src.includes("const foeEnlarged = foesEl?.getAttribute('data-guardian-duel') === 'true' || foesEl?.getAttribute('data-last-foe') === 'true';"), '雙方大卡時棋盤預算要認得敵方大魔王');
assert(src.includes('if (teamEl && !lastAllyOn && !foeEnlarged) compactReserve.current'), '只有雙方都還是多隻小卡時才更新棋盤高度預算，避免敵方大卡先登場把寶珠撐大');
assert(src.includes('const chrome = (lastAllyOn || foeEnlarged) && compactReserve.current'), '我方或敵方大卡登場都沿用放大前的棋盤預算');
console.log('PASS both-last-boss compact reserve');
// 11/14 米其林：結算前凍結排版（擊倒魔王／爆炸／結果不跳版、寶珠不變大、我方放大卡不縮回）
assert(/heldLayout\.current \?\?= liveLayout\.current;/.test(src) && src.includes('const held = over ? heldLayout.current : null;'), '結束後沿用結束前一刻的排版直到下一局');
assert(src.includes('const resultShown = !!over && !resultWaiting;'), '結果視窗真正出現才解除戰鬥鎖定');
assert(src.includes('data-match3-scroll-lock={scrollLocked && !help && !resultShown ? "true" : undefined}') && src.includes('data-match3-battle-active={rigEnabled && !help && !resultShown ? "true" : undefined}'), '擊倒演出期間不切換戰鬥版面屬性');
assert(/if \(overRef\.current\) return;/.test(src), '結束後不再重新量測寶珠尺寸');
assert(src.includes("element.style.setProperty('--foe-row-h', foeRowHeight)") && src.includes("element.style.setProperty('--foe-room-up', roomUp)"), '魔王／最後一隻放大不擠壓棋盤：記住原敵列高度與上方空間');
assert(src.includes('key={bigFoe ? `${f.id}:big` : f.id}'), '放大時重新掛載敵卡（插入不算版面位移）');
assert(src.includes("data-last-held={held?.lastAlly && held.lastAllyId === u.id ? 'true' : undefined}"), '最後一隻我方倒下時保留放大卡');
assert(/--duel-eff: min\(var\(--duel-h\), calc\(var\(--foe-row-h, var\(--duel-h\)\) \+ var\(--foe-room-up, 0px\)\)\);/.test(css), '放大卡只往上借空間，不推棋盤');
assert(/\.foes > \.foe\[data-held-retired\] \{ visibility: hidden; pointer-events: none; \}/.test(css) && /\.ally\[data-hp="0"\]\[data-last-held\] \{ display: block; \}/.test(css), '凍結排版的佔位');
assert(!/\n\.orb \{[^}]*will-change: transform/.test(css), '寶珠不再常駐 will-change');
const drag = fs.readFileSync('components/battlefield/useDragChain.tsx', 'utf8');
assert(!/elementFromPoint\(/.test(drag) && drag.includes('const g = geometry.current ?? measureCells();'), '拖曳中只用快取幾何計算');
const aura = fs.readFileSync('components/battlefield/EnhanceAura.module.css', 'utf8');
assert(/@media \(prefers-reduced-motion: reduce\)/.test(aura) && !/@keyframes[^}]*\b(width|height|top|left|margin)\s*:/.test(aura), '強化特效只動 transform／opacity，並有減少動態的靜態版');
assert(src.includes('<EnhanceAura') && fs.readFileSync('components/battlefield/HardCampaignEntry.tsx', 'utf8').includes('<EnhanceAura'), '強化特效同時出現在卡面與戰鬥畫面');
console.log('PASS hold-layout + enhance + drag cache structure');
