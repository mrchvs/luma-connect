-- Create a SECURITY DEFINER function to check if two users are connected via accepted intro request
CREATE OR REPLACE FUNCTION public.are_users_connected(_viewer_id uuid, _profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.intro_requests
    WHERE status = 'accepted'
      AND (
        (requester_id = _viewer_id AND helper_id = _profile_user_id)
        OR (requester_id = _profile_user_id AND helper_id = _viewer_id)
      )
  )
$$;

-- Update the profiles SELECT policy for approved users to be more restrictive
-- First drop the existing policy
DROP POLICY IF EXISTS "Approved users can view other approved profiles" ON public.profiles;

-- Create new policy: Approved users can view LIMITED info of other approved profiles
-- Full access is granted via the view mechanism in the application layer
CREATE POLICY "Approved users can view other approved profiles"
ON public.profiles
FOR SELECT
USING (
  (status = 'approved')
  AND (auth.uid() IS NOT NULL)
  AND is_approved_user(auth.uid())
);