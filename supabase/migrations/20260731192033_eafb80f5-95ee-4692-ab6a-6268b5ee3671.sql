-- 1. Repair broken relationships: stall_registrations.event_id / point_claims.event_id
ALTER TABLE public.stall_registrations ALTER COLUMN event_id DROP NOT NULL;

UPDATE public.stall_registrations s
SET event_id = NULL
WHERE s.event_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = s.event_id);

UPDATE public.point_claims c
SET event_id = NULL
WHERE c.event_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = c.event_id);

ALTER TABLE public.stall_registrations
  ADD CONSTRAINT stall_registrations_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;

ALTER TABLE public.point_claims
  ADD CONSTRAINT point_claims_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stall_registrations_event_id ON public.stall_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_stall_registrations_user_id ON public.stall_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_point_claims_event_id ON public.point_claims(event_id);
CREATE INDEX IF NOT EXISTS idx_events_date_ecell ON public.events(event_date, is_ecell_event);

-- 2. Tenant-correct visibility for events
DROP POLICY IF EXISTS "Active users can view events" ON public.events;
CREATE POLICY "Members can view their college events"
ON public.events FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (public.is_active_user(auth.uid()) AND college_id = public.get_my_college_id())
);

DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
CREATE POLICY "Admins manage their college events"
ON public.events FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (public.is_admin(auth.uid()) AND college_id = public.get_my_college_id())
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (public.is_admin(auth.uid()) AND college_id = public.get_my_college_id())
);