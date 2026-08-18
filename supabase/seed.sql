-- ============================================================
-- Campus Connect — Reference / bootstrap seed
-- ============================================================
-- Idempotent. Safe to re-run. Contains ONLY system reference data
-- extracted from the existing migrations. It contains NO production
-- rows (no students, no attendance, no points, no documents).
--
-- Run AFTER all migrations in supabase/migrations/ have been applied:
--   psql "$DATABASE_URL" -f supabase/seed.sql
-- ============================================================

-- ---------- 1. Points engine defaults (REQUIRED) ----------
INSERT INTO public.points_rules (points_per_attendance)
SELECT 1
WHERE NOT EXISTS (SELECT 1 FROM public.points_rules);

-- ---------- 2. Platform settings (REQUIRED) ----------
-- platform_mode drives MaintenanceModeScreen / LaunchModeScreen / SemesterClosedScreen.
INSERT INTO public.platform_settings (key, value)
VALUES (
  'platform_mode',
  '{"mode": "normal", "custom_headline": null, "custom_subtext": null, "custom_suspense": null, "estimated_return": null}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- landing_content is the CMS payload edited by Super Admin -> Landing Editor.
INSERT INTO public.platform_settings (key, value)
VALUES ('landing_content', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------- 3. Platform branding (REQUIRED — single row) ----------
INSERT INTO public.platform_branding (brand_name, tagline)
SELECT 'Campus Connect', 'By Students For Students'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_branding);

-- ---------- 4. Achievements catalogue (REQUIRED for gamification) ----------
INSERT INTO public.achievements (code, title, description, icon, points_reward) VALUES
  ('first_attendance',   'First Step',          'Marked your first attendance',        '👟', 5),
  ('streak_7',           '7-Day Warrior',       'Logged in 7 days in a row',           '🔥', 20),
  ('streak_30',          '30-Day Legend',       'Logged in 30 days in a row',          '💎', 100),
  ('attendance_perfect', 'Perfect Attendance',  'Attended all lectures this month',    '⭐', 50),
  ('points_100',         'Century Club',        'Earned 100 points total',             '💯', 10),
  ('points_500',         'High Achiever',       'Earned 500 points total',             '🚀', 25),
  ('top_10',             'Top 10 Ranked',       'Reached the top 10 leaderboard',      '🏅', 30),
  ('gold_tier',          'Gold Tier Reached',   'Achieved Gold tier status',           '🥇', 50)
ON CONFLICT (code) DO NOTHING;

-- ---------- 5. Module-level sub-role permissions (REQUIRED for admin sub-roles) ----------
INSERT INTO public.permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
  ('hod',               'students',      true,  false, true,  false),
  ('hod',               'faculty',       true,  false, true,  false),
  ('hod',               'lectures',      true,  true,  true,  false),
  ('hod',               'attendance',    true,  true,  true,  false),
  ('hod',               'departments',   true,  false, false, false),
  ('hod',               'reports',       true,  false, false, false),
  ('class_coordinator', 'students',      true,  false, true,  false),
  ('class_coordinator', 'attendance',    true,  true,  true,  false),
  ('class_coordinator', 'lectures',      true,  false, false, false),
  ('class_coordinator', 'announcements', true,  true,  false, false),
  ('event_manager',     'events',        true,  true,  true,  true),
  ('event_manager',     'announcements', true,  true,  false, false),
  ('event_manager',     'challenges',    true,  true,  true,  false)
ON CONFLICT DO NOTHING;

-- ---------- 6. Institution partners marquee (OPTIONAL — demo/branding content) ----------
INSERT INTO public.institution_partners (name, logo_url, city, state, badge, is_active, display_order)
SELECT
  'B. K. Birla Night Arts, Science & Commerce College',
  NULL,                       -- re-upload the logo and set the public URL after migration
  'Kalyan',
  'Maharashtra',
  'Founding Institution Partner',
  true,
  0
WHERE NOT EXISTS (SELECT 1 FROM public.institution_partners);

-- ============================================================
-- NOT SEEDED HERE (must be created explicitly — see docs/MIGRATION_GUIDE.md)
--   * colleges          -> create the tenant first; everything else keys off college_id
--   * auth.users        -> created via Supabase Auth / ensure-admin-account edge function
--   * user_roles        -> assigned when accounts are created
--   * departments / programmes / classes / timetable_slots -> per-college academic setup
--   * storage buckets   -> created via the Storage API, not SQL (see docs/STORAGE.md)
-- ============================================================
