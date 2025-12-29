-- Phase 1: Create security definer function to check approved status without recursion
CREATE OR REPLACE FUNCTION public.is_approved_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND status = 'approved'
  )
$$;

-- Fix the recursive policy on profiles table
DROP POLICY IF EXISTS "Approved users can view other approved profiles" ON profiles;

CREATE POLICY "Approved users can view other approved profiles" ON profiles
FOR SELECT USING (
  status = 'approved' AND auth.uid() IS NOT NULL AND is_approved_user(auth.uid())
);

-- Phase 2: Add authentication requirements to all sensitive tables

-- profile_needs: Update SELECT policy
DROP POLICY IF EXISTS "Approved users can view others needs" ON profile_needs;
CREATE POLICY "Approved users can view others needs" ON profile_needs
FOR SELECT USING (
  auth.uid() IS NOT NULL AND is_approved_user(auth.uid())
);

-- profile_offers: Update SELECT policy  
DROP POLICY IF EXISTS "Approved users can view others offers" ON profile_offers;
CREATE POLICY "Approved users can view others offers" ON profile_offers
FOR SELECT USING (
  auth.uid() IS NOT NULL AND is_approved_user(auth.uid())
);

-- intro_requests: Update SELECT policy
DROP POLICY IF EXISTS "Users can view own requests" ON intro_requests;
CREATE POLICY "Users can view own requests" ON intro_requests
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (auth.uid() = requester_id OR auth.uid() = helper_id)
);

-- notifications: Update SELECT policy
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
FOR SELECT USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- match_notifications: Update SELECT policy
DROP POLICY IF EXISTS "Users can view own match notifications" ON match_notifications;
CREATE POLICY "Users can view own match notifications" ON match_notifications
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (auth.uid() = notified_user_id OR auth.uid() = helper_user_id)
);

-- user_roles: Update SELECT policies
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles" ON user_roles
FOR SELECT USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
CREATE POLICY "Admins can view all roles" ON user_roles
FOR SELECT USING (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin')
);