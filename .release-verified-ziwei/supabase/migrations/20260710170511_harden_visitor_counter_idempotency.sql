create table if not exists public.visitor_counter_visits (
  feature_key text not null check (
    feature_key in ('home', 'personality', 'matching', 'number', 'music', 'iching', 'karma')
  ),
  visit_id uuid not null,
  recorded_at timestamptz not null default now(),
  primary key (feature_key, visit_id)
);

alter table public.visitor_counter_visits enable row level security;

revoke all on table public.visitor_counter_visits from anon, authenticated;

drop function if exists public.record_visitor_visit(text);

create function public.record_visitor_visit(
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
    values (requested_feature_key, 1, 1010128)
    on conflict (feature_key) do update
    set real_count = counters.real_count + 1,
        updated_at = now();
  end if;

  return query
  select
    counters.feature_key,
    counters.real_count,
    counters.seed_count,
    counters.seed_count + counters.real_count
  from public.visitor_counters as counters
  where counters.feature_key = requested_feature_key;
end;
$$;

revoke all on function public.record_visitor_visit(text, uuid) from public, anon, authenticated;
grant usage on schema public to service_role;
grant execute on function public.record_visitor_visit(text, uuid) to service_role;
