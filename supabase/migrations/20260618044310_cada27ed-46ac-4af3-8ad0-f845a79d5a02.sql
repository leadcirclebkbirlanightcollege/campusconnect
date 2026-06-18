CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_tickets_college_status_idx ON public.support_tickets(college_id, status, last_message_at DESC);
CREATE INDEX support_tickets_creator_idx ON public.support_tickets(created_by, last_message_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_owner_select" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "tickets_staff_select" ON public.support_tickets
  FOR SELECT TO authenticated
  USING ((public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
         AND (public.is_super_admin(auth.uid()) OR college_id = public.get_my_college_id()));

CREATE POLICY "tickets_owner_insert" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "tickets_owner_update" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND status <> 'closed')
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "tickets_staff_update" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING ((public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
         AND (public.is_super_admin(auth.uid()) OR college_id = public.get_my_college_id()));


CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_role text NOT NULL DEFAULT 'student',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ticket_messages_ticket_idx ON public.ticket_messages(ticket_id, created_at);

GRANT SELECT, INSERT ON public.ticket_messages TO authenticated;
GRANT ALL ON public.ticket_messages TO service_role;

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_msg_select" ON public.ticket_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND (
        t.created_by = auth.uid()
        OR (
          (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
          AND (public.is_super_admin(auth.uid()) OR t.college_id = public.get_my_college_id())
        )
      )
  ));

CREATE POLICY "ticket_msg_insert" ON public.ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          t.created_by = auth.uid()
          OR (
            (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
            AND (public.is_super_admin(auth.uid()) OR t.college_id = public.get_my_college_id())
          )
        )
    )
  );

CREATE OR REPLACE FUNCTION public.bump_ticket_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_tickets
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at,
      status = CASE
        WHEN status = 'closed' THEN 'open'
        WHEN NEW.author_role IN ('admin','super_admin') AND status = 'open' THEN 'pending_user'
        WHEN NEW.author_role = 'student' AND status = 'pending_user' THEN 'open'
        ELSE status
      END
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_ticket_last_message
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_ticket_last_message();

CREATE OR REPLACE FUNCTION public.set_ticket_college_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.college_id IS NULL THEN
    NEW.college_id := public.get_my_college_id();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_ticket_college_id
  BEFORE INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_ticket_college_id();