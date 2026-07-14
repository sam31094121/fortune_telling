create table if not exists public.number_rules (
  rule_id uuid primary key default extensions.gen_random_uuid(),
  rule_version text not null references public.number_rule_versions(rule_version),
  rule_key text not null,
  rule_payload jsonb not null,
  source_type text not null check (
    source_type in ('traditional_rule', 'internal_statistical_model', 'verified_feedback')
  ),
  status text not null check (status in ('draft', 'active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rule_version, rule_key)
);

create table if not exists public.number_pattern_statistics (
  pattern text not null,
  pattern_type text not null check (pattern_type in ('single', 'pair', 'triple', 'whole')),
  rule_version text not null references public.number_rule_versions(rule_version),
  sample_count bigint not null default 0 check (sample_count >= 0),
  accurate_count bigint not null default 0 check (accurate_count >= 0),
  partial_count bigint not null default 0 check (partial_count >= 0),
  inaccurate_count bigint not null default 0 check (inaccurate_count >= 0),
  confidence numeric(6, 3) not null default 0 check (confidence >= 0 and confidence <= 100),
  updated_at timestamptz not null default now(),
  primary key (pattern, pattern_type, rule_version)
);

create table if not exists public.number_analysis_records (
  analysis_id uuid primary key,
  input_hash text not null,
  input_mode text not null check (input_mode in ('last4', 'phone10')),
  rule_version text not null references public.number_rule_versions(rule_version),
  engine_version text not null,
  matrix_json jsonb not null,
  index_json jsonb not null,
  final_score smallint not null check (final_score >= 0 and final_score <= 100),
  fortune_level text not null check (fortune_level in ('吉勢較強', '偏吉', '平衡穩定', '需要留意', '波動較高')),
  confidence_score smallint not null check (confidence_score >= 0 and confidence_score <= 100),
  created_at timestamptz not null default now()
);

create table if not exists public.number_feedback_records (
  feedback_id uuid primary key default extensions.gen_random_uuid(),
  analysis_id uuid not null references public.number_analysis_records(analysis_id) on delete cascade,
  feedback_type text not null check (feedback_type in ('accurate', 'partial', 'inaccurate')),
  feedback_score smallint check (feedback_score is null or (feedback_score >= 0 and feedback_score <= 100)),
  anonymous_user_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.number_model_metrics (
  id uuid primary key default extensions.gen_random_uuid(),
  rule_version text not null references public.number_rule_versions(rule_version),
  metric_key text not null,
  metric_value numeric(8, 3) not null check (metric_value >= 0 and metric_value <= 100),
  sample_count bigint not null default 0 check (sample_count >= 0),
  created_at timestamptz not null default now(),
  unique (rule_version, metric_key)
);

alter table public.number_rules enable row level security;
alter table public.number_pattern_statistics enable row level security;
alter table public.number_analysis_records enable row level security;
alter table public.number_feedback_records enable row level security;
alter table public.number_model_metrics enable row level security;

revoke all on table public.number_rules from anon, authenticated;
revoke all on table public.number_pattern_statistics from anon, authenticated;
revoke all on table public.number_analysis_records from anon, authenticated;
revoke all on table public.number_feedback_records from anon, authenticated;
revoke all on table public.number_model_metrics from anon, authenticated;

grant all on table public.number_rules to service_role;
grant all on table public.number_pattern_statistics to service_role;
grant all on table public.number_analysis_records to service_role;
grant all on table public.number_feedback_records to service_role;
grant all on table public.number_model_metrics to service_role;

alter table public.number_analysis_results
  drop constraint if exists number_analysis_results_level_check;

alter table public.number_analysis_results
  add constraint number_analysis_results_level_check
  check (level in ('高正向', '偏正向', '穩定', '吉勢較強', '偏吉', '平衡穩定', '需要留意', '波動較高'));

alter table public.number_analysis_results
  add column if not exists indexes jsonb not null default '{}'::jsonb,
  add column if not exists confidence_score smallint check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 100));

insert into public.number_rule_versions (rule_version, display_name, engine_name, weights, status, notes)
values (
  'V5.0.0',
  '數字論吉凶 AI 統計分析系統 V5.0',
  'Number Core Engine',
  '{
    "last4": {
      "singleDigit": 15,
      "pair": 20,
      "triple": 15,
      "whole": 20,
      "repeat": 10,
      "arrangement": 10,
      "sumRoot": 10
    },
    "phone10": {
      "fullDigit": 15,
      "front": 10,
      "middle": 15,
      "back": 25,
      "combination": 15,
      "repeatArrangement": 10,
      "sumRoot": 10
    }
  }'::jsonb,
  'active',
  'V5.0.0 adds five statistical indexes, analysis confidence, masked API output, and offline feedback tables. Matrix fields remain aligned with the existing Number Core Engine contract.'
)
on conflict (rule_version) do nothing;

insert into public.number_model_metrics (rule_version, metric_key, metric_value, sample_count)
values
  ('V5.0.0', 'model_stability_baseline', 96, 0),
  ('V5.0.0', 'last4_input_completeness_cap', 80, 0),
  ('V5.0.0', 'phone10_input_completeness_cap', 100, 0)
on conflict (rule_version, metric_key) do nothing;

create index if not exists number_analysis_records_hash_idx
  on public.number_analysis_records (input_hash);

create index if not exists number_analysis_records_version_created_idx
  on public.number_analysis_records (rule_version, created_at desc);

create index if not exists number_feedback_records_analysis_idx
  on public.number_feedback_records (analysis_id);
