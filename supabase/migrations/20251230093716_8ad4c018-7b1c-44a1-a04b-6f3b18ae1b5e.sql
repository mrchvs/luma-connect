-- Drop the existing helper update policy
DROP POLICY IF EXISTS "Helpers can update request status" ON public.intro_requests;

-- Create a more restrictive policy that only allows helpers to update status
-- This prevents helpers from modifying message, expected_outcome, or other fields
CREATE POLICY "Helpers can only update status"
ON public.intro_requests
FOR UPDATE
USING (auth.uid() = helper_id)
WITH CHECK (
  auth.uid() = helper_id
  -- The helper can only be the original helper_id (cannot change it)
);

-- Create a trigger function to prevent helpers from changing restricted columns
CREATE OR REPLACE FUNCTION public.validate_intro_request_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the updater is the helper (not the requester), only allow status changes
  IF OLD.helper_id = auth.uid() AND OLD.requester_id != auth.uid() THEN
    -- Ensure only status is being changed
    IF NEW.message IS DISTINCT FROM OLD.message THEN
      RAISE EXCEPTION 'Helpers cannot modify the message field';
    END IF;
    IF NEW.expected_outcome IS DISTINCT FROM OLD.expected_outcome THEN
      RAISE EXCEPTION 'Helpers cannot modify the expected_outcome field';
    END IF;
    IF NEW.requester_id IS DISTINCT FROM OLD.requester_id THEN
      RAISE EXCEPTION 'Helpers cannot modify the requester_id field';
    END IF;
    IF NEW.helper_id IS DISTINCT FROM OLD.helper_id THEN
      RAISE EXCEPTION 'Helpers cannot modify the helper_id field';
    END IF;
    IF NEW.matching_tags IS DISTINCT FROM OLD.matching_tags THEN
      RAISE EXCEPTION 'Helpers cannot modify the matching_tags field';
    END IF;
    IF NEW.format IS DISTINCT FROM OLD.format THEN
      RAISE EXCEPTION 'Helpers cannot modify the format field';
    END IF;
  END IF;
  
  -- Update the updated_at timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS validate_intro_request_update_trigger ON public.intro_requests;
CREATE TRIGGER validate_intro_request_update_trigger
BEFORE UPDATE ON public.intro_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_intro_request_update();