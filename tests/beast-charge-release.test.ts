import assert from 'node:assert/strict';
import { CHARGE_REVIEW_PARTS, releasedChargeFor, type ChargeRelease } from '../lib/beast-charge-release';

const base = '/skill-battle-archive/cards/beast_a01/clips/';
const release: ChargeRelease = { status: 'approved', purpose: 'live-battle', playerId: 'beast_a01', opponentId: 'beast_a02', audioSide: 'player', durationMs: 6000,
  webm: base + 'reviewed.webm', mp4: base + 'reviewed.mp4', reviewReport: base + 'reviewed.json', checks: Object.fromEntries(CHARGE_REVIEW_PARTS.map(p => [p, 'pass'])) };
const skill = { enabled: true, durationMs: 6000, video: release.webm, videoMp4: release.mp4, release };
assert.equal(releasedChargeFor(skill, 'beast_a01', 'beast_a02'), release);
assert.equal(releasedChargeFor({ ...skill, release: undefined }, 'beast_a01', 'beast_a02'), null);
assert.equal(releasedChargeFor(skill, 'beast_a01', 'beast_a03'), null);
assert.equal(releasedChargeFor(skill, 'beast_y01', 'beast_a02'), null);
assert.equal(releasedChargeFor({ ...skill, enabled: false }, 'beast_a01', 'beast_a02'), null);
for (const patch of [{ status: 'pending' }, { purpose: 'skill-preview' }, { durationMs: 2000 }, { webm: base + '../other.webm' }, { checks: { ...release.checks, identity: 'not-applicable' } }, { checks: { ...release.checks, mouth: 'fail' } }, { checks: {} }]) {
  assert.equal(releasedChargeFor({ ...skill, release: { ...release, ...patch } as ChargeRelease }, 'beast_a01', 'beast_a02'), null);
}
console.log('PASS: only reviewed exact-player/exact-opponent six-second clips can play; previews and incomplete anatomy checks cannot');
for (const status of ['fail', 'unverified', 'not-applicable'] as const) {
  assert.equal(releasedChargeFor({ ...skill, release: { ...release, checks: { ...release.checks, opponentIdentity: status } } }, 'beast_a01', 'beast_a02'), null);
}
for (const status of ['fail', 'unverified', 'not-applicable', undefined] as const) {
  const checks={...release.checks};
  if(status===undefined)delete checks.reciprocalBite;else checks.reciprocalBite=status;
  assert.equal(releasedChargeFor({...skill,release:{...release,checks}},'beast_a01','beast_a02'),null,'Both actors must have reviewed biting contact');
}
