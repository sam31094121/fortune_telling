const assert = require('node:assert/strict');

(async () => {
  const { canRecoverService } = await import('../scripts/screen-health-recovery-policy.mjs');
  const failed = (id, httpStatus) => ({ id, status: 'FAILED', httpStatus });
  const report = (...routes) => ({ ok: false, routes });
  assert.equal(canRecoverService(report(failed('HOME', 0)), true), true);
  assert.equal(canRecoverService(report(failed('READY', 503)), true), true);
  assert.equal(canRecoverService(report(failed('HOME', 500)), false), false);
  assert.equal(canRecoverService({ ok: true, routes: [] }, true), false);
  assert.equal(canRecoverService(report(failed('BEAST_CARD_GAME_CORE', null)), true), false);
  assert.equal(canRecoverService(report(failed('STAR_BEAST_SELF_ENTRY_API', null)), true), false);
  assert.equal(canRecoverService(report(failed('CARD_BEAST_GAME', 500)), true), false);
  assert.equal(canRecoverService(report(failed('HOME', 200)), true), false);
  assert.equal(canRecoverService(report(failed('HOME', 404)), true), false);
  console.log('PASS: only explicit recovery of unavailable home/ready services may restart; gameplay and API assertions never do');
})().catch(error => { console.error(error); process.exitCode = 1; });
