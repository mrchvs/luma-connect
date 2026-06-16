-- Landing-page applicant capture (Monday Momentum "Apply to join" hero form).
-- Lightweight lead table; writes happen via the capture-applicant edge function
-- using the service role, so no public INSERT policy is exposed here.

CREATE TABLE IF NOT EXISTS public.applicants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  source     TEXT NOT NULL DEFAULT 'landing_hero',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;

-- Admins (and owners, via has_role) can read captured applicants.
CREATE POLICY "Admins can view applicants"
ON public.applicants
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
