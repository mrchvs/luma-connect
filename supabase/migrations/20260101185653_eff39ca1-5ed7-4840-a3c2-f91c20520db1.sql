-- The previous migration was too restrictive for the Members directory
-- We need approved users to see other approved profiles for discovery
-- But sensitive data (contact info) stays protected via profile_contacts table

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Users can view connected profiles" ON profiles;

-- Restore ability for approved users to view approved profiles (needed for member directory & matching)
-- The profiles table itself only contains public-facing data (name, bio, location)
-- Sensitive contact info is in the separate profile_contacts table which IS connection-restricted
CREATE POLICY "Approved users can browse approved profiles" 
ON profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL
  AND is_approved_user(auth.uid())
  AND status = 'approved'
);

-- Users can always view their own profile regardless of status
CREATE POLICY "Users can view own profile regardless of status" 
ON profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Ensure unauthenticated users cannot access ANY profile data
-- This is implicit since all policies require auth.uid() IS NOT NULL, but let's be explicit
-- No additional policy needed - absence of permissive policy for anonymous = denied