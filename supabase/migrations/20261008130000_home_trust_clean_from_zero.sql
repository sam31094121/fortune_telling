-- 首頁信任區（認同／不認同／累計瀏覽次數）：絕對乾淨版。
-- 三個數字都從 0 開始；同一裝置可重複，每次動作就 +1；不去重、不設地板、不設只增不減。
-- 取代 20261006170000 的 714／74／110397 地板與事件去重（正式資料庫從未套用過該版本）。

drop function if exists public.increment_home_trust_agree();
drop function if exists public.increment_home_trust_disagree();
drop function if exists public.increment_home_trust_view();
drop function if exists public.home_trust_increment(text, text);
drop function if exists public.home_trust_counters_guard() cascade;
drop table if exists public.home_trust_events;
drop table if exists public.home_trust_counters;

create table public.home_trust_counters (
    id text primary key,
    agree_count bigint not null default 0,
    disagree_count bigint not null default 0,
    view_count bigint not null default 0,
    updated_at timestamptz not null default now()
);

insert into public.home_trust_counters (id) values ('home');

-- p_event_id 保留只為相容既有程式呼叫，不使用。
create function public.home_trust_increment(p_kind text, p_event_id text default null)
returns table (agree_count bigint, disagree_count bigint, view_count bigint, applied boolean)
language plpgsql
set search_path = public
as $$
#variable_conflict use_column
begin
    if p_kind is null or p_kind not in ('agree', 'disagree', 'view') then
        raise exception 'invalid counter kind: %', p_kind using errcode = '22023';
    end if;

    update public.home_trust_counters as c set
        agree_count = c.agree_count + (p_kind = 'agree')::int,
        disagree_count = c.disagree_count + (p_kind = 'disagree')::int,
        view_count = c.view_count + (p_kind = 'view')::int,
        updated_at = now()
    where c.id = 'home';

    return query
        select c.agree_count, c.disagree_count, c.view_count, true
        from public.home_trust_counters c
        where c.id = 'home';
end;
$$;

alter table public.home_trust_counters enable row level security;
revoke all on table public.home_trust_counters from public, anon, authenticated;
revoke all on function public.home_trust_increment(text, text) from public, anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update on table public.home_trust_counters to service_role;
grant execute on function public.home_trust_increment(text, text) to service_role;
