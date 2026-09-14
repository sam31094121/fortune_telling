-- 禁止作假：瀏覽數只算真實造訪。移除寫死的底數，顯示數＝real_count。

alter table public.visitor_counters drop constraint if exists visitor_counters_seed_count_check;
alter table public.visitor_counters alter column seed_count set default 0;
update public.visitor_counters set seed_count = 0 where seed_count <> 0;
alter table public.visitor_counters drop constraint if exists visitor_counters_seed_count_zero;
alter table public.visitor_counters add constraint visitor_counters_seed_count_zero check (seed_count = 0);

create or replace function public.record_visitor_visit(
  requested_feature_key text,
  requested_visit_id uuid
)
returns table (
  feature_key text,
  real_count bigint,
  seed_count bigint,
  display_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  did_record boolean;
begin
  if requested_feature_key not in ('home', 'personality', 'matching', 'number', 'music', 'iching', 'karma') then
    raise exception 'Unsupported visitor counter feature key';
  end if;

  with recorded as (
    insert into public.visitor_counter_visits (feature_key, visit_id)
    values (requested_feature_key, requested_visit_id)
    on conflict (feature_key, visit_id) do nothing
    returning 1
  )
  select exists(select 1 from recorded) into did_record;

  if did_record then
    insert into public.visitor_counters as counters (feature_key, real_count, seed_count)
    values (requested_feature_key, 1, 0)
    on conflict (feature_key) do update
    set real_count = counters.real_count + 1,
        updated_at = now();
  end if;

  return query
  select
    counters.feature_key,
    counters.real_count,
    counters.seed_count,
    counters.real_count
  from public.visitor_counters as counters
  where counters.feature_key = requested_feature_key;
end;
$$;

revoke all on function public.record_visitor_visit(text, uuid) from public, anon, authenticated;
grant execute on function public.record_visitor_visit(text, uuid) to service_role;
