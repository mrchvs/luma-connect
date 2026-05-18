-- Allow any authenticated user to see which users have admin/owner roles.
-- This is needed so regular users can send notifications to admins
-- (e.g. when applying to join a cohort).
-- It deliberately does NOT expose other role types.
CREATE POLICY "Authenticated users can read admin roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (role IN ('admin', 'owner'));
