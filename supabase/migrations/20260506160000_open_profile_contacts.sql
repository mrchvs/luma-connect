-- Allow all approved members to view contact info (profiles are open in this community)
DROP POLICY IF EXISTS "Connected users can view contact info" ON public.profile_contacts;

CREATE POLICY "Approved members can view contact info"
ON public.profile_contacts
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND is_approved_user(auth.uid())
);
