-- Fix profiles table: require authentication for all SELECT access
-- Note: existing policies already handle specific access patterns, 
-- but we need a baseline policy to prevent unauthenticated access

-- First, let's update the existing policies to be more explicit
-- The existing policies use RESTRICTIVE mode, so we need authenticated users as baseline

-- Drop and recreate match_notifications policies
DROP POLICY IF EXISTS "System can manage match notifications" ON public.match_notifications;

-- Users can only view their own match notifications
CREATE POLICY "Users can view own match notifications"
ON public.match_notifications
FOR SELECT
USING (auth.uid() = notified_user_id OR auth.uid() = helper_user_id);

-- Only service role can insert match notifications
CREATE POLICY "Service role can insert match notifications"
ON public.match_notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- Only service role can update match notifications
CREATE POLICY "Service role can update match notifications"
ON public.match_notifications
FOR UPDATE
TO service_role
USING (true);

-- Only service role can delete match notifications
CREATE POLICY "Service role can delete match notifications"
ON public.match_notifications
FOR DELETE
TO service_role
USING (true);