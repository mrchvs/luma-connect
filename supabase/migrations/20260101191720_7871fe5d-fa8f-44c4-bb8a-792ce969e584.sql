-- Create table to track profile access for rate limiting
CREATE TABLE public.profile_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  accessed_at timestamp with time zone NOT NULL DEFAULT now(),
  access_count integer NOT NULL DEFAULT 1
);

-- Create index for efficient lookups
CREATE INDEX idx_profile_access_logs_user_time ON public.profile_access_logs (user_id, accessed_at DESC);

-- Enable RLS
ALTER TABLE public.profile_access_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can manage access logs (prevents tampering)
CREATE POLICY "No direct user access to access logs"
ON public.profile_access_logs
FOR ALL
USING (false)
WITH CHECK (false);

-- Create rate limiting function
CREATE OR REPLACE FUNCTION public.check_profile_rate_limit(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_max_requests integer := 100; -- Max 100 profile views per hour
  v_window interval := '1 hour'::interval;
BEGIN
  -- Count recent access
  SELECT COUNT(*) INTO v_count
  FROM profile_access_logs
  WHERE user_id = _user_id
    AND accessed_at > (now() - v_window);
  
  -- If under limit, log this access and return true
  IF v_count < v_max_requests THEN
    INSERT INTO profile_access_logs (user_id, accessed_at)
    VALUES (_user_id, now());
    RETURN true;
  END IF;
  
  -- Over limit
  RETURN false;
END;
$$;

-- Create function to clean old access logs (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_access_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM profile_access_logs
  WHERE accessed_at < (now() - '24 hours'::interval);
END;
$$;

-- Enhanced are_users_connected function with additional security checks
CREATE OR REPLACE FUNCTION public.are_users_connected(_viewer_id uuid, _profile_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_connected boolean;
BEGIN
  -- SECURITY CHECK 1: Null parameter validation
  IF _viewer_id IS NULL OR _profile_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- SECURITY CHECK 2: Self-connection bypass prevention
  IF _viewer_id = _profile_user_id THEN
    RETURN false;
  END IF;
  
  -- SECURITY CHECK 3: Verify viewer is a real authenticated user with approved status
  -- This prevents fake/manipulated user IDs from being used
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = _viewer_id 
      AND status = 'approved'
  ) THEN
    RETURN false;
  END IF;
  
  -- SECURITY CHECK 4: Verify target profile exists and is approved
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = _profile_user_id 
      AND status = 'approved'
  ) THEN
    RETURN false;
  END IF;
  
  -- SECURITY CHECK 5: Only return true for genuinely accepted intro requests
  -- Must have BOTH requester and helper as real users with an accepted request
  SELECT EXISTS (
    SELECT 1
    FROM intro_requests ir
    WHERE ir.status = 'accepted'
      AND (
        (ir.requester_id = _viewer_id AND ir.helper_id = _profile_user_id)
        OR (ir.requester_id = _profile_user_id AND ir.helper_id = _viewer_id)
      )
      -- Additional check: ensure the intro request was created after both profiles existed
      AND ir.created_at IS NOT NULL
      AND ir.updated_at IS NOT NULL
  ) INTO v_is_connected;
  
  RETURN v_is_connected;
END;
$$;

-- Update profiles RLS policy to include rate limiting for browsing
DROP POLICY IF EXISTS "Approved users can browse approved profiles" ON public.profiles;

CREATE POLICY "Approved users can browse approved profiles with rate limit"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_approved_user(auth.uid()) 
  AND status = 'approved'
  AND check_profile_rate_limit(auth.uid())
);