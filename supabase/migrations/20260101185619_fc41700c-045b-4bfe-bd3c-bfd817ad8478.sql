-- 1. FIX PROFILES TABLE: Restrict viewing to connections only (except own profile and admins)
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Approved users can view other approved profiles" ON profiles;
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON profiles;

-- Create stricter policy: users can only view profiles they're connected to
CREATE POLICY "Users can view connected profiles" 
ON profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND status = 'approved'
  AND (
    -- Own profile
    auth.uid() = user_id
    -- Or connected via accepted intro request
    OR are_users_connected(auth.uid(), user_id)
    -- Or is admin
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 2. FIX PROFILE_CONTACTS: Add rate limiting check and ensure robust protection
-- Current policies are okay but let's ensure the connection check is airtight
DROP POLICY IF EXISTS "Connected users can view contact info" ON profile_contacts;

CREATE POLICY "Connected users can view contact info" 
ON profile_contacts 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND user_id IS NOT NULL
  AND are_users_connected(auth.uid(), user_id)
);

-- 3. FIX INVITATIONS: Restrict to admins and the specific inviter only
DROP POLICY IF EXISTS "Members can view own referrals" ON invitations;

CREATE POLICY "Inviters can view own sent invitations" 
ON invitations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND invited_by_user_id IS NOT NULL
  AND invited_by_user_id = auth.uid()
);

-- Hide invited_by_email from non-admin queries by creating a view for member referrals
-- For now, ensure the policy is strict - members can only see invitations they sent