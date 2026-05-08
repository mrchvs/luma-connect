-- Track explicit cohort membership per cycle
CREATE TABLE IF NOT EXISTS public.accountability_cycle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.accountability_cycles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'joined')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cycle_id, email)
);

ALTER TABLE public.accountability_cycle_members ENABLE ROW LEVEL SECURITY;

-- Admins can manage cohort members
CREATE POLICY "Admins can manage cycle members"
  ON public.accountability_cycle_members FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Remove unique constraint on accountability_cycles so admins can create any cycle
-- (the existing UNIQUE(month, year) stays — one cycle per month, created by admin)
-- Allow admins to insert cycles
CREATE POLICY "Admins can create cycles"
  ON public.accountability_cycles FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = created_by);
