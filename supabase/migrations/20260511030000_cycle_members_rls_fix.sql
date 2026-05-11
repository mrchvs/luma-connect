-- Members need to read their own cycle membership row
CREATE POLICY "Members can read own cycle membership"
  ON public.accountability_cycle_members FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR lower(auth.email()) = lower(email)
  );
