-- Add 8-digit ("digit8") support to Number Core Engine persistence tables.
-- Also repairs the pre-existing 'six6' / level-string CHECK constraint gaps
-- so 4/6/8/10-digit results all persist correctly under the same schema.

alter table public.number_analysis_results
  drop constraint if exists number_analysis_results_input_mode_check;
alter table public.number_analysis_results
  add constraint number_analysis_results_input_mode_check
  check (input_mode in ('last4', 'six6', 'digit8', 'phone10'));

alter table public.number_analysis_results
  drop constraint if exists number_analysis_results_input_length_check;
alter table public.number_analysis_results
  add constraint number_analysis_results_input_length_check
  check (input_length in (4, 6, 8, 10));

alter table public.number_analysis_results
  drop constraint if exists number_analysis_results_level_check;
alter table public.number_analysis_results
  add constraint number_analysis_results_level_check
  check (level in ('大吉', '吉', '次吉', '吉中帶凶', '中平', '凶中帶吉', '平下', '凶', '大凶', '最凶'));

alter table public.number_analysis_records
  drop constraint if exists number_analysis_records_input_mode_check;
alter table public.number_analysis_records
  add constraint number_analysis_records_input_mode_check
  check (input_mode in ('last4', 'six6', 'digit8', 'phone10'));

alter table public.number_analysis_records
  drop constraint if exists number_analysis_records_fortune_level_check;
alter table public.number_analysis_records
  add constraint number_analysis_records_fortune_level_check
  check (fortune_level in ('大吉', '吉', '次吉', '吉中帶凶', '中平', '凶中帶吉', '平下', '凶', '大凶', '最凶'));

insert into public.number_rule_versions (rule_version, display_name, engine_name, weights, status, notes)
values (
  'V5.1.0',
  '數字論吉凶 AI 統計分析系統 V5.1',
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
    "six6": {
      "singleDigit": 18,
      "frontPair": 14,
      "middlePair": 14,
      "backPairSum": 14,
      "back4": 20,
      "combination": 12,
      "repeatArrangement": 4,
      "sumRoot": 4
    },
    "digit8": {
      "fullDigit": 15,
      "front": 12,
      "middle": 18,
      "back": 25,
      "combination": 15,
      "repeatArrangement": 8,
      "sumRoot": 7
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
  'V5.1.0 adds 8-digit (digit8) support to the existing Number Core Engine alongside last4/six6/phone10. No new engine or table was created; digit8 reuses the same analysis pipeline, API route, and result schema.'
)
on conflict (rule_version) do nothing;

insert into public.number_model_metrics (rule_version, metric_key, metric_value, sample_count)
values
  ('V5.1.0', 'model_stability_baseline', 96, 0),
  ('V5.1.0', 'last4_input_completeness_cap', 80, 0),
  ('V5.1.0', 'six6_input_completeness_cap', 88, 0),
  ('V5.1.0', 'digit8_input_completeness_cap', 94, 0),
  ('V5.1.0', 'phone10_input_completeness_cap', 100, 0)
on conflict (rule_version, metric_key) do nothing;
