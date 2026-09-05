-- ============================================================
-- Migration: 20260906010000_event_deletion_cascade_cleanup.sql
-- Description: Enforce database-level cascade deletion of event-owned
--              data (stall registrations) on event deletion, while
--              preserving shared student point claims.
-- ============================================================

-- ============================================================
-- AUDIT DOCUMENTATION
-- ============================================================
-- Complete schema audit of all tables referencing public.events:
--
-- 1. public.stall_registrations.event_id:
--    - Classification: Category A (Event-owned child data)
--    - Rationale: Stall registrations, team member lists, requirements,
--      and approvals exist exclusively for that specific event.
--      Orphaned stall registrations must never exist without their parent event.
--    - Action: Enforce ON DELETE CASCADE foreign key relationship.
--
-- 2. public.point_claims.event_id:
--    - Classification: Category B (Shared / Student-owned history)
--    - Rationale: Point claims represent student achievement, engagement,
--      and ledger history. When an event is archived/deleted, student point
--      balances and historical activity must NOT be wiped out.
--    - Action: Maintain ON DELETE SET NULL relationship.
-- ============================================================

-- 1. Ensure backward-compatibility: sanitize any dangling event_id references
UPDATE public.stall_registrations s
SET event_id = NULL
WHERE s.event_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = s.event_id);

-- 2. Update Foreign Key on stall_registrations to ON DELETE CASCADE
ALTER TABLE public.stall_registrations
  DROP CONSTRAINT IF EXISTS stall_registrations_event_id_fkey;

ALTER TABLE public.stall_registrations
  ADD CONSTRAINT stall_registrations_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- 3. Ensure indexing on event_id for fast cascade performance
CREATE INDEX IF NOT EXISTS idx_stall_registrations_event_id
  ON public.stall_registrations(event_id);

-- 4. Create transactional, secure RPC for complete event deletion + asset metadata return
CREATE OR REPLACE FUNCTION public.delete_event_cascade(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_super boolean := false;
  v_is_adm boolean := false;
  v_my_college uuid;
  v_event record;
  v_stalls_deleted integer := 0;
  v_flyer_urls text[] := ARRAY[]::text[];
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required to delete events.';
  END IF;

  v_is_super := public.is_super_admin(v_caller);
  v_is_adm := public.is_admin(v_caller);
  v_my_college := public.get_my_college_id();

  IF NOT (v_is_super OR v_is_adm) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators may delete events.';
  END IF;

  -- Lock target event row and verify ownership
  SELECT id, title, college_id, flyer_url, poster_url, full_flyer_url
  INTO v_event
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found or has already been deleted.';
  END IF;

  IF NOT v_is_super AND v_event.college_id IS NOT NULL AND v_my_college IS NOT NULL AND v_event.college_id <> v_my_college THEN
    RAISE EXCEPTION 'Unauthorized: Cannot delete events belonging to another college.';
  END IF;

  -- Collect event-owned flyer URLs for post-delete storage cleanup
  IF v_event.flyer_url IS NOT NULL AND trim(v_event.flyer_url) <> '' THEN
    v_flyer_urls := array_append(v_flyer_urls, v_event.flyer_url);
  END IF;

  IF v_event.poster_url IS NOT NULL AND trim(v_event.poster_url) <> '' AND NOT (v_event.poster_url = ANY(v_flyer_urls)) THEN
    v_flyer_urls := array_append(v_flyer_urls, v_event.poster_url);
  END IF;

  IF v_event.full_flyer_url IS NOT NULL AND trim(v_event.full_flyer_url) <> '' AND NOT (v_event.full_flyer_url = ANY(v_flyer_urls)) THEN
    v_flyer_urls := array_append(v_flyer_urls, v_event.full_flyer_url);
  END IF;

  -- Count affected stall registrations before cascade
  SELECT COUNT(*) INTO v_stalls_deleted
  FROM public.stall_registrations
  WHERE event_id = p_event_id;

  -- Delete event row; foreign key ON DELETE CASCADE automatically removes linked stall_registrations
  DELETE FROM public.events WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'title', v_event.title,
    'deleted_stalls_count', v_stalls_deleted,
    'flyer_urls', to_jsonb(v_flyer_urls)
  );
END;
$$;

-- Grant execution permission to authenticated users (internal check enforces admin privilege)
GRANT EXECUTE ON FUNCTION public.delete_event_cascade(uuid) TO authenticated;
