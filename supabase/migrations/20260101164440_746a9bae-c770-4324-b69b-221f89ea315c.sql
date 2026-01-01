-- Create a trigger function to prevent users from having both admin and owner roles
CREATE OR REPLACE FUNCTION public.prevent_duplicate_elevated_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If inserting 'admin' role, check if user already has 'owner' role
  IF NEW.role = 'admin' THEN
    IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.user_id AND role = 'owner') THEN
      RAISE EXCEPTION 'User already has owner role, cannot add admin role';
    END IF;
  END IF;
  
  -- If inserting 'owner' role, check if user already has 'admin' role and remove it
  IF NEW.role = 'owner' THEN
    DELETE FROM user_roles WHERE user_id = NEW.user_id AND role = 'admin';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run before insert on user_roles
DROP TRIGGER IF EXISTS check_elevated_roles ON user_roles;
CREATE TRIGGER check_elevated_roles
  BEFORE INSERT ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_elevated_roles();