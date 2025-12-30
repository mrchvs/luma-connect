-- Create security_settings table for configurable lockout settings
CREATE TABLE public.security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view and update security settings
CREATE POLICY "Admins can view security settings"
ON public.security_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update security settings"
ON public.security_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- No direct inserts or deletes allowed
CREATE POLICY "No user inserts for security settings"
ON public.security_settings FOR INSERT
WITH CHECK (false);

CREATE POLICY "Security settings cannot be deleted"
ON public.security_settings FOR DELETE
USING (false);

-- Insert default lockout settings
INSERT INTO public.security_settings (setting_key, setting_value, description)
VALUES 
  ('lockout_duration_minutes', '15'::jsonb, 'Duration in minutes that an account remains locked after max failed attempts'),
  ('max_login_attempts', '5'::jsonb, 'Maximum number of failed login attempts before account lockout');

-- Create admin_audit_logs table for tracking admin actions
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  admin_email text NOT NULL,
  action_type text NOT NULL,
  target_identifier text,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert audit logs (via edge functions)
CREATE POLICY "Service role can insert audit logs"
ON public.admin_audit_logs FOR INSERT
WITH CHECK (true);

-- Audit logs cannot be updated or deleted
CREATE POLICY "Audit logs cannot be updated"
ON public.admin_audit_logs FOR UPDATE
USING (false);

CREATE POLICY "Audit logs cannot be deleted"
ON public.admin_audit_logs FOR DELETE
USING (false);

-- Create function to get security setting value
CREATE OR REPLACE FUNCTION public.get_security_setting(p_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT setting_value FROM public.security_settings WHERE setting_key = p_key
$$;

-- Update check_lockout function to use configurable settings
CREATE OR REPLACE FUNCTION public.check_lockout(p_email text)
RETURNS TABLE(is_locked boolean, locked_until timestamp with time zone, attempts_remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_record login_attempts%ROWTYPE;
  v_max_attempts integer;
  v_lockout_minutes integer;
  v_lockout_duration interval;
BEGIN
  -- Get configurable settings
  SELECT COALESCE((get_security_setting('max_login_attempts'))::integer, 5) INTO v_max_attempts;
  SELECT COALESCE((get_security_setting('lockout_duration_minutes'))::integer, 15) INTO v_lockout_minutes;
  v_lockout_duration := (v_lockout_minutes || ' minutes')::interval;
  
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
$function$;

-- Update record_failed_attempt function to use configurable settings
CREATE OR REPLACE FUNCTION public.record_failed_attempt(p_email text)
RETURNS TABLE(is_locked boolean, locked_until timestamp with time zone, attempts_remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_max_attempts integer;
  v_lockout_minutes integer;
  v_lockout_duration interval;
  v_record login_attempts%ROWTYPE;
BEGIN
  -- Get configurable settings
  SELECT COALESCE((get_security_setting('max_login_attempts'))::integer, 5) INTO v_max_attempts;
  SELECT COALESCE((get_security_setting('lockout_duration_minutes'))::integer, 15) INTO v_lockout_minutes;
  v_lockout_duration := (v_lockout_minutes || ' minutes')::interval;
  
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
$function$;

-- Add trigger for updated_at on security_settings
CREATE TRIGGER update_security_settings_updated_at
BEFORE UPDATE ON public.security_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();