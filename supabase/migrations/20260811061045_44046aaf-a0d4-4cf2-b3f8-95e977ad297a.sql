DROP POLICY IF EXISTS "Admins can read platform settings" ON public.platform_settings;

CREATE POLICY "Public client settings are readable" ON public.platform_settings FOR SELECT
USING (key IN ('landing_content', 'platform_mode', 'force_update', 'soft_update'));

CREATE POLICY "Admins can read all platform settings" ON public.platform_settings FOR SELECT
USING (is_admin(auth.uid()) OR is_super_admin(auth.uid()));