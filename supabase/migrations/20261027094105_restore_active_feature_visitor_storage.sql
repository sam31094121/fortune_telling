-- Non-home cards still call /api/visitor/record. Restore its missing persistence
-- without importing unknown historical totals or changing home_trust_counters.
create table if not exists public.visitor_counters (
  feature_key text primary key check (feature_key in ('home','personality','matching','number','music','iching','karma')),
  real_count bigint not null default 0 check (real_count >= 0),
  seed_count bigint not null default 0 check (seed_count = 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.visitor_counter_visits (
  feature_key text not null check (feature_key in ('home','personality','matching','number','music','iching','karma')),
  visit_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (feature_key, visit_id)
);
alter table public.visitor_counters enable row level security;
alter table public.visitor_counter_visits enable row level security;
revoke all on public.visitor_counters, public.visitor_counter_visits from public, anon, authenticated;
grant select, insert, update on public.visitor_counters to service_role;
grant select, insert on public.visitor_counter_visits to service_role;

-- New empty ranges are explicit zero-event ranges, not reconstructed history.
insert into public.visitor_counters (feature_key, real_count, seed_count)
select key, 0, 0 from unnest(array['home','personality','matching','number','music','iching','karma']) as key
on conflict (feature_key) do nothing;

create or replace function public.record_visitor_visit(requested_feature_key text, requested_visit_id uuid)
returns table (feature_key text, real_count bigint, seed_count bigint, display_count bigint)
language plpgsql security invoker set search_path = '' as $$
#variable_conflict use_column
declare did_record boolean;
begin
  if requested_feature_key is null or requested_feature_key not in ('home','personality','matching','number','music','iching','karma') or requested_visit_id is null then
    raise exception 'Invalid visitor event';
  end if;
  with recorded as (
    insert into public.visitor_counter_visits (feature_key, visit_id)
    values (requested_feature_key, requested_visit_id)
    on conflict (feature_key, visit_id) do nothing returning 1
  ) select exists(select 1 from recorded) into did_record;
  if did_record then
    insert into public.visitor_counters as counters (feature_key, real_count, seed_count)
    values (requested_feature_key, 1, 0)
    on conflict (feature_key) do update
      set real_count = counters.real_count + 1, updated_at = now();
  end if;
  return query select counters.feature_key, counters.real_count, counters.seed_count, counters.real_count
    from public.visitor_counters as counters where counters.feature_key = requested_feature_key;
end;
$$;
revoke all on function public.record_visitor_visit(text,uuid) from public, anon, authenticated;
grant execute on function public.record_visitor_visit(text,uuid) to service_role;
comment on table public.visitor_counters is 'Retained events since storage restoration on 2026-10-27. Unknown historical totals are not imported.';
