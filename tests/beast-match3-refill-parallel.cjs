// beast-match3-refill.e2e.mjs 的並行版。
// 原本一個行程把「五組畫面寬度重播」與「補珠／離場」串行跑完（約 90 秒）。
// 這幾段彼此獨立（各自的瀏覽器、各自的輸出資料夾），拆開並行，斷言一條都沒少：
//   REFILL_ONLY=1           → 跳過重播案例，只跑補珠、減少動態、離場取消
//   REPLAY_ONLY=1 + CASE=w  → 只跑該寬度的重播案例（390 含一般與減少動態兩組）
// 聯集與原本預設的完整跑法相同。要回到原本串行：node tests/beast-match3-refill.e2e.mjs
const { runParallel, outDir } = require('./lib/parallel-e2e.cjs');

const jobs = [
  { name: 'refill / reduced-motion / leave', env: { MATCH3_REFILL_ONLY: '1', MATCH3_SOUND_OUTPUT: outDir('rest') } },
  ...[390, 320, 768, 1440].map((w) => ({
    name: `replay ${w}`,
    env: { MATCH3_REPLAY_ONLY: '1', MATCH3_REPLAY_CASE: String(w), MATCH3_SOUND_OUTPUT: outDir(`replay-${w}`) },
  })),
];

runParallel('tests/beast-match3-refill.e2e.mjs', jobs).then((code) => process.exit(code));
