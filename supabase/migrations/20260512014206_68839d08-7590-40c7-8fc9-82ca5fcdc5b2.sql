ALTER TABLE public.departments
ADD COLUMN IF NOT EXISTS normalized_name text;

UPDATE public.departments
SET normalized_name = lower(regexp_replace(trim(name), '\s+', ' ', 'g'))
WHERE normalized_name IS NULL OR normalized_name = '';

ALTER TABLE public.departments
ALTER COLUMN normalized_name SET DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS departments_college_normalized_name_key
ON public.departments (college_id, normalized_name);

CREATE OR REPLACE FUNCTION public.departments_set_normalized_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.normalized_name := lower(regexp_replace(trim(NEW.name), '\s+', ' ', 'g'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS departments_normalize_name ON public.departments;
CREATE TRIGGER departments_normalize_name
BEFORE INSERT OR UPDATE OF name ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.departments_set_normalized_name();