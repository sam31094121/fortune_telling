create extension if not exists pgcrypto with schema extensions;

create table if not exists public.number_rule_versions (
  rule_version text primary key,
  display_name text not null,
  engine_name text not null default 'Number Core Engine',
  weights jsonb not null,
  status text not null check (status in ('draft', 'active', 'retired')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.number_pattern_rules (
  rule_id uuid primary key default extensions.gen_random_uuid(),
  rule_version text not null references public.number_rule_versions(rule_version),
  input_pattern text not null,
  affected_dimension text not null check (
    affected_dimension in (
      'wealth',
      'career',
      'love',
      'family',
      'social',
      'health',
      'growth',
      'risk',
      'pressure',
      'stability'
    )
  ),
  weight numeric(6, 3) not null check (weight >= 0 and weight <= 100),
  source_type text not null check (
    source_type in ('traditional_rule', 'internal_statistical_model', 'verified_feedback')
  ),
  status text not null check (status in ('draft', 'active', 'retired')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rule_version, input_pattern, affected_dimension, source_type)
);

create table if not exists public.number_pair_statistics (
  pair_pattern char(2) primary key check (pair_pattern ~ '^[0-9]{2}$'),
  rule_version text not null references public.number_rule_versions(rule_version),
  sample_count bigint not null default 0 check (sample_count >= 0),
  positive_feedback_count bigint not null default 0 check (positive_feedback_count >= 0),
  partial_feedback_count bigint not null default 0 check (partial_feedback_count >= 0),
  negative_feedback_count bigint not null default 0 check (negative_feedback_count >= 0),
  confidence numeric(6, 3) not null default 0 check (confidence >= 0 and confidence <= 100),
  updated_at timestamptz not null default now()
);

create table if not exists public.number_triple_statistics (
  triple_pattern char(3) primary key check (triple_pattern ~ '^[0-9]{3}$'),
  rule_version text not null references public.number_rule_versions(rule_version),
  sample_count bigint not null default 0 check (sample_count >= 0),
  positive_feedback_count bigint not null default 0 check (positive_feedback_count >= 0),
  partial_feedback_count bigint not null default 0 check (partial_feedback_count >= 0),
  negative_feedback_count bigint not null default 0 check (negative_feedback_count >= 0),
  confidence numeric(6, 3) not null default 0 check (confidence >= 0 and confidence <= 100),
  updated_at timestamptz not null default now()
);

create table if not exists public.number_analysis_results (
  id uuid primary key default extensions.gen_random_uuid(),
  analysis_hash text not null,
  rule_version text not null references public.number_rule_versions(rule_version),
  input_mode text not null check (input_mode in ('last4', 'phone10')),
  input_length smallint not null check (input_length in (4, 10)),
  input_last4 char(4) not null check (input_last4 ~ '^[0-9]{4}$'),
  score smallint not null check (score >= 0 and score <= 100),
  level text not null check (level in ('高正向', '偏正向', '穩定', '需要留意', '波動較高')),
  matrix jsonb not null,
  evidence jsonb not null,
  summary text not null,
  strengths jsonb not null default '[]'::jsonb,
  cautions jsonb not null default '[]'::jsonb,
  suitable_directions jsonb not null default '[]'::jsonb,
  advice text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.number_user_feedback (
  id uuid primary key default extensions.gen_random_uuid(),
  analysis_result_id uuid not null references public.number_analysis_results(id) on delete cascade,
  rule_version text not null references public.number_rule_versions(rule_version),
  feedback text not null check (feedback in ('很符合', '部分符合', '不符合')),
  created_at timestamptz not null default now()
);

alter table public.number_rule_versions enable row level security;
alter table public.number_pattern_rules enable row level security;
alter table public.number_pair_statistics enable row level security;
alter table public.number_triple_statistics enable row level security;
alter table public.number_analysis_results enable row level security;
alter table public.number_user_feedback enable row level security;

revoke all on table public.number_rule_versions from anon, authenticated;
revoke all on table public.number_pattern_rules from anon, authenticated;
revoke all on table public.number_pair_statistics from anon, authenticated;
revoke all on table public.number_triple_statistics from anon, authenticated;
revoke all on table public.number_analysis_results from anon, authenticated;
revoke all on table public.number_user_feedback from anon, authenticated;

grant usage on schema public to service_role;
grant all on table public.number_rule_versions to service_role;
grant all on table public.number_pattern_rules to service_role;
grant all on table public.number_pair_statistics to service_role;
grant all on table public.number_triple_statistics to service_role;
grant all on table public.number_analysis_results to service_role;
grant all on table public.number_user_feedback to service_role;

insert into public.number_rule_versions (rule_version, display_name, engine_name, weights, status, notes)
values (
  'V4.0.0',
  '數字論吉凶 AI 分析系統 V4.0',
  'Number Core Engine',
  '{
    "last4": {
      "singleDigit": 20,
      "pair": 25,
      "arrangement": 20,
      "repeat": 15,
      "root": 10,
      "sum": 10
    },
    "phone10": {
      "front": 15,
      "middle": 20,
      "back": 30,
      "arrangement": 15,
      "repeat": 10,
      "root": 10
    }
  }'::jsonb,
  'active',
  'V4.0.0 uses a single Number Core Engine. AI text may only read the fixed matrix and must not recalculate scores.'
)
on conflict (rule_version) do nothing;

create index if not exists number_pattern_rules_version_pattern_idx
  on public.number_pattern_rules (rule_version, input_pattern);

create index if not exists number_analysis_results_hash_idx
  on public.number_analysis_results (analysis_hash);

create index if not exists number_analysis_results_version_created_idx
  on public.number_analysis_results (rule_version, created_at desc);

create index if not exists number_user_feedback_result_idx
  on public.number_user_feedback (analysis_result_id);

insert into public.number_pattern_rules (
  rule_version,
  input_pattern,
  affected_dimension,
  weight,
  source_type,
  status,
  notes
)
select
  'V4.0.0',
  seed.input_pattern,
  seed.affected_dimension,
  seed.weight,
  seed.source_type,
  'active',
  seed.notes
from (
  values
    ('16', 'wealth', 28, 'traditional_rule', 'One-six pattern is treated as resource flow and practical wealth support.'),
    ('24', 'stability', 22, 'traditional_rule', 'Two-four pattern emphasizes structure, responsibility, and steady execution.'),
    ('32', 'growth', 22, 'traditional_rule', 'Three-two pattern supports learning, negotiation, and growth.'),
    ('39', 'career', 26, 'traditional_rule', 'Three-nine pattern adds ambition and outward career movement.'),
    ('52', 'social', 18, 'traditional_rule', 'Five-two pattern improves social adjustment but needs pacing.'),
    ('57', 'growth', 18, 'traditional_rule', 'Five-seven pattern signals exploration and adaptive growth.'),
    ('63', 'wealth', 24, 'traditional_rule', 'Six-three pattern combines support, planning, and resource conversion.'),
    ('68', 'wealth', 32, 'traditional_rule', 'Six-eight pattern is a strong resource and accumulation signal.'),
    ('86', 'wealth', 30, 'traditional_rule', 'Eight-six pattern keeps wealth momentum with support-oriented stability.'),
    ('88', 'wealth', 34, 'traditional_rule', 'Double-eight pattern strengthens accumulation but should avoid over-concentration.'),
    ('14', 'pressure', 18, 'traditional_rule', 'One-four pattern can feel strict and should be managed with clarity.'),
    ('34', 'pressure', 22, 'traditional_rule', 'Three-four pattern has creative pressure and benefits from order.'),
    ('44', 'risk', 24, 'traditional_rule', 'Double-four pattern increases rigidity and risk awareness.'),
    ('54', 'pressure', 20, 'traditional_rule', 'Five-four pattern can create adjustment pressure.'),
    ('74', 'risk', 22, 'traditional_rule', 'Seven-four pattern requires practical risk control.'),
    ('94', 'risk', 22, 'traditional_rule', 'Nine-four pattern has strong change pressure and should keep backups.'),
    ('168', 'wealth', 36, 'traditional_rule', 'One-six-eight pattern is a classic resource-building combination.'),
    ('268', 'stability', 32, 'traditional_rule', 'Two-six-eight pattern supports steady accumulation and teamwork.'),
    ('368', 'career', 34, 'traditional_rule', 'Three-six-eight pattern links expression, support, and career expansion.'),
    ('688', 'wealth', 36, 'traditional_rule', 'Six-eight-eight pattern intensifies resource accumulation.'),
    ('888', 'wealth', 40, 'traditional_rule', 'Triple-eight pattern is high accumulation with concentration risk.'),
    ('444', 'risk', 34, 'traditional_rule', 'Triple-four pattern raises rigidity and operational risk.'),
    ('000', 'pressure', 26, 'internal_statistical_model', 'Triple-zero pattern is treated as reset and empty-cycle pressure.'),
    ('949', 'risk', 28, 'traditional_rule', 'Nine-four-nine pattern mixes change and blockage, requiring risk reduction.')
) as seed(input_pattern, affected_dimension, weight, source_type, notes)
on conflict (rule_version, input_pattern, affected_dimension, source_type) do nothing;
