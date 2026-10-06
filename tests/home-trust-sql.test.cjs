// 首頁信任區計數器：在真正的 Postgres 引擎（PGlite）上驗證遷移檔。
// 需要 devDependency @electric-sql/pglite；沒安裝時印 SKIP 並以 0 結束（不阻擋其他測試）。
// 指定路徑：PGLITE_ENTRY=<pglite 套件入口檔> node tests/home-trust-sql.test.cjs
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261006170000_harden_home_trust_counters.sql'), 'utf8');
const OLD_SETUP = `
CREATE TABLE IF NOT EXISTS home_trust_counters (
    id VARCHAR(32) PRIMARY KEY,
    agree_count BIGINT NOT NULL DEFAULT 714 CHECK (agree_count >= 714),
    disagree_count BIGINT NOT NULL DEFAULT 74 CHECK (disagree_count >= 74),
    view_count BIGINT NOT NULL DEFAULT 110397 CHECK (view_count >= 110397),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO home_trust_counters (id, agree_count, disagree_count, view_count) VALUES ('home', 714, 74, 110397) ON CONFLICT (id) DO NOTHING;
CREATE OR REPLACE FUNCTION increment_home_trust_agree()
RETURNS TABLE (agree_count BIGINT, disagree_count BIGINT, view_count BIGINT) AS $$
BEGIN
    UPDATE home_trust_counters SET agree_count = agree_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 'home';
    RETURN QUERY SELECT home_trust_counters.agree_count, home_trust_counters.disagree_count, home_trust_counters.view_count FROM home_trust_counters WHERE id = 'home';
END; $$ LANGUAGE plpgsql;
ALTER TABLE home_trust_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read home_trust_counters" ON home_trust_counters FOR SELECT USING (true);
CREATE POLICY "Allow rpc increment" ON home_trust_counters FOR UPDATE USING (true);
`;

let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); if (!ok) failed++; };
const throws = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };

async function freshDb(PGlite, { upgradeFromOld = false } = {}) {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
  `);
  if (upgradeFromOld) await db.exec(OLD_SETUP);
  await db.exec(MIGRATION);
  return db;
}
const counts = async (db) => (await db.query(`select agree_count::int a, disagree_count::int d, view_count::int v from home_trust_counters where id='home'`)).rows[0];
const inc = async (db, kind, eventId) => (await db.query('select agree_count::int a, disagree_count::int d, view_count::int v, applied from home_trust_increment($1, $2)', [kind, eventId ?? null])).rows[0];
const asRole = async (db, role, fn) => { await db.exec(`set role ${role}`); try { return await fn(); } finally { await db.exec('reset role'); } };

(async () => {
  let PGlite;
  try {
    const mod = process.env.PGLITE_ENTRY ? await import(pathToFileURL(process.env.PGLITE_ENTRY).href) : await import('@electric-sql/pglite');
    PGlite = mod.PGlite;
  } catch {
    console.log('SKIP  找不到 @electric-sql/pglite（npm i -D @electric-sql/pglite 或設定 PGLITE_ENTRY）；SQL 測試未執行');
    return;
  }

  for (const upgrade of [false, true]) {
    const label = upgrade ? '【從舊腳本升級】' : '【全新資料庫】';
    const db = await freshDb(PGlite, { upgradeFromOld: upgrade });

    let c = await counts(db);
    check(`${label} 種子為 714／74／110397`, c.a === 714 && c.d === 74 && c.v === 110397, JSON.stringify(c));

    let r = await inc(db, 'agree');
    check(`${label} 認同 +1（舊版此處會報 42702）`, r.a === 715 && r.d === 74 && r.v === 110397 && r.applied === true);
    r = await inc(db, 'disagree'); check(`${label} 不認同 +1`, r.d === 75 && r.a === 715);
    r = await inc(db, 'view'); check(`${label} 瀏覽 +1`, r.v === 110398);

    // 事件去重：同一事件只算一次；不同事件各算一次
    const e1 = await inc(db, 'agree', 'evt_aaaaaaaa'); const e1b = await inc(db, 'agree', 'evt_aaaaaaaa'); const e2 = await inc(db, 'agree', 'evt_bbbbbbbb');
    check(`${label} 同一事件重送只 +1 次`, e1.a === 716 && e1b.a === 716 && e1b.applied === false);
    check(`${label} 不同事件各自 +1（快速連點不漏算）`, e2.a === 717 && e2.applied === true);

    // 大量：200 次不同事件 + 對每個事件重送 → 精確 +200
    const before = (await counts(db)).v;
    await Promise.all(Array.from({ length: 200 }, (_, i) => inc(db, 'view', `bulk_${upgrade}_${i}_xx`)));
    await Promise.all(Array.from({ length: 200 }, (_, i) => inc(db, 'view', `bulk_${upgrade}_${i}_xx`)));
    check(`${label} 200 個事件各重送一次 → 精確 +200`, (await counts(db)).v === before + 200, `${before} → ${(await counts(db)).v}`);

    // 無效參數
    const bad = await throws(() => inc(db, 'hack'));
    check(`${label} 不接受未知類型`, bad && bad.code === '22023', bad && bad.message);

    // 只增不減
    const dec = await throws(() => db.exec(`update home_trust_counters set agree_count = agree_count - 1 where id='home'`));
    check(`${label} 倒退被觸發器擋下`, dec && /monotonic/.test(dec.message));
    const del = await throws(() => db.exec(`delete from home_trust_counters where id='home'`));
    check(`${label} 刪除被擋下`, del && /may not be deleted/.test(del.message));
    const floor = await throws(() => db.exec(`update home_trust_counters set view_count = 5 where id='home'`));
    check(`${label} 低於地板被擋下`, !!floor);

    // 業主明確更正：交易內設定旗標才允許
    await db.exec(`begin; set local app.allow_counter_change = 'on'; update home_trust_counters set agree_count = agree_count + 5 where id='home'; commit;`);
    check(`${label} 明確旗標下可更正（需業主同意才用）`, (await counts(db)).a === 722);

    // 權限：客戶端不得指定數字、不得直接累加
    const anonUpdate = await throws(() => asRole(db, 'anon', () => db.exec(`update home_trust_counters set agree_count = 99999999 where id='home'`)));
    check(`${label} anon 直接改數字被擋（舊版可成功寫入 99999999）`, !!anonUpdate, anonUpdate && anonUpdate.message.slice(0, 50));
    const anonSelect = await throws(() => asRole(db, 'anon', () => db.query(`select * from home_trust_counters`)));
    check(`${label} anon 不能直接讀表`, !!anonSelect);
    for (const fn of ["home_trust_increment('view')", 'increment_home_trust_view()']) {
      const anonRpc = await throws(() => asRole(db, 'anon', () => db.query(`select * from ${fn}`)));
      check(`${label} anon 不能呼叫 ${fn}`, !!anonRpc && /permission denied/.test(anonRpc.message), anonRpc && anonRpc.message.slice(0, 40));
      const authRpc = await throws(() => asRole(db, 'authenticated', () => db.query(`select * from ${fn}`)));
      check(`${label} authenticated 不能呼叫 ${fn}`, !!authRpc);
    }
    const svc = await asRole(db, 'service_role', () => db.query(`select * from home_trust_increment('view')`));
    check(`${label} service_role 可呼叫`, svc.rows.length === 1);

    // 舊名稱函式（程式比遷移早部署時的相容）
    const legacy = (await db.query('select * from increment_home_trust_agree()')).rows[0];
    check(`${label} 舊名稱 increment_home_trust_agree() 修好且可用`, Number(legacy.agree_count) === 723 && legacy.applied === undefined);

    // 資料列消失 → 自我修復，且不倒退（受觸發器保護，需明確旗標才能刪）
    await db.exec(`begin; set local app.allow_counter_change = 'on'; delete from home_trust_counters where id='home'; commit;`);
    const healed = await inc(db, 'agree');
    check(`${label} 資料列消失後累加會重建，不回空`, healed.a === 715 && healed.applied === true, JSON.stringify(healed));

    // 遷移可重複執行：數字不被重置
    const preRerun = await counts(db);
    await db.exec(MIGRATION);
    check(`${label} 重複執行遷移不報錯且不重置數字`, JSON.stringify(await counts(db)) === JSON.stringify(preRerun));
  }

  console.log(failed ? `\n${failed} 項失敗` : '\n全部通過');
  process.exitCode = failed ? 1 : 0;
})().catch((e) => { console.error('測試本身出錯', e); process.exitCode = 1; });
