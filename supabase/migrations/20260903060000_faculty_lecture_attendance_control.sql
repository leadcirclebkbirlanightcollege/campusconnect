-- Migration: 20260903060000_faculty_lecture_attendance_control.sql
-- Description: Enable Faculty Lecture Management and Attendance Control (Delete, Start/Generate QR, End Attendance)
-- 1. Tighten and expand RLS policies on attendance_tokens and lectures to allow authorized faculty
-- 2. Create public.faculty_delete_lecture(uuid)
-- 3. Create public.faculty_generate_attendance(uuid)
-- 4. Create public.faculty_end_attendance(uuid)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. LECTURES RLS: Ensure authorized faculty can delete their own lectures
DROP POLICY IF EXISTS "Admins and faculty can delete lectures" ON public.lectures;

CREATE POLICY "Admins and faculty can delete lectures"
ON public.lectures
FOR DELETE
USING (
  is_super_admin(auth.uid())
  OR (is_admin(auth.uid()) AND (college_id = get_my_college_id() OR college_id IS NULL))
  OR (
    is_faculty(auth.uid())
    AND created_by = auth.uid()
    AND (college_id = get_my_college_id() OR college_id IS NULL)
  )
);

-- 2. ATTENDANCE_TOKENS RLS: Allow faculty to view, insert, update, and delete tokens for their own lectures
DROP POLICY IF EXISTS "Only admins can view tokens" ON public.attendance_tokens;
DROP POLICY IF EXISTS "Admins and faculty can view tokens" ON public.attendance_tokens;

CREATE POLICY "Admins and faculty can view tokens"
ON public.attendance_tokens
FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lectures l
    WHERE l.id = attendance_tokens.lecture_id
      AND l.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Only admins can create tokens" ON public.attendance_tokens;
DROP POLICY IF EXISTS "Admins and faculty can create tokens" ON public.attendance_tokens;

CREATE POLICY "Admins and faculty can create tokens"
ON public.attendance_tokens
FOR INSERT
WITH CHECK (
  is_super_admin(auth.uid())
  OR is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lectures l
    WHERE l.id = attendance_tokens.lecture_id
      AND l.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Only admins can update tokens" ON public.attendance_tokens;
DROP POLICY IF EXISTS "Admins and faculty can update tokens" ON public.attendance_tokens;

CREATE POLICY "Admins and faculty can update tokens"
ON public.attendance_tokens
FOR UPDATE
USING (
  is_super_admin(auth.uid())
  OR is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lectures l
    WHERE l.id = attendance_tokens.lecture_id
      AND l.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Only admins can delete tokens" ON public.attendance_tokens;
DROP POLICY IF EXISTS "Admins and faculty can delete tokens" ON public.attendance_tokens;

CREATE POLICY "Admins and faculty can delete tokens"
ON public.attendance_tokens
FOR DELETE
USING (
  is_super_admin(auth.uid())
  OR is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lectures l
    WHERE l.id = attendance_tokens.lecture_id
      AND l.created_by = auth.uid()
  )
);

-- 3. Stored Procedure: faculty_delete_lecture
DROP FUNCTION IF EXISTS public.faculty_delete_lecture(uuid);

CREATE OR REPLACE FUNCTION public.faculty_delete_lecture(p_lecture_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_lec record;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  -- Fetch lecture
  SELECT * INTO v_lec FROM public.lectures WHERE id = p_lecture_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lecture_not_found';
  END IF;

  -- Authorization check: super_admin, admin of same college, or faculty who created it
  IF NOT (
    is_super_admin(v_caller)
    OR (is_admin(v_caller) AND (v_lec.college_id = get_my_college_id() OR v_lec.college_id IS NULL))
    OR (
      is_faculty(v_caller)
      AND v_lec.created_by = v_caller
      AND (v_lec.college_id = get_my_college_id() OR v_lec.college_id IS NULL)
    )
  ) THEN
    RAISE EXCEPTION 'permission_denied: not authorized to delete this lecture';
  END IF;

  -- 1. Safely terminate and remove any attendance tokens to invalidate active QR/OTP
  DELETE FROM public.attendance_tokens WHERE lecture_id = p_lecture_id;

  -- 2. Remove programme tags
  DELETE FROM public.lecture_programme_tags WHERE lecture_id = p_lecture_id;

  -- 3. Remove attendance records if any
  DELETE FROM public.attendance WHERE lecture_id = p_lecture_id;

  -- 4. Delete the lecture
  DELETE FROM public.lectures WHERE id = p_lecture_id;

  RETURN json_build_object(
    'ok', true,
    'lecture_id', p_lecture_id,
    'deleted_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.faculty_delete_lecture(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.faculty_delete_lecture(uuid) TO authenticated;

-- 4. Stored Procedure: faculty_generate_attendance (Generate QR & OTP)
DROP FUNCTION IF EXISTS public.faculty_generate_attendance(uuid);

CREATE OR REPLACE FUNCTION public.faculty_generate_attendance(p_lecture_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller uuid;
  v_lec record;
  v_otp text;
  v_token text;
  v_otp_hash text;
  v_expires_at timestamptz;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT * INTO v_lec FROM public.lectures WHERE id = p_lecture_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lecture_not_found';
  END IF;

  -- Authorization check
  IF NOT (
    is_super_admin(v_caller)
    OR (is_admin(v_caller) AND (v_lec.college_id = get_my_college_id() OR v_lec.college_id IS NULL))
    OR (
      is_faculty(v_caller)
      AND v_lec.created_by = v_caller
      AND (v_lec.college_id = get_my_college_id() OR v_lec.college_id IS NULL)
    )
  ) THEN
    RAISE EXCEPTION 'permission_denied: not authorized to manage attendance for this lecture';
  END IF;

  -- Generate 6-digit OTP
  v_otp := lpad(floor(random() * 900000 + 100000)::text, 6, '0');

  -- Generate 32-byte hex token for QR code
  v_token := encode(gen_random_bytes(32), 'hex');

  -- Hash OTP with SHA-256
  v_otp_hash := encode(digest(v_otp, 'sha256'), 'hex');

  -- 10-minute expiry
  v_expires_at := now() + interval '10 minutes';

  -- Upsert attendance token
  INSERT INTO public.attendance_tokens (
    lecture_id,
    token,
    otp_hash,
    expires_at,
    is_active,
    used_count,
    created_by,
    created_at
  ) VALUES (
    p_lecture_id,
    v_token,
    v_otp_hash,
    v_expires_at,
    true,
    0,
    v_caller,
    now()
  )
  ON CONFLICT (lecture_id) DO UPDATE SET
    token = EXCLUDED.token,
    otp_hash = EXCLUDED.otp_hash,
    expires_at = EXCLUDED.expires_at,
    is_active = true,
    used_count = 0,
    created_by = EXCLUDED.created_by;

  -- Set lecture to live status
  UPDATE public.lectures
  SET status = 'live', updated_at = now()
  WHERE id = p_lecture_id;

  RETURN json_build_object(
    'success', true,
    'otp', v_otp,
    'token', v_token,
    'expiresAt', v_expires_at,
    'lectureId', p_lecture_id,
    'message', 'Attendance session active. QR and OTP valid for 10 minutes.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.faculty_generate_attendance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.faculty_generate_attendance(uuid) TO authenticated;

-- 5. Stored Procedure: faculty_end_attendance
DROP FUNCTION IF EXISTS public.faculty_end_attendance(uuid);

CREATE OR REPLACE FUNCTION public.faculty_end_attendance(p_lecture_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_lec record;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT * INTO v_lec FROM public.lectures WHERE id = p_lecture_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lecture_not_found';
  END IF;

  -- Authorization check
  IF NOT (
    is_super_admin(v_caller)
    OR (is_admin(v_caller) AND (v_lec.college_id = get_my_college_id() OR v_lec.college_id IS NULL))
    OR (
      is_faculty(v_caller)
      AND v_lec.created_by = v_caller
      AND (v_lec.college_id = get_my_college_id() OR v_lec.college_id IS NULL)
    )
  ) THEN
    RAISE EXCEPTION 'permission_denied: not authorized to end attendance for this lecture';
  END IF;

  -- Deactivate active token so no further check-ins are possible
  UPDATE public.attendance_tokens
  SET is_active = false, expires_at = now()
  WHERE lecture_id = p_lecture_id;

  -- Set lecture status to ended
  UPDATE public.lectures
  SET status = 'ended', updated_at = now()
  WHERE id = p_lecture_id;

  RETURN json_build_object(
    'success', true,
    'lecture_id', p_lecture_id,
    'message', 'Attendance session finalized successfully.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.faculty_end_attendance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.faculty_end_attendance(uuid) TO authenticated;
