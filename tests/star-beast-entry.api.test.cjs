const assert = require('node:assert/strict');
const base = 'http://localhost:8888';
async function post(path, input) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  return { status: response.status, body: await response.json() };
}
(async () => {
  const sample = { birthDate: '1990-01-01', gender: 'male', calendarType: 'solar' };
  const dateOnly = await post('/api/star-beasts/guardian', { ...sample, timeUnknown: true, birthTime: '12:00', birthHourBranch: 'chen' });
  assert.equal(dateOnly.status, 200);
  assert.equal(dateOnly.body.timeUnknown, true, 'unknown flag overrides stale stored times');
  assert(dateOnly.body.beastId >= 1 && dateOnly.body.beastId <= 28);
  const known = await post('/api/star-beasts/guardian', { ...sample, timeUnknown: false, birthHourBranch: 'chen' });
  assert.equal(known.status, 200);
  assert.equal(known.body.timeUnknown, false);
  assert.equal(known.body.beastId, dateOnly.body.beastId, 'the same verified day pillar has one mapping');
  const repeat = await post('/api/star-beasts/guardian', sample);
  assert.equal(repeat.body.beastId, dateOnly.body.beastId);
  const lunar = await post('/api/star-beasts/guardian', { ...sample, calendarType: 'lunar', timeUnknown: true });
  const lunarSolar = await post('/api/star-beasts/guardian', { ...sample, birthDate: '1990-01-27', timeUnknown: true });
  assert.equal(lunar.status, 200);
  assert.equal(lunar.body.beastId, lunarSolar.body.beastId, 'lunar date is converted exactly once');
  for (const invalid of [null, {}, { ...sample, birthDate: '1990-02-30' }, { ...sample, gender: '' }, { ...sample, birthHourBranch: 'pending' }, { ...sample, timeUnknown: 'true' }]) {
    const result = await post('/api/star-beasts/guardian', invalid);
    assert.equal(result.status, 422);
    assert.equal(result.body.ok, false);
  }
  const pool = await (await fetch(base + '/api/beast-game')).json();
  assert.equal(pool.cards.length, 60);
  assert.equal(pool.rules.lineupBudget, 12);
  const ids = pool.cards.filter(card => card.form === 'YOUNG').slice(0, 4).map(card => card.id);
  for (const bad of [null, { lineup: ids }, { lineup: [ids[0], ids[0], ids[1]] }, { lineup: pool.cards.filter(card => card.form === 'GUARDIAN').slice(0, 3).map(card => card.id) }]) {
    assert.equal((await post('/api/beast-game', bad)).status, 400);
  }
  for (const replaySeed of [0, 1, 42, 89, 101, 102, 200, 999, 1729, 65536]) {
    const match = await post('/api/beast-game', { lineup: ids.slice(0, 3), replaySeed });
    assert.equal(match.status, 200, `legal opponent for replay ${replaySeed}`);
    assert.equal(new Set(match.body.opponentLineupIds).size, 3);
    assert(match.body.opponentLineupIds.reduce((sum, id) => sum + pool.cards.find(c => c.id === id).cost, 0) <= 12);
    const replay = await post('/api/beast-game', { lineup: ids.slice(0, 3), replaySeed });
    assert.deepEqual(replay.body.life, match.body.life);
    assert.deepEqual(replay.body.timeline, match.body.timeline);
  }
  for (const replaySeed of [-1, 3.5, 2 ** 31, '42']) {
    assert.equal((await post('/api/beast-game', { lineup: ids.slice(0, 3), replaySeed })).status, 400);
  }
  assert.equal((await post('/api/beast-game', { lineup: ids.slice(0, 3) })).status, 200);
  console.log('PASS: guardian input, unknown-hour integrity, deterministic mapping and duel API limits');
})().catch(error => { console.error(error); process.exitCode = 1; });
