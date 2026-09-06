import assert from 'node:assert/strict';
import { beginRefinement, beginRequestedQuotaRetry, referenceFor, withJobLock } from '../scripts/beast-six-second-production.mjs';

assert.equal(referenceFor('beast_a01'), 'public/beast-game/spirit/01.webp');
assert.equal(referenceFor('beast_y01'), 'public/beast-game/spirit/01y.webp');
assert.equal(referenceFor('beast_g_qinglong'), 'public/beast-game/spirit/guardian-qinglong.webp');
assert.throws(() => referenceFor('../../private'), /Unknown/);
const failed = { cardId: 'beast_a01', name: '角木蛟', state: 'needs-refinement', attemptLimit: 3, opponentId:'beast_a02', contractVersion:'single-bite-legacy',
  candidateSha256: 'original-clip', checks: { identity: { status: 'fail', evidence: 'Changed horns' } } };
const second = beginRefinement(failed, 'Keep the original horns');
assert.equal(second.attempt, 2);
assert.equal(second.history[0].candidateSha256, 'original-clip');
assert.equal(second.history[0].opponentId,'beast_a02');
assert.equal(second.history[0].contractVersion,'single-bite-legacy');
assert.equal(second.history[0].checks.identity.status, 'fail');
assert.equal(second.checks.identity.status, 'unreviewed');
assert.equal(second.candidateSha256, null);
assert.equal(failed.candidateSha256, 'original-clip');
assert.throws(() => beginRefinement({ ...failed, state: 'generating' }, 'Try again'), /failed review/);
assert.throws(() => beginRefinement(failed, ' '), /specific feedback/);
assert.throws(() => beginRefinement({ ...failed, attempt: 3 }, 'Try again'), /limit reached/);
const bird = beginRefinement({ ...failed, cardId: 'beast_a18', name: '昴日雞' }, 'Keep the reference beak');
assert.ok(!bird.prompt.includes('green and gold mane'));
await withJobLock('beast_a99', async () => {
  await assert.rejects(withJobLock('beast_a99', async () => { throw new Error('Should never start a second paid task'); }), { code: 'EEXIST' });
});
await assert.rejects(withJobLock('beast_a99', async () => { throw new Error('intentional job failure'); }), /intentional/);
assert.equal(await withJobLock('beast_a99', async () => 'released'), 'released');
console.log('PASS: identity mapping, explicit refinement, history preservation and three-attempt limit');
const rejected={cardId:'beast_a23',name:'鬼金羊',attempt:1,attemptLimit:3,state:'quota-blocked',providerStatus:429,providerMessage:'monthly cap',quota:{scope:'monthly-spend'}};
const requested=beginRequestedQuotaRetry(rejected,'User explicitly requested continuation; one attempt, not a claim that billing changed');
const cleared=beginRequestedQuotaRetry(rejected,'User explicitly confirmed external quota adjustment',{clearanceConfirmed:true});
assert.equal(cleared.quotaRetryRequest.clearanceConfirmed,true);
assert.equal(requested.attempt,2);assert.equal(requested.history[0].state,'quota-blocked');assert.equal(requested.history[0].providerStatus,429);assert.equal(requested.quotaRetryRequest.clearanceConfirmed,false);
for(const patch of [{omniInteractionId:'existing'},{candidateSha256:'existing'},{state:'submission-uncertain'},{providerStatus:500}])assert.throws(()=>beginRequestedQuotaRetry({...rejected,...patch},'continue'),/known rejection/);
for(const files of [{hasOperation:true},{hasCandidate:true}])assert.throws(()=>beginRequestedQuotaRetry(rejected,'continue',files),/known rejection/);
assert.throws(()=>beginRequestedQuotaRetry(rejected,''),/known rejection/);
assert.throws(()=>beginRequestedQuotaRetry(requested,'automatic repeated retry'),/known rejection/);
console.log('PASS: requested quota continuation retains the refusal and cannot duplicate a pending/result-bearing request');
