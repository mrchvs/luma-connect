-- Strengthen the are_users_connected function to prevent contact info exposure vulnerabilities
-- This adds null checks and prevents self-connection bypass attempts

CREATE OR REPLACE FUNCTION public.are_users_connected(_viewer_id uuid, _profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Return false if either parameter is null to prevent null-related bypass attacks
  -- Return false if viewer is checking connection to themselves (handled by separate "own data" policies)
  -- Only return true if there's an accepted intro_request between the two users
  SELECT CASE 
    WHEN _viewer_id IS NULL OR _profile_user_id IS NULL THEN false
    WHEN _viewer_id = _profile_user_id THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.intro_requests
      WHERE status = 'accepted'
        AND (
          (requester_id = _viewer_id AND helper_id = _profile_user_id)
          OR (requester_id = _profile_user_id AND helper_id = _viewer_id)
        )
    )
  END
$$;