-- Allow authenticated users to submit a pending application to a cohort.
-- Users can only insert a row for themselves with status = 'pending'.
CREATE POLICY "Users can apply to cohorts"
  ON public.accountability_cycle_members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- Allow users to delete their own pending application (cancel application).
-- Only rows they own AND only while still pending.
CREATE POLICY "Users can cancel their own pending application"
  ON public.accountability_cycle_members FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );
