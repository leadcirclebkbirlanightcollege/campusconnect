-- Add faculty to app_role enum (must be committed before use)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'faculty';