create table if not exists public.visitor_counters (
  feature_key text primary key check (
    feature_key in ('home', 'personality', 'matching', 'number', 'music', 'iching', 'karma')
  ),
  real_count bigint not null default 0 check (real_count >= 0),
  seed_count bigint not null default 1010128 check (seed_count = 1010128),
  updated_at timestamptz not null default now()
);

alter table public.visitor_counters enable row level security;

revoke all on table public.visitor_counters from anon, authenticated;

create or replace function public.record_visitor_visit(requested_feature_key text)
returns table (
  feature_key text,
  real_count bigint,
  seed_count bigint,
  display_count bigint
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if requested_feature_key not in ('home', 'personality', 'matching', 'number', 'music', 'iching', 'karma') then
    raise exception 'Unsupported visitor counter feature key';
  end if;

  return query
  insert into public.visitor_counters as counters (feature_key, real_count, seed_count)
  values (requested_feature_key, 1, 1010128)
  on conflict (feature_key) do update
  set real_count = counters.real_count + 1,
      updated_at = now()
  returning
    counters.feature_key,
    counters.real_count,
    counters.seed_count,
    counters.seed_count + counters.real_count;
end;
$$;

revoke all on function public.record_visitor_visit(text) from public, anon, authenticated;
grant usage on schema public to service_role;
grant execute on function public.record_visitor_visit(text) to service_role;
