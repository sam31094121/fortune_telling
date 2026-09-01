-- 太極第一層「啟動音」匿名 A/B 偏好統計：跨使用者聚合，不記錄任何個人或敏感資料，
-- 只累積 4 個候選音色各自的事件次數，讓真正的偏好贏家由累積資料決定，不是寫死的假結論。

create table if not exists public.taiji_sound_preference_stats (
  variant text primary key check (variant in ('SOFT_WOOD', 'WARM_BELL', 'AIR_CHIME', 'LOW_RESONANCE')),
  assigned_count bigint not null default 0 check (assigned_count >= 0),
  completed_count bigint not null default 0 check (completed_count >= 0),
  muted_immediately_count bigint not null default 0 check (muted_immediately_count >= 0),
  replayed_count bigint not null default 0 check (replayed_count >= 0),
  next_step_count bigint not null default 0 check (next_step_count >= 0),
  updated_at timestamptz not null default now()
);

insert into public.taiji_sound_preference_stats (variant)
values ('SOFT_WOOD'), ('WARM_BELL'), ('AIR_CHIME'), ('LOW_RESONANCE')
on conflict (variant) do nothing;

alter table public.taiji_sound_preference_stats enable row level security;
revoke all on table public.taiji_sound_preference_stats from anon, authenticated;

create or replace function public.record_taiji_sound_event(
  requested_variant text,
  requested_field text
)
returns table (
  variant text,
  assigned_count bigint,
  completed_count bigint,
  muted_immediately_count bigint,
  replayed_count bigint,
  next_step_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if requested_variant not in ('SOFT_WOOD', 'WARM_BELL', 'AIR_CHIME', 'LOW_RESONANCE') then
    raise exception 'Invalid taiji sound variant';
  end if;
  if requested_field not in ('assigned', 'completed', 'muted_immediately', 'replayed', 'next_step') then
    raise exception 'Invalid taiji sound preference event field';
  end if;

  insert into public.taiji_sound_preference_stats (variant)
  values (requested_variant)
  on conflict (variant) do nothing;

  update public.taiji_sound_preference_stats
  set
    assigned_count = assigned_count + case when requested_field = 'assigned' then 1 else 0 end,
    completed_count = completed_count + case when requested_field = 'completed' then 1 else 0 end,
    muted_immediately_count = muted_immediately_count + case when requested_field = 'muted_immediately' then 1 else 0 end,
    replayed_count = replayed_count + case when requested_field = 'replayed' then 1 else 0 end,
    next_step_count = next_step_count + case when requested_field = 'next_step' then 1 else 0 end,
    updated_at = now()
  where variant = requested_variant;

  return query
  select stats.variant, stats.assigned_count, stats.completed_count, stats.muted_immediately_count, stats.replayed_count, stats.next_step_count
  from public.taiji_sound_preference_stats as stats
  where stats.variant = requested_variant;
end;
$$;

revoke all on function public.record_taiji_sound_event(text, text) from public, anon, authenticated;
grant usage on schema public to service_role;
grant execute on function public.record_taiji_sound_event(text, text) to service_role;
