-- 乾淨版：按讚併入首頁信任卡「認同」（home_trust_counters）；瀏覽人數表不再使用。
drop function if exists public.record_ai_like(text, text);
drop function if exists public.record_visitor_visit(text, uuid);
drop table if exists public.like_logs;
drop table if exists public.like_counter;
drop table if exists public.visitor_counter_visits;
drop table if exists public.visitor_counters;
