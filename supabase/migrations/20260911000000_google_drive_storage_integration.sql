-- ==============================================================================
-- CAMPUS CONNECT — GOOGLE DRIVE FILE STORAGE INTEGRATION MIGRATION
-- ==============================================================================
-- 1. Storage files table (centralized file metadata for Google Drive storage)
-- 2. Storage folders table (caching for Google Drive folder hierarchy)
-- 3. Extension of existing public.documents table for Google Drive reference
-- 4. Indexes & Performance Optimization
-- 5. Row-Level Security (RLS) policies
-- 6. Helper RPC functions for access control & validation
-- ==============================================================================

-- ── 1. STORAGE FILES METADATA TABLE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.storage_files (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id            UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
  file_name             TEXT NOT NULL,
  original_file_name    TEXT NOT NULL,
  mime_type             TEXT NOT NULL,
  file_size             BIGINT NOT NULL CHECK (file_size >= 0),
  google_drive_file_id  TEXT NOT NULL,
  google_drive_folder_id TEXT,
  drive_url             TEXT NOT NULL,
  drive_download_link   TEXT,
  entity_type           TEXT NOT NULL CHECK (
    entity_type IN ('document', 'academic', 'event', 'notice', 'certificate', 'assignment', 'submission', 'student_id', 'avatar', 'media', 'general')
  ),
  entity_id             TEXT,
  access_level          TEXT NOT NULL DEFAULT 'private' CHECK (
    access_level IN ('public', 'authenticated', 'private', 'admin')
  ),
  uploaded_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status                TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'archived', 'deleted', 'inaccessible')
  ),
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. STORAGE FOLDERS TABLE (Google Drive Hierarchy Cache) ───────────────────
CREATE TABLE IF NOT EXISTS public.storage_folders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_name           TEXT NOT NULL,
  google_drive_folder_id TEXT NOT NULL,
  parent_folder_id      TEXT,
  category              TEXT NOT NULL,
  college_id            UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_storage_folders_category_college UNIQUE (category, college_id)
);

-- ── 3. EXTEND EXISTING PUBLIC.DOCUMENTS TABLE ─────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'google_drive_file_id'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN google_drive_file_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'storage_file_id'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN storage_file_id UUID REFERENCES public.storage_files(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'storage_provider'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN storage_provider TEXT NOT NULL DEFAULT 'supabase';
  END IF;
END $$;

-- ── 4. INDEXES ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_storage_files_college_id ON public.storage_files(college_id);
CREATE INDEX IF NOT EXISTS idx_storage_files_entity ON public.storage_files(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_storage_files_drive_file_id ON public.storage_files(google_drive_file_id);
CREATE INDEX IF NOT EXISTS idx_storage_files_uploaded_by ON public.storage_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_storage_files_status ON public.storage_files(status);
CREATE INDEX IF NOT EXISTS idx_storage_files_created_at ON public.storage_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_storage_files_access_level ON public.storage_files(access_level);

CREATE INDEX IF NOT EXISTS idx_storage_folders_drive_id ON public.storage_folders(google_drive_folder_id);
CREATE INDEX IF NOT EXISTS idx_storage_folders_college ON public.storage_folders(college_id);

-- ── 5. UPDATED_AT TRIGGER ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_storage_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_storage_files_updated_at ON public.storage_files;
CREATE TRIGGER trigger_storage_files_updated_at
  BEFORE UPDATE ON public.storage_files
  FOR EACH ROW
  EXECUTE FUNCTION public.set_storage_files_updated_at();

-- ── 6. ROW-LEVEL SECURITY (RLS) POLICIES ──────────────────────────────────────
ALTER TABLE public.storage_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_folders ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storage_files TO authenticated;
GRANT SELECT ON public.storage_files TO anon;
GRANT ALL ON public.storage_files TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.storage_folders TO authenticated;
GRANT ALL ON public.storage_folders TO service_role;

-- Storage Files RLS:
-- 1) SELECT Policy
DROP POLICY IF EXISTS "Users can view accessible storage files" ON public.storage_files;
CREATE POLICY "Users can view accessible storage files"
  ON public.storage_files FOR SELECT
  USING (
    status = 'active'
    AND (
      -- Admins and faculty can view all files belonging to their college or unassigned files
      (is_admin(auth.uid()) OR is_faculty(auth.uid()))
      -- Super admins can view everything
      OR is_super_admin(auth.uid())
      -- Public files can be viewed by anyone
      OR access_level = 'public'
      -- Authenticated files can be viewed by active users in the same college
      OR (
        access_level = 'authenticated'
        AND is_active_user(auth.uid())
        AND (college_id IS NULL OR college_id = get_my_college_id())
      )
      -- Uploader can view own file
      OR uploaded_by = auth.uid()
      -- If student submission, allow student if entity matches their submission
      OR (
        entity_type = 'submission'
        AND uploaded_by = auth.uid()
      )
    )
  );

-- 2) INSERT Policy
DROP POLICY IF EXISTS "Authorized users can insert storage files" ON public.storage_files;
CREATE POLICY "Authorized users can insert storage files"
  ON public.storage_files FOR INSERT
  WITH CHECK (
    -- Admin and Faculty can insert files for their college
    (is_admin(auth.uid()) OR is_faculty(auth.uid()))
    -- Super admin can insert files anywhere
    OR is_super_admin(auth.uid())
    -- Active students can insert their own student documents or assignment submissions
    OR (
      is_active_user(auth.uid())
      AND uploaded_by = auth.uid()
      AND entity_type IN ('submission', 'student_id', 'avatar')
    )
  );

-- 3) UPDATE Policy
DROP POLICY IF EXISTS "Authorized users can update storage files" ON public.storage_files;
CREATE POLICY "Authorized users can update storage files"
  ON public.storage_files FOR UPDATE
  USING (
    is_admin(auth.uid())
    OR is_super_admin(auth.uid())
    OR (
      uploaded_by = auth.uid()
      AND entity_type IN ('submission', 'student_id', 'avatar')
    )
  )
  WITH CHECK (
    is_admin(auth.uid())
    OR is_super_admin(auth.uid())
    OR (
      uploaded_by = auth.uid()
      AND entity_type IN ('submission', 'student_id', 'avatar')
    )
  );

-- 4) DELETE Policy
DROP POLICY IF EXISTS "Admins and owners can delete storage files" ON public.storage_files;
CREATE POLICY "Admins and owners can delete storage files"
  ON public.storage_files FOR DELETE
  USING (
    is_admin(auth.uid())
    OR is_super_admin(auth.uid())
    OR (
      uploaded_by = auth.uid()
      AND entity_type IN ('submission', 'avatar')
    )
  );

-- Storage Folders RLS:
DROP POLICY IF EXISTS "Authenticated users can read folders" ON public.storage_folders;
CREATE POLICY "Authenticated users can read folders"
  ON public.storage_folders FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage folders" ON public.storage_folders;
CREATE POLICY "Admins can manage folders"
  ON public.storage_folders FOR ALL
  USING (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) OR is_super_admin(auth.uid()));

-- ── 7. HELPER RPC FUNCTIONS ───────────────────────────────────────────────────

-- Check access to a file
CREATE OR REPLACE FUNCTION public.check_storage_file_access(
  p_file_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_file RECORD;
  v_user_college_id UUID;
  v_is_adm BOOLEAN;
  v_is_fac BOOLEAN;
BEGIN
  SELECT * INTO v_file FROM public.storage_files WHERE id = p_file_id AND status = 'active';
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Public files are always accessible
  IF v_file.access_level = 'public' THEN
    RETURN TRUE;
  END IF;

  -- Require user
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Super admin can access anything
  IF is_super_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Owner can always access
  IF v_file.uploaded_by = p_user_id THEN
    RETURN TRUE;
  END IF;

  v_is_adm := is_admin(p_user_id);
  v_is_fac := is_faculty(p_user_id);

  -- Admins and faculty can access files in their college
  IF v_is_adm OR v_is_fac THEN
    SELECT college_id INTO v_user_college_id FROM public.user_roles WHERE user_id = p_user_id LIMIT 1;
    IF v_file.college_id IS NULL OR v_file.college_id = v_user_college_id THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Authenticated level for active students in same college
  IF v_file.access_level = 'authenticated' AND is_active_user(p_user_id) THEN
    SELECT college_id INTO v_user_college_id FROM public.user_roles WHERE user_id = p_user_id LIMIT 1;
    IF v_file.college_id IS NULL OR v_file.college_id = v_user_college_id THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_storage_file_access(UUID, UUID) TO authenticated, service_role;
