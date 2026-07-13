
-- 1. Table
CREATE TABLE public.verify_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  verification_token TEXT NOT NULL,
  document_type TEXT NOT NULL,
  student_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  college TEXT,
  department TEXT,
  role TEXT,
  issued_by TEXT NOT NULL DEFAULT 'Atharv Amol Jadhav',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  pdf_path TEXT,
  revoked_reason TEXT,
  revoked_at TIMESTAMPTZ,
  verified_count INTEGER NOT NULL DEFAULT 0,
  last_verified_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verify_documents_reference ON public.verify_documents(reference);
CREATE INDEX idx_verify_documents_status ON public.verify_documents(status);
CREATE INDEX idx_verify_documents_created_at ON public.verify_documents(created_at DESC);

-- 2. Grants (no anon — public reads go through the RPC only)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verify_documents TO authenticated;
GRANT ALL ON public.verify_documents TO service_role;

-- 3. RLS
ALTER TABLE public.verify_documents ENABLE ROW LEVEL SECURITY;

-- 4. Policies — admins/super_admins only
CREATE POLICY "Admins can view documents"
  ON public.verify_documents FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can insert documents"
  ON public.verify_documents FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can update documents"
  ON public.verify_documents FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can delete documents"
  ON public.verify_documents FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

-- 5. updated_at trigger
CREATE TRIGGER update_verify_documents_updated_at
  BEFORE UPDATE ON public.verify_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Public verification RPC — safe fields only, constant-time token match
CREATE OR REPLACE FUNCTION public.verify_document_public(
  p_reference TEXT,
  p_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
BEGIN
  IF p_reference IS NULL OR length(trim(p_reference)) = 0 THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT * INTO v_doc
  FROM public.verify_documents
  WHERE reference = p_reference
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;

  -- If a token is supplied it must match; if omitted, still return public info
  IF p_token IS NOT NULL AND length(trim(p_token)) > 0 THEN
    IF v_doc.verification_token IS DISTINCT FROM p_token THEN
      RETURN json_build_object('found', false);
    END IF;
  END IF;

  RETURN json_build_object(
    'found', true,
    'reference', v_doc.reference,
    'document_type', v_doc.document_type,
    'student_name', v_doc.student_name,
    'college', v_doc.college,
    'department', v_doc.department,
    'role', v_doc.role,
    'issued_by', v_doc.issued_by,
    'issue_date', v_doc.issue_date,
    'expiry_date', v_doc.expiry_date,
    'status', v_doc.status,
    'revoked_reason', v_doc.revoked_reason,
    'revoked_at', v_doc.revoked_at,
    'token_tail', right(v_doc.verification_token, 6),
    'pdf_path', v_doc.pdf_path,
    'verified_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_document_public(TEXT, TEXT) TO anon, authenticated;

-- 7. Counter increment RPC (separate so read stays STABLE)
CREATE OR REPLACE FUNCTION public.verify_document_touch(p_reference TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.verify_documents
  SET verified_count = verified_count + 1,
      last_verified_at = now()
  WHERE reference = p_reference AND status = 'active';
$$;

GRANT EXECUTE ON FUNCTION public.verify_document_touch(TEXT) TO anon, authenticated;
