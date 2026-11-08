const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const epoch = 'home-20261108-v2';
test('real PostgreSQL: zero start, retry deduplication, atomic counts, old epoch rejection, and private permissions', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
    await db.exec(fs.readFileSync('supabase/migrations/20261108051303_retire_home_and_feature_counters_sound_stats.sql','utf8'));
    await db.exec(fs.readFileSync('supabase/migrations/20261108051929_enable_home_trust_zero_start.sql','utf8'));
    const read = async () => (await db.query('SELECT agree_count::int,disagree_count::int,view_count::int,revision::int FROM public.home_trust_counters')).rows[0];
    assert.deepEqual(await read(), { agree_count:0,disagree_count:0,view_count:0,revision:0 });
    const call = (kind,id=randomUUID(),version=epoch) => db.query('SELECT * FROM public.home_trust_increment_v2($1,$2,$3)',[kind,id,version]);
    const id=randomUUID();
    assert.equal((await call('agree',id)).rows[0].applied,true);
    assert.equal((await call('agree',id)).rows[0].applied,false);
    await assert.rejects(call('disagree',id),/kind mismatch/);
    await assert.rejects(call('view',randomUUID(),'old'),/Invalid counter event/);
    await assert.rejects(call('invalid'),/Invalid counter event/);
    await Promise.all(Array.from({length:20},()=>call('view')));
    await call('disagree');
    assert.deepEqual(await read(), { agree_count:1,disagree_count:1,view_count:20,revision:22 });
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public.home_trust_events')).rows[0].n,22);
    await db.exec('BEGIN; DELETE FROM public.home_trust_counters;');
    await assert.rejects(call('agree'),/Counter missing/);
    await db.exec('ROLLBACK;');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public.home_trust_events')).rows[0].n,22);
    for(const role of ['anon','authenticated']) {
      await db.exec('SET ROLE '+role);
      await assert.rejects(call('agree'),/permission denied/);
      await assert.rejects(read(),/permission denied/);
      await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role');
    assert.equal((await call('view')).rows[0].applied,true);
    await db.exec('RESET ROLE');
  } finally { await db.close(); }
});
