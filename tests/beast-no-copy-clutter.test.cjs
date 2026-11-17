// 玩遊戲時畫面上不放說明句（業主 2026-11-16）：說明留給客戶自己點「說明」看。守住已拿掉的句子不會回來。
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const entry = fs.readFileSync(path.join(__dirname, '../components/battlefield/HardCampaignEntry.tsx'), 'utf8');
const banned = ['同一種神獸有多張收藏時', '收藏第 ${', '尚未消耗的幼子可自由挑選', '勝利獲得的成獸保存在這裡', '往下滑，點喜歡的卡片加入隊伍', '想換夥伴？再點一次已選卡片即可取消',
  '先點選一張主角卡，再按下方按鈕確認', '主角占一個出戰位置', '贏得第一場，即可獲得第一張成獸卡', '隊伍已就緒，點此開始作戰', '開始或接續自己的闖關進度', '從第一關開始，不影響我的進度'];
for (const text of banned) assert.ok(!entry.includes(text), '不得再出現說明句：' + text);
const picker = fs.readFileSync(path.join(__dirname, '../components/battlefield/OwnedCopyPicker.tsx'), 'utf8');
assert.ok(!/<option|<select|<p[ >]/.test(picker), '出戰副本只用圖示與數字');
console.log('PASS no explanatory sentences in the orb entry flow; copy picker is icons and numbers only');
