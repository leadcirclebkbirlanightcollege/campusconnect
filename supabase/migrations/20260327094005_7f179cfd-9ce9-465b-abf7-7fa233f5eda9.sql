
-- Permissions table for dynamic role-based access control
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  module text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, module, college_id)
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage permissions"
  ON public.permissions FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view permissions"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (true);

-- Seed default permissions for sub-roles
INSERT INTO public.permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
  ('hod', 'students', true, false, true, false),
  ('hod', 'faculty', true, false, true, false),
  ('hod', 'lectures', true, true, true, false),
  ('hod', 'attendance', true, true, true, false),
  ('hod', 'departments', true, false, false, false),
  ('hod', 'reports', true, false, false, false),
  ('class_coordinator', 'students', true, false, true, false),
  ('class_coordinator', 'attendance', true, true, true, false),
  ('class_coordinator', 'lectures', true, false, false, false),
  ('class_coordinator', 'announcements', true, true, false, false),
  ('event_manager', 'events', true, true, true, true),
  ('event_manager', 'announcements', true, true, false, false),
  ('event_manager', 'challenges', true, true, true, false);
