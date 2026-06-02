-- Generic app settings table for simple key-value config
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read settings (needed to show the banner)
CREATE POLICY "Authenticated users can read app settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins/owners can write settings
CREATE POLICY "Admins can manage app settings"
  ON public.app_settings FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
  );

-- Seed the live call setting (off by default)
INSERT INTO public.app_settings (key, value) VALUES ('live_call_url', null)
  ON CONFLICT (key) DO NOTHING;
