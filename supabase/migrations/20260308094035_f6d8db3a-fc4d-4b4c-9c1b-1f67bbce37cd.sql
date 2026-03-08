
-- ── User Feedback Table ──────────────────────────────────────────────────────
CREATE TABLE public.feedback (
  id           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL,
  college_id   uuid REFERENCES public.colleges(id) ON DELETE SET NULL,
  category     text NOT NULL DEFAULT 'general',
  message      text NOT NULL,
  status       text NOT NULL DEFAULT 'open',
  admin_note   text,
  reviewed_by  uuid,
  reviewed_at  timestamp with time zone,
  created_at   timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit own feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own feedback"
  ON public.feedback FOR SELECT
  USING ((user_id = auth.uid()) OR is_admin(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can update feedback status"
  ON public.feedback FOR UPDATE
  USING (is_admin(auth.uid()) OR is_super_admin(auth.uid()));

CREATE INDEX idx_feedback_college_status ON public.feedback (college_id, status, created_at DESC);
CREATE INDEX idx_feedback_user ON public.feedback (user_id, created_at DESC);
