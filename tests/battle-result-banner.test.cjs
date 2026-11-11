// 戰鬥結算：贏、輸、平手必須是三種明確不同的畫面；結果要等戰鬥結束才揭曉（防劇透）。
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const banner = read('components/battlefield/BattleResultBanner.tsx');
const css = read('components/battlefield/BattleResultBanner.module.css');
const match3 = read('components/battlefield/Match3Board.tsx');
const panel = read('components/battlefield/BattlePanel.tsx');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n += 1; };

// 三種結果各有自己的圖示、大字、說明；輸一定要明說「戰敗」，不能委婉
ok(/win:\s*\{[^}]*word:\s*'勝利'/.test(banner), '贏：大字「勝利」');
ok(/lose:\s*\{[^}]*word:\s*'戰敗'/.test(banner), '輸：大字「戰敗」，明說輸了');
ok(/draw:\s*\{[^}]*word:\s*'平手'/.test(banner), '平手：大字「平手」');
const icons = [...banner.matchAll(/icon:\s*'([^']+)'/g)].map((m) => m[1]);
ok(icons.length === 3 && new Set(icons).size === 3, '三種結果的圖示各不相同（不只靠顏色）');
ok(!/這局先到這裡/.test(match3 + panel + banner), '不再用委婉說法取代輸');

// 樣式：三種各自有配色；輸沒有勝利的光暈；尊重減少動態
for (const o of ['win', 'lose', 'draw']) ok(new RegExp(`data-outcome='${o}'`).test(css), `樣式有 ${o}`);
ok(/prefers-reduced-motion/.test(css), '尊重「減少動態」設定');
ok(/\.banner\[data-outcome='win'\][^{]*\{[^}]*winGlow/.test(css), '只有贏有光暈呼吸');
ok(!/\.banner\[data-outcome='lose'\][^{]*\{[^}]*winGlow/.test(css), '輸沒有勝利光暈');

// 純顯示：不判斷勝負、不連戰鬥函式、不亂數
ok(!/lib\/beast-game|Math\.random|fetch\(/.test(banner), '橫幅是純顯示元件');
ok(!/winner|match\./.test(banner), '橫幅不自己判斷勝負，只吃父層傳入的 outcome');

// 接線：寶珠戰與回合制（BattlePanel）都用同一個橫幅
ok(/<BattleResultBanner outcome=\{over === 'win' \? 'win' : 'lose'\}/.test(match3), '寶珠戰結算用橫幅');
ok(/<BattleResultBanner outcome=\{match\.winner === 'player' \? 'win' : match\.winner === 'opponent' \? 'lose' : 'draw'\}/.test(panel), 'BattlePanel 結算用橫幅，贏／輸／平手三分');

// 防劇透：橫幅只能出現在「已結束」的分支裡，演出途中不得出現
const finishedBranch = panel.split('finished && busy ?')[1] || '';
ok(/動作演出中，接著顯示結果/.test(finishedBranch.split('<BattleResultBanner')[0]), '橫幅排在「演出中」提示之後的已結束分支');
ok((panel.match(/<BattleResultBanner/g) || []).length === 1, 'BattlePanel 只有一處橫幅');
// 條件可以再加別的（例如 !resultWaiting＝等演出結束），但一定要先有 over（戰鬥已結束）才會出現。
const overGate = match3.search(/\{over && (?:![A-Za-z]+ && )*\(/);
ok(overGate >= 0 && overGate < match3.indexOf('<BattleResultBanner'), '寶珠戰橫幅只在 over 之後出現（可附加其他等待條件，但不得少了 over）');
ok(!/\{(?!over\b)[A-Za-z!]+ && \(\s*<div className=\{styles\.result\}/.test(match3), '結算蓋板不得改成不看 over 的條件');

// 寬度以容器為準：以視窗（92vw）為準時，放進窄欄（BattlePanel）會超出右邊，窄手機實測超出 10px
ok(!/(^|[;{\s])width:\s*min\([^)]*vw/m.test(css), '橫幅「寬度」不得以視窗為準（字級用 vw 不在此限）');
ok(/width:\s*100%;\s*max-width:\s*420px/.test(css), '橫幅寬度以容器為準，最寬 420');

console.log(`battle-result-banner: ${n} checks passed`);
