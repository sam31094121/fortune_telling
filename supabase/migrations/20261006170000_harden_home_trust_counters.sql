-- 首頁信任區計數器（認同／不認同／累計瀏覽次數）— 加固版
--
-- 取代根目錄 supabase-home-trust-setup.sql（該檔的三個累加函式在 Postgres 上必定報
-- 42702 "column reference is ambiguous"，且 RLS 策略讓持有公開金鑰者可直接改寫數字）。
--
-- 設計：
--   1. 可重複執行：資料表／種子「不存在才建」，已存在的數字絕不覆蓋、絕不重置。
--   2. 只增不減：BEFORE UPDATE／DELETE 觸發器擋下倒退與刪除（要更正數字請見檔尾說明）。
--   3. 單一原子累加函式 home_trust_increment(kind, event_id)：
--        - 一個陳述式完成「列不存在就建立、存在就 +1」，不會因為列消失而永遠回空。
--        - 帶 event_id 時以事件表去重：同一事件重送（逾時重試、離線補送、sendBeacon、
--          兩個分頁同時補送）只會 +1 一次；不同事件各自 +1，快速連點不會漏算。
--   4. 客戶端不得指定最終數字：資料表與函式只授權給 service_role，anon／authenticated 無權。
--   5. 保留三個舊函式名稱（無參數），讓程式比遷移早部署時仍可運作；它們不帶去重。

-- ---------------------------------------------------------------- 資料表
create table if not exists public.home_trust_counters (
    id text primary key,
    agree_count bigint not null default 714 check (agree_count >= 714),
    disagree_count bigint not null default 74 check (disagree_count >= 74),
    view_count bigint not null default 110397 check (view_count >= 110397),
    updated_at timestamptz not null default now()
);

-- 種子只在不存在時建立；已存在（含更高的正式數字）一律不動。
insert into public.home_trust_counters (id) values ('home') on conflict (id) do nothing;

create table if not exists public.home_trust_events (
    event_id text primary key,
    kind text not null check (kind in ('agree', 'disagree', 'view')),
    created_at timestamptz not null default now()
);
create index if not exists home_trust_events_created_at_idx on public.home_trust_events (created_at);

-- ---------------------------------------------------------------- 只增不減
create or replace function public.home_trust_counters_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    -- 業主確認要更正數字時：在同一個交易內先執行  set local app.allow_counter_change = 'on';
    if coalesce(current_setting('app.allow_counter_change', true), '') = 'on' then
        if tg_op = 'DELETE' then
            return old;
        end if;
        return new;
    end if;

    if tg_op = 'DELETE' then
        raise exception 'home_trust_counters rows may not be deleted' using errcode = '23514';
    end if;

    if new.agree_count < old.agree_count
       or new.disagree_count < old.disagree_count
       or new.view_count < old.view_count then
        raise exception 'home_trust_counters is monotonic: counts may not decrease' using errcode = '23514';
    end if;
    return new;
end;
$$;

drop trigger if exists home_trust_counters_monotonic on public.home_trust_counters;
create trigger home_trust_counters_monotonic
    before update or delete on public.home_trust_counters
    for each row execute function public.home_trust_counters_guard();

-- ---------------------------------------------------------------- 原子累加
create or replace function public.home_trust_increment(p_kind text, p_event_id text default null)
returns table (agree_count bigint, disagree_count bigint, view_count bigint, applied boolean)
language plpgsql
set search_path = public
as $$
#variable_conflict use_column
declare
    v_applied boolean := true;
    v_rows integer;
begin
    if p_kind is null or p_kind not in ('agree', 'disagree', 'view') then
        raise exception 'invalid counter kind: %', p_kind using errcode = '22023';
    end if;

    if p_event_id is not null then
        insert into public.home_trust_events (event_id, kind)
        values (p_event_id, p_kind)
        on conflict (event_id) do nothing;
        get diagnostics v_rows = row_count;
        v_applied := v_rows > 0;

        -- 順手清理 30 天前的事件（有上限，避免單次太慢）；約每 100 次觸發一次。
        if v_applied and random() < 0.01 then
            delete from public.home_trust_events
            where ctid in (
                select ctid from public.home_trust_events
                where created_at < now() - interval '30 days'
                limit 500
            );
        end if;
    end if;

    if v_applied then
        insert into public.home_trust_counters as c (id, agree_count, disagree_count, view_count)
        values (
            'home',
            714 + (p_kind = 'agree')::int,
            74 + (p_kind = 'disagree')::int,
            110397 + (p_kind = 'view')::int
        )
        on conflict (id) do update set
            agree_count = c.agree_count + (p_kind = 'agree')::int,
            disagree_count = c.disagree_count + (p_kind = 'disagree')::int,
            view_count = c.view_count + (p_kind = 'view')::int,
            updated_at = now();
    end if;

    return query
        select c.agree_count, c.disagree_count, c.view_count, v_applied
        from public.home_trust_counters c
        where c.id = 'home';
end;
$$;

-- 舊名稱（無參數、無去重）：修正原本的欄位歧義錯誤，回傳欄位維持不變。
create or replace function public.increment_home_trust_agree()
returns table (agree_count bigint, disagree_count bigint, view_count bigint)
language sql
set search_path = public
as $$ select r.agree_count, r.disagree_count, r.view_count from public.home_trust_increment('agree') r $$;

create or replace function public.increment_home_trust_disagree()
returns table (agree_count bigint, disagree_count bigint, view_count bigint)
language sql
set search_path = public
as $$ select r.agree_count, r.disagree_count, r.view_count from public.home_trust_increment('disagree') r $$;

create or replace function public.increment_home_trust_view()
returns table (agree_count bigint, disagree_count bigint, view_count bigint)
language sql
set search_path = public
as $$ select r.agree_count, r.disagree_count, r.view_count from public.home_trust_increment('view') r $$;

-- ---------------------------------------------------------------- 權限：客戶端不得指定數字
drop policy if exists "Allow read home_trust_counters" on public.home_trust_counters;
drop policy if exists "Allow rpc increment" on public.home_trust_counters;

alter table public.home_trust_counters enable row level security;
alter table public.home_trust_events enable row level security;

revoke all on table public.home_trust_counters from public, anon, authenticated;
revoke all on table public.home_trust_events from public, anon, authenticated;
revoke all on function public.home_trust_increment(text, text) from public, anon, authenticated;
revoke all on function public.increment_home_trust_agree() from public, anon, authenticated;
revoke all on function public.increment_home_trust_disagree() from public, anon, authenticated;
revoke all on function public.increment_home_trust_view() from public, anon, authenticated;

grant select, insert, update on table public.home_trust_counters to service_role;
grant select, insert, delete on table public.home_trust_events to service_role;
grant execute on function public.home_trust_increment(text, text) to service_role;
grant execute on function public.increment_home_trust_agree() to service_role;
grant execute on function public.increment_home_trust_disagree() to service_role;
grant execute on function public.increment_home_trust_view() to service_role;

-- ---------------------------------------------------------------- 更正數字（需業主明確同意才做）
-- begin;
--   set local app.allow_counter_change = 'on';
--   update public.home_trust_counters set agree_count = <新值> where id = 'home';
-- commit;
-- 種子值與 CHECK 地板（714／74／110397）依業主規格；若要調整地板，另寫遷移，不要手改。
