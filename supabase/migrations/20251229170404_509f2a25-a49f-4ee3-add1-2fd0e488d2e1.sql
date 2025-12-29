-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create a restrictive policy that only allows service role to insert
CREATE POLICY "Only service role can insert notifications"
ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (true);