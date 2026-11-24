// 短螢幕靜止盤面：八種螢幕高度各自獨立（每個都是全新開局），外加一個「立繪晚到」案例。
// 原本一個行程串行跑完（約 62 秒）；現在每個高度一個子行程、各自瀏覽器與輸出資料夾，上限 3 並行。
// 斷言完全相同：120 格取樣、盤面位移 ≤ 1px、捲軸出現與否不得推動盤面。
// Also cross an actual late portrait load on the short viewport. The same
// 120-frame / 1px assertion applies; do not wait for images to hide the shift.
const { runParallel, outDir } = require('./lib/parallel-e2e.cjs');
const base = { MATCH3_LAYOUT_AUDIT: '1', MATCH3_REPLAY_ONLY: '1' };
const HEIGHTS = [844, 700, 680, 650, 640, 600, 580, 720];
const cases = process.env.MATCH3_LAYOUT_IMAGE_DELAY_MS
  ? [{ name: 'layout (env override)', env: { ...base, MATCH3_SOUND_OUTPUT: outDir('layout-env') } }]
  : [
      ...HEIGHTS.map((h) => ({ name: `layout ${h}px`, env: { ...base, MATCH3_LAYOUT_HEIGHT: String(h), MATCH3_SOUND_OUTPUT: outDir(`layout-${h}`) } })),
      { name: 'layout 650px + late image', env: { ...base, MATCH3_LAYOUT_HEIGHT: '650', MATCH3_LAYOUT_IMAGE_DELAY_MS: '1500', MATCH3_SOUND_OUTPUT: outDir('layout-late') } },
    ];
runParallel('tests/beast-match3-refill.e2e.mjs', cases).then((code) => process.exit(code));
