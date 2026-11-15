// 寶石捷連線・流程修正守門（2026-11-15 試玩審查）
const assert = require('node:assert/strict');
const fs = require('node:fs');
const src = fs.readFileSync('components/battlefield/Match3Board.tsx', 'utf8');
// 1) 最後一隻放大：等倒下敵卡的死亡演出退場後才放大（不疊兩張大卡、不把我方隊伍擠出 1280 畫面）
assert(src.includes('const foeExiting = foes.some(f => f.hp <= 0 && !retiredFoes.has(f.id));'));
assert(src.includes('const lastFoeBig = lastFoeReady && lastFoeSettled && !foeExiting;'));
console.log('PASS last-foe waits for exiting foes');
// 2) 拖珠中不自動發動連線攻擊（否則放開時整筆拖曳被吃掉）
assert(src.includes('const [dragging, setDragging] = useState(false);'));
assert(src.includes('onPointerUp={() => { setDragging(false); drag.handlers.onPointerUp(); }}') && src.includes('onLostPointerCapture={() => setDragging(false)}'), '放開／取消／失去捕捉都解除拖曳狀態');
assert(!src.includes("fireLinkWithRef.current(ids, 'auto')"), '2026-11-15: energy must wait for manual intent');
assert(src.includes('refillRun.current || dragging || deathHold.size'), 'manual energy cannot interrupt drag or ongoing presentation');
console.log('PASS manual-only energy preserves drag and presentation locks');
