
-- 1) E-Cell toggle column on events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_ecell_event boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_events_is_ecell_event
  ON public.events (is_ecell_event)
  WHERE is_ecell_event = true;

-- 2) Auto-fill college_id on event insert from creator's role
CREATE OR REPLACE FUNCTION public.events_set_college_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_college uuid;
BEGIN
  IF NEW.college_id IS NULL THEN
    SELECT college_id INTO v_college
    FROM public.user_roles
    WHERE user_id = COALESCE(NEW.created_by, auth.uid())
      AND college_id IS NOT NULL
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_college IS NULL THEN
      SELECT id INTO v_college FROM public.colleges
      WHERE is_active = true
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;

    NEW.college_id := v_college;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_set_college_id ON public.events;
CREATE TRIGGER trg_events_set_college_id
BEFORE INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.events_set_college_id();

-- 3) Backfill: attach existing admins/super_admins to the (single) active college
--    if their user_roles row is missing a college_id. Also backfill events.college_id.
UPDATE public.user_roles ur
SET college_id = c.id
FROM public.colleges c
WHERE ur.role IN ('admin', 'super_admin')
  AND ur.college_id IS NULL
  AND c.is_active = true
  AND (SELECT count(*) FROM public.colleges WHERE is_active = true) = 1;

UPDATE public.events e
SET college_id = c.id
FROM public.colleges c
WHERE e.college_id IS NULL
  AND c.is_active = true
  AND (SELECT count(*) FROM public.colleges WHERE is_active = true) = 1;
