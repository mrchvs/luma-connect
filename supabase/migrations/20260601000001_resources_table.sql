CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Getting started',
  duration TEXT,
  loom_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read resources
CREATE POLICY "Authenticated users can read resources"
  ON public.resources FOR SELECT
  TO authenticated
  USING (true);

-- Only admins/owners can manage resources
CREATE POLICY "Admins can manage resources"
  ON public.resources FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
  );

CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed existing hardcoded videos
INSERT INTO public.resources (title, description, category, duration, loom_id, is_featured, sort_order) VALUES
  ('How to use the platform', 'A guided tour of Monday Momentum, Asks and Members — everything you need to find your way around.', 'Getting started', '5 min', '44ba54c3cde446c9bd88b535e5893e7e', true, 1),
  ('How to set your goal for the month', 'The goal pyramid, and how to turn a big ambition into one clear monthly goal before your first Monday.', 'Monday Momentum', '4 min', 'b7f4be02537740488fafab6411889e82', true, 2);
