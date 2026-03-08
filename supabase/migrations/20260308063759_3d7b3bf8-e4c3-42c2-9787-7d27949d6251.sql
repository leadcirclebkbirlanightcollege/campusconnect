
-- 1. Create daily_checkins table
CREATE TABLE public.daily_checkins (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL,
  college_id    UUID,
  checkin_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT daily_checkins_user_date_unique UNIQUE (user_id, checkin_date)
);

-- 2. Enable RLS
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can view own check-ins, admins view all"
  ON public.daily_checkins FOR SELECT
  USING ((user_id = auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Service role can insert check-ins"
  ON public.daily_checkins FOR INSERT
  WITH CHECK ((user_id = auth.uid()) OR is_admin(auth.uid()));

-- 4. Index for fast lookup
CREATE INDEX idx_daily_checkins_user_date ON public.daily_checkins (user_id, checkin_date DESC);

-- 5. Update points_ledger source check constraint to allow daily_checkin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'points_ledger'
      AND constraint_type = 'CHECK'
      AND constraint_name = 'points_ledger_source_check'
  ) THEN
    ALTER TABLE public.points_ledger DROP CONSTRAINT points_ledger_source_check;
  END IF;
END$$;

ALTER TABLE public.points_ledger
  ADD CONSTRAINT points_ledger_source_check
  CHECK (source IN ('attendance', 'manual', 'event', 'admin_adjustment', 'daily_reward', 'daily_checkin'));

-- 6. Update points_ledger insert policy to include daily_checkin source
DROP POLICY IF EXISTS "System can insert attendance points" ON public.points_ledger;
CREATE POLICY "System can insert points"
  ON public.points_ledger FOR INSERT
  WITH CHECK (
    (source = ANY (ARRAY['attendance'::text, 'daily_reward'::text, 'daily_checkin'::text]))
    OR is_admin(auth.uid())
  );
