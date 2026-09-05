-- ============================================================
-- Migration: 20260906000005_individual_member_genders.sql
-- Description:
-- Add individual gender columns for all 4 team members:
-- - team_lead_gender
-- - member_2_gender
-- - member_3_gender
-- - member_4_gender
-- Legacy 'gender' column is preserved for backward compatibility.
-- ============================================================

ALTER TABLE public.stall_registrations
  ADD COLUMN IF NOT EXISTS team_lead_gender text,
  ADD COLUMN IF NOT EXISTS member_2_gender text,
  ADD COLUMN IF NOT EXISTS member_3_gender text,
  ADD COLUMN IF NOT EXISTS member_4_gender text;

-- Backfill legacy records where individual genders are null but legacy gender exists
UPDATE public.stall_registrations
SET team_lead_gender = gender
WHERE team_lead_gender IS NULL AND gender IS NOT NULL;
