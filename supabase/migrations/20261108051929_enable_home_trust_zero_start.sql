-- Owner explicitly requested a new zero baseline, with no history import.
-- Run after 20261108051303. Old RPCs and rows are retired by that migration.
CREATE TABLE public.home_trust_counters (
  id text PRIMARY KEY CHECK (id = 'home'),
  epoch text NOT NULL CHECK (epoch = 'home-20261108-v2'),
  agree_count bigint NOT NULL DEFAULT 0 CHECK (agree_count >= 0),
  disagree_count bigint NOT NULL DEFAULT 0 CHECK (disagree_count >= 0),
  view_count bigint NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.home_trust_events (
  epoch text NOT NULL CHECK (epoch = 'home-20261108-v2'),
  event_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('agree','disagree','view')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (epoch, event_id)
);
ALTER TABLE public.home_trust_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_trust_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.home_trust_counters, public.home_trust_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.home_trust_counters TO service_role;
GRANT SELECT, INSERT ON public.home_trust_events TO service_role;
INSERT INTO public.home_trust_counters (id, epoch) VALUES ('home','home-20261108-v2');

CREATE FUNCTION public.home_trust_increment_v2(p_kind text, p_event_id uuid, p_epoch text)
RETURNS TABLE(epoch text, agree_count bigint, disagree_count bigint, view_count bigint, revision bigint, applied boolean)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE inserted_rows integer; prior_kind text;
BEGIN
  IF p_kind IS NULL OR p_kind NOT IN ('agree','disagree','view') OR p_event_id IS NULL OR p_epoch IS DISTINCT FROM 'home-20261108-v2' THEN
    RAISE EXCEPTION 'Invalid counter event' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.home_trust_events (epoch,event_id,kind) VALUES (p_epoch,p_event_id,p_kind)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted_rows = ROW_COUNT;
  IF inserted_rows = 1 THEN
    UPDATE public.home_trust_counters AS c SET
      agree_count = c.agree_count + CASE WHEN p_kind = 'agree' THEN 1 ELSE 0 END,
      disagree_count = c.disagree_count + CASE WHEN p_kind = 'disagree' THEN 1 ELSE 0 END,
      view_count = c.view_count + CASE WHEN p_kind = 'view' THEN 1 ELSE 0 END,
      revision = c.revision + 1, updated_at = now()
    WHERE c.id='home' AND c.epoch=p_epoch;
    IF NOT FOUND THEN RAISE EXCEPTION 'Counter missing'; END IF;
  ELSE
    SELECT e.kind INTO prior_kind FROM public.home_trust_events e WHERE e.epoch=p_epoch AND e.event_id=p_event_id;
    IF prior_kind IS DISTINCT FROM p_kind THEN RAISE EXCEPTION 'Event kind mismatch' USING ERRCODE='22023'; END IF;
  END IF;
  RETURN QUERY SELECT c.epoch,c.agree_count,c.disagree_count,c.view_count,c.revision,inserted_rows=1
    FROM public.home_trust_counters c WHERE c.id='home' AND c.epoch=p_epoch;
END;
$$;
REVOKE ALL ON FUNCTION public.home_trust_increment_v2(text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.home_trust_increment_v2(text,uuid,text) TO service_role;
