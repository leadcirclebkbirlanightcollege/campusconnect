
-- Create platform_settings table for global app mode control
CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID NULL
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can modify settings
CREATE POLICY "Admins can manage platform settings"
  ON public.platform_settings
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- All authenticated users can READ settings (needed for route guard)
CREATE POLICY "Authenticated users can read platform settings"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert the default platform_mode setting
INSERT INTO public.platform_settings (key, value)
VALUES (
  'platform_mode',
  '{"mode": "normal", "custom_headline": null, "custom_subtext": null, "custom_suspense": null, "estimated_return": null}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
