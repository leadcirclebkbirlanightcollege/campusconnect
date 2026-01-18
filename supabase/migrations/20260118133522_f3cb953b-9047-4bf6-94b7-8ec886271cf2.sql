-- Fix notification_recipients RLS policy to be more restrictive
DROP POLICY IF EXISTS "System can insert notification receipts" ON public.notification_recipients;

CREATE POLICY "Admins and system can insert notification receipts"
  ON public.notification_recipients FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR user_id = auth.uid());

-- Recreate update_updated_at_column function with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;