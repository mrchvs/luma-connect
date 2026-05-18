-- The "Admins can manage cycle members" policy only covered 'admin' role,
-- but the owner role also needs full access. Owners have admin privileges
-- in the app (see auth-context.tsx) so the DB policy must match.
DROP POLICY IF EXISTS "Admins can manage cycle members" ON public.accountability_cycle_members;

CREATE POLICY "Admins can manage cycle members"
  ON public.accountability_cycle_members FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
  );
