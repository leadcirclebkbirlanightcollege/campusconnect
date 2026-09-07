-- ─────────────────────────────────────────────────────────────────────────────
-- 20260908060000_fix_class_names.sql
--
-- Problem: When specialised B.Com. classes were created, all three
-- specialisations (BAF, BMS, BFM) received the generic "FYBCOM/SYBCOM/TYBCOM"
-- names, making them indistinguishable from generic B.Com. classes.
--
-- Fix: Update `classes.name` for BAF / BMS / BFM using department_id as the
-- precise key, then patch any matching `profiles.class_name` values so that
-- existing student records are consistent with the corrected class codes.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_baf_id  uuid;
  v_bms_id  uuid;
  v_bfm_id  uuid;
BEGIN
  -- ── Resolve department IDs by matching on the canonical code suffix ────────
  SELECT id INTO v_baf_id FROM public.departments
    WHERE name ILIKE '%Accounting%Finance%' LIMIT 1;

  SELECT id INTO v_bms_id FROM public.departments
    WHERE name ILIKE '%Management Studies%' LIMIT 1;

  SELECT id INTO v_bfm_id FROM public.departments
    WHERE name ILIKE '%Financial Markets%' LIMIT 1;

  -- ── Bail out gracefully if a department doesn't exist yet ─────────────────
  IF v_baf_id IS NULL AND v_bms_id IS NULL AND v_bfm_id IS NULL THEN
    RAISE NOTICE 'fix_class_names: no specialised B.Com. departments found – skipping.';
    RETURN;
  END IF;

  -- ── Fix classes.name ──────────────────────────────────────────────────────

  -- BAF
  IF v_baf_id IS NOT NULL THEN
    UPDATE public.classes
      SET name = REPLACE(REPLACE(REPLACE(name, 'FYBCOM', 'FYBAF'), 'SYBCOM', 'SYBAF'), 'TYBCOM', 'TYBAF')
      WHERE department_id = v_baf_id
        AND name IN ('FYBCOM', 'SYBCOM', 'TYBCOM');
  END IF;

  -- BMS
  IF v_bms_id IS NOT NULL THEN
    UPDATE public.classes
      SET name = REPLACE(REPLACE(REPLACE(name, 'FYBCOM', 'FYBMS'), 'SYBCOM', 'SYBMS'), 'TYBCOM', 'TYBMS')
      WHERE department_id = v_bms_id
        AND name IN ('FYBCOM', 'SYBCOM', 'TYBCOM');
  END IF;

  -- BFM
  IF v_bfm_id IS NOT NULL THEN
    UPDATE public.classes
      SET name = REPLACE(REPLACE(REPLACE(name, 'FYBCOM', 'FYBFM'), 'SYBCOM', 'SYBFM'), 'TYBCOM', 'TYBFM')
      WHERE department_id = v_bfm_id
        AND name IN ('FYBCOM', 'SYBCOM', 'TYBCOM');
  END IF;

  -- ── Fix profiles.class_name using department text field ───────────────────
  -- profiles.department is a free-text snapshot taken at signup; match on it.

  UPDATE public.profiles
    SET class_name = REPLACE(REPLACE(REPLACE(class_name, 'FYBCOM', 'FYBAF'), 'SYBCOM', 'SYBAF'), 'TYBCOM', 'TYBAF')
    WHERE class_name IN ('FYBCOM', 'SYBCOM', 'TYBCOM')
      AND department ILIKE '%Accounting%Finance%';

  UPDATE public.profiles
    SET class_name = REPLACE(REPLACE(REPLACE(class_name, 'FYBCOM', 'FYBMS'), 'SYBCOM', 'SYBMS'), 'TYBCOM', 'TYBMS')
    WHERE class_name IN ('FYBCOM', 'SYBCOM', 'TYBCOM')
      AND department ILIKE '%Management Studies%';

  UPDATE public.profiles
    SET class_name = REPLACE(REPLACE(REPLACE(class_name, 'FYBCOM', 'FYBFM'), 'SYBCOM', 'SYBFM'), 'TYBCOM', 'TYBFM')
    WHERE class_name IN ('FYBCOM', 'SYBCOM', 'TYBCOM')
      AND department ILIKE '%Financial Markets%';

  RAISE NOTICE 'fix_class_names: class names and profile class_names corrected successfully.';
END;
$$;
