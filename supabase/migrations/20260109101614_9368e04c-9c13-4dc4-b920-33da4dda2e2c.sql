-- Remove the policy that allows connected users to see contact info
-- Only admins and the owner should see email/phone
DROP POLICY IF EXISTS "Connected users can view contact info" ON public.profile_contacts;