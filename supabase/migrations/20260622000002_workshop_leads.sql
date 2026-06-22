-- Lead capture for the public, ungated workshop video pages.
CREATE TABLE IF NOT EXISTS public.workshop_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_slug TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workshop_leads ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can register to access a workshop video
CREATE POLICY "Anyone can register for a workshop"
  ON public.workshop_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins/owners can read who accessed which workshop
CREATE POLICY "Admins can read workshop leads"
  ON public.workshop_leads FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
  );

CREATE INDEX IF NOT EXISTS workshop_leads_slug_idx ON public.workshop_leads (workshop_slug);
CREATE INDEX IF NOT EXISTS workshop_leads_created_idx ON public.workshop_leads (created_at DESC);
