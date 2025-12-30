-- Create table to track login attempts
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 1,
  first_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  locked_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create unique index on email for fast lookups
CREATE UNIQUE INDEX idx_login_attempts_email ON public.login_attempts(email);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage login attempts (edge functions)
CREATE POLICY "Service role can manage login attempts"
ON public.login_attempts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- No direct user access
CREATE POLICY "No direct user access to login attempts"
ON public.login_attempts
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- Function to check if email is locked out
CREATE OR REPLACE FUNCTION public.check_lockout(p_email text)
RETURNS TABLE(is_locked boolean, locked_until timestamp with time zone, attempts_remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record login_attempts%ROWTYPE;
  v_max_attempts constant integer := 5;
  v_lockout_duration constant interval := interval '15 minutes';
BEGIN
  SELECT * INTO v_record FROM login_attempts WHERE email = lower(p_email);
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, null::timestamp with time zone, v_max_attempts;
    RETURN;
  END IF;
  
  -- Check if lockout has expired
  IF v_record.locked_until IS NOT NULL AND v_record.locked_until > now() THEN
    RETURN QUERY SELECT true, v_record.locked_until, 0;
    RETURN;
  END IF;
  
  -- Reset if lockout expired or first attempt was more than lockout duration ago
  IF v_record.locked_until IS NOT NULL AND v_record.locked_until <= now() THEN
    DELETE FROM login_attempts WHERE email = lower(p_email);
    RETURN QUERY SELECT false, null::timestamp with time zone, v_max_attempts;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT false, null::timestamp with time zone, v_max_attempts - v_record.attempt_count;
END;
$$;

-- Function to record a failed login attempt
CREATE OR REPLACE FUNCTION public.record_failed_attempt(p_email text)
RETURNS TABLE(is_locked boolean, locked_until timestamp with time zone, attempts_remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_attempts constant integer := 5;
  v_lockout_duration constant interval := interval '15 minutes';
  v_record login_attempts%ROWTYPE;
BEGIN
  -- Insert or update attempt
  INSERT INTO login_attempts (email, attempt_count, first_attempt_at)
  VALUES (lower(p_email), 1, now())
  ON CONFLICT (email) DO UPDATE SET
    attempt_count = login_attempts.attempt_count + 1,
    updated_at = now()
  RETURNING * INTO v_record;
  
  -- Check if we need to lock
  IF v_record.attempt_count >= v_max_attempts THEN
    UPDATE login_attempts 
    SET locked_until = now() + v_lockout_duration, updated_at = now()
    WHERE email = lower(p_email)
    RETURNING * INTO v_record;
    
    RETURN QUERY SELECT true, v_record.locked_until, 0;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT false, null::timestamp with time zone, v_max_attempts - v_record.attempt_count;
END;
$$;

-- Function to clear login attempts on successful login
CREATE OR REPLACE FUNCTION public.clear_login_attempts(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM login_attempts WHERE email = lower(p_email);
END;
$$;

-- Create updated_at trigger
CREATE TRIGGER update_login_attempts_updated_at
BEFORE UPDATE ON public.login_attempts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();