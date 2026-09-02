-- 20260903070000_faculty_title_prefix.sql
-- Add professional title / prefix to profiles for faculty members

-- 1. Add title column if it does not already exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS title text;

-- 2. Enforce check constraint for the allowed professional titles: Dr., Mr., Ms., Mrs.
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_title_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_title_check
CHECK (title IS NULL OR title IN ('Dr.', 'Mr.', 'Ms.', 'Mrs.'));

-- 3. Comment for schema documentation
COMMENT ON COLUMN public.profiles.title IS 'Professional title / prefix for faculty and staff (Dr., Mr., Ms., Mrs.)';
