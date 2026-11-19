const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, ['tests/beast-match3-refill.e2e.mjs'], {
  stdio: 'inherit',
  timeout: 150000,
  env: { ...process.env, MATCH3_REPLAY_ONLY: '1', MATCH3_REPLAY_CASE: '390',
    MATCH3_DROP_AUDIT: '1', MATCH3_DROP_SHIELDS: '11', MATCH3_DROP_PERF_AUDIT: '1',
    MATCH3_SOUND_OUTPUT: 'reports/beast-game/drop-render-stability' },
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
