-- Drop the current permissive INSERT policy that allows anyone
DROP POLICY IF EXISTS "Only service role can insert notifications" ON public.notifications;

-- Create a restrictive policy that denies all INSERT operations at the user level
-- Service role bypasses RLS entirely, so edge functions will still work
CREATE POLICY "No direct user inserts allowed"
ON public.notifications
FOR INSERT
WITH CHECK (false);