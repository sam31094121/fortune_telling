/**
 * 神獸測試用的 TypeScript 編譯，一次就好
 * ============================================================================
 *
 * 【為什麼要這一支】
 *
 * 有五支守門測試各自以 `tsc -p tsconfig.beast-game.json && node …` 開頭。
 * 單獨跑任何一支時那是對的——它需要編好的產物。
 * 但健康檢查一次跑完十九項，同一份 TypeScript 就被編了五次，
 * 每次 1.4 秒，四次是純浪費。
 *
 * 更要緊的是：五支都寫到同一個 .beast-game-build/。
 * 想把健檢改成並行時，它們會互相覆蓋對方的輸出——
 * 這種錯不會每次都發生，只會偶爾紅一次，最難查。
 *
 * 【做法】
 *
 * 呼叫端先編一次，然後設 BEAST_BUILD_READY=1；
 * 各支測試照舊呼叫這一支，看到旗標就跳過。
 * 單獨跑測試時沒有旗標，照樣會編——不會因為優化而讓人踩到「忘了編」。
 */

import { spawnSync } from 'node:child_process';

if (process.env.BEAST_BUILD_READY === '1') {
  process.exit(0);
}

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['tsc', '-p', 'tsconfig.beast-game.json'],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(result.status ?? 1);
