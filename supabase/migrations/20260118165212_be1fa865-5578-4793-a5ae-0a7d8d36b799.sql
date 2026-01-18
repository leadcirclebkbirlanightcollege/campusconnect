-- Account deletion requests (soft process; does NOT delete auth user)
CREATE TYPE public.account_deletion_status AS ENUM ('requested', 'approved', 'rejected', 'completed');

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reason TEXT NULL,
  status public.account_deletion_status NOT NULL DEFAULT 'requested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ NULL,
  reviewed_by UUID NULL,
  admin_note TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id
  ON public.account_deletion_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status
  ON public.account_deletion_requests(status);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can create and view their own request
CREATE POLICY "Users can create own deletion request"
ON public.account_deletion_requests
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own deletion request"
ON public.account_deletion_requests
FOR SELECT
USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Admins can manage requests
CREATE POLICY "Admins can update deletion requests"
ON public.account_deletion_requests
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete deletion requests"
ON public.account_deletion_requests
FOR DELETE
USING (is_admin(auth.uid()));

-- Optional: prevent multiple open requests per user (enforced via trigger instead of CHECK)
CREATE OR REPLACE FUNCTION public.prevent_multiple_open_deletion_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.status IN ('requested', 'approved')) THEN
    IF EXISTS (
      SELECT 1
      FROM public.account_deletion_requests r
      WHERE r.user_id = NEW.user_id
        AND r.status IN ('requested', 'approved')
        AND (TG_OP = 'INSERT' OR r.id <> NEW.id)
    ) THEN
      RAISE EXCEPTION 'A deletion request is already open for this user.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_multiple_open_deletion_requests ON public.account_deletion_requests;
CREATE TRIGGER trg_prevent_multiple_open_deletion_requests
BEFORE INSERT OR UPDATE ON public.account_deletion_requests
FOR EACH ROW
EXECUTE FUNCTION public.prevent_multiple_open_deletion_requests();

-- Realtime (optional, safe): enable only if you plan to subscribe
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.account_deletion_requests;