-- Clear invalid pure-white brand color that was rendering all primary action buttons
-- and FABs as invisible white-on-white pills across the tenant.
-- Null = fall back to the system default brand (#6366F1).
UPDATE public.colleges
SET    primary_color = NULL
WHERE  primary_color ILIKE '#ffffff'
   OR  primary_color ILIKE '#fff'
   OR  primary_color ILIKE 'white';

-- Prevent the bug from ever returning: reject obviously unsafe brand colors
-- (pure white, near-white, pure black, transparent values) at the database
-- level. The frontend already has a runtime guardrail; this is defence in depth.
CREATE OR REPLACE FUNCTION public._colleges_validate_primary_color()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.primary_color IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.primary_color !~* '^#([0-9a-f]{3}|[0-9a-f]{6})$' THEN
    RAISE EXCEPTION 'primary_color must be a hex color like #6366F1';
  END IF;

  IF NEW.primary_color ILIKE '#ffffff'
     OR NEW.primary_color ILIKE '#fff'
     OR NEW.primary_color ILIKE '#fefefe'
     OR NEW.primary_color ILIKE '#000000'
     OR NEW.primary_color ILIKE '#000' THEN
    -- Silently coerce unsafe values to NULL so the tenant falls back to the
    -- safe system default instead of rendering invisible buttons.
    NEW.primary_color := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS colleges_validate_primary_color ON public.colleges;
CREATE TRIGGER colleges_validate_primary_color
BEFORE INSERT OR UPDATE OF primary_color ON public.colleges
FOR EACH ROW EXECUTE FUNCTION public._colleges_validate_primary_color();
