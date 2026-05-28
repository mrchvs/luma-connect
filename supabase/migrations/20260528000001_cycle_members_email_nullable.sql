-- Make email nullable in accountability_cycle_members.
-- Platform members added directly by admin don't need an email stored here
-- since user_id is sufficient for all lookups. Email is only required for
-- invited (non-platform) members.
ALTER TABLE accountability_cycle_members
  ALTER COLUMN email DROP NOT NULL;

-- Security-definer function so admins can resolve user emails from auth.users.
-- Used by the admin "Add participants" flow to look up emails of existing members.
CREATE OR REPLACE FUNCTION public.admin_get_user_emails(_user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  SELECT id AS user_id, email
  FROM auth.users
  WHERE id = ANY(_user_ids);
$$;

-- Allow authenticated users to call the function;
-- the admin check is enforced in the calling code (admin panel).
GRANT EXECUTE ON FUNCTION public.admin_get_user_emails(uuid[]) TO authenticated;
