-- Migration: 20260905120000_restore_canonical_brand_color.sql
-- Restores canonical brand color scheme by resetting temporary light-blue/cyan primary_color (#06B6D4) to NULL.
-- When primary_color is NULL, the system defaults to Campus Connect's canonical royal blue brand theme (#3157C7).

UPDATE public.colleges
SET primary_color = NULL
WHERE primary_color = '#5806d4ff' OR primary_color ILIKE '%06B6D4%';
