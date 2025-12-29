-- Prevent all profile deletions - profiles should be archived via status change, not deleted
CREATE POLICY "Profiles cannot be deleted"
ON public.profiles
FOR DELETE
USING (false);