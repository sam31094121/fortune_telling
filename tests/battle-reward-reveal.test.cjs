// 戰利品揭曉：贏了一眼看到獲得什麼；但制度鐵律是「保存成功才顯示已獲得」，不能為了好看假裝發獎。
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const comp = read('components/battlefield/BattleRewardReveal.tsx');
const css = read('components/battlefield/BattleRewardReveal.module.css');
const board = read('components/battlefield/Match3Board.tsx');
const boardCss = read('components/battlefield/Match3Board.module.css');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n += 1; };

// 有按鈕與點擊處理，必須是客戶端元件，否則單獨使用會 500
ok(/^'use client';/.test(comp), '含點擊處理的元件必須標 use client');

// 純顯示：不碰結算、不連戰鬥函式、不亂數
ok(!/lib\/beast-game|settleWin|Math\.random|fetch\(/.test(comp), '揭曉元件是純顯示，不自己結算');
ok(/status:\s*BattleRewardStatus/.test(comp) && /'saving' \| 'saved' \| 'failed'/.test(comp), '三種狀態：保存中、已保存、失敗');

// 只有 saved 才畫出卡片與「查看我的卡片」；saving／failed 絕不出現卡片
const savingBranch = comp.split("status === 'saving' ?")[1].split("status === 'saved' ?")[0];
ok(!/\{card\}|查看我的卡片/.test(savingBranch), '保存中不顯示卡片、不顯示已獲得');
const failedBranch = comp.split("status === 'saved' ?")[1].split(') : (')[1] || '';
ok(!/\{card\}/.test(failedBranch) && /role="alert"/.test(failedBranch) && /重試保存獎勵/.test(failedBranch), '失敗只顯示錯誤與重試，不顯示卡片');
ok(/data-testid="campaign-victory-reward"/.test(comp), '沿用原本的測試識別，既有 e2e 不受影響');

// 接線：狀態只由後端結算結果決定（savingReward／wonCard 來自 campaignSettlement）
ok(/status=\{savingReward \? 'saving' : wonCard \? 'saved' : 'failed'\}/.test(board), '狀態只看保存中與後端已保存的卡');
ok(/card=\{wonCard \? </.test(board), '沒有後端已保存的卡就不傳卡片');
ok(/campaignEnabled && over === 'win' && \(\s*<BattleRewardReveal/.test(board), '只在寶珠闖關模式贏了才出現');
ok(board.indexOf('<BattleResultBanner') < board.indexOf('<BattleRewardReveal'), '戰利品緊接在勝負橫幅之後');
ok(board.indexOf('<BattleRewardReveal') < board.indexOf("'挑戰下一關'"), '戰利品排在下一步按鈕之前');
ok(!/campaignRewardCard/.test(board), '舊的內嵌獎勵區塊已移除');

// 版面：內容比螢幕高時蓋板要能捲，戰利品不能被擠出畫面
ok(/\.result\s*\{[^}]*overflow-y:\s*auto/.test(boardCss), '結算蓋板可捲動');
ok(/\.result > :first-child\s*\{\s*margin-top:\s*auto/.test(boardCss) && /\.result > :last-child\s*\{\s*margin-bottom:\s*auto/.test(boardCss), '內容矮時仍置中');

// 卡片規格與無障礙
ok(/aspect-ratio:\s*63\s*\/\s*88/.test(css), '卡背佔位沿用 63×88 正統規格');
ok(/min-height:\s*56px/.test(css), '按鈕高度 56px');
ok(/prefers-reduced-motion/.test(css), '尊重減少動態');
ok(/aria-live="polite"/.test(comp), '結果變化會被讀出');

console.log(`battle-reward-reveal: ${n} checks passed`);
