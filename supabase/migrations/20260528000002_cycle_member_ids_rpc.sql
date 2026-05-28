-- Security-definer function that returns all member user_ids for a given cycle,
-- bypassing the RLS policy on accountability_cycle_members (which restricts
-- SELECT to own rows). This lets any cohort member see the full cohort list.
CREATE OR REPLACE FUNCTION public.get_cycle_member_ids(_cycle_id uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT user_id
  FROM accountability_cycle_members
  WHERE cycle_id = _cycle_id
    AND status IN ('joined', 'invited')
    AND user_id IS NOT NULL;
$$;

-- Allow any authenticated user to call it;
-- the function only exposes user_ids (not emails or PII).
GRANT EXECUTE ON FUNCTION public.get_cycle_member_ids(uuid) TO authenticated;
