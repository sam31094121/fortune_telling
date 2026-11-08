-- Owner-authorized retirement, 2026-11-08:
-- 1 retains inactive UI; 2/3/4 are removed; 5 (number analysis) is untouched.
-- Explicit objects only. No CASCADE and no project/schema deletion.
DROP FUNCTION IF EXISTS public.home_trust_increment(text, text);
DROP FUNCTION IF EXISTS public.record_visitor_visit(text, uuid);
DROP FUNCTION IF EXISTS public.record_ai_suggestion(text, text);
DROP FUNCTION IF EXISTS public.record_taiji_sound_event(text, text);
DROP TABLE IF EXISTS public.visitor_counter_visits;
DROP TABLE IF EXISTS public.visitor_counters;
DROP TABLE IF EXISTS public.home_trust_counters;
DROP TABLE IF EXISTS public.suggestion_counter;
DROP TABLE IF EXISTS public.suggestion_logs;
DROP TABLE IF EXISTS public.taiji_sound_preference_stats;
