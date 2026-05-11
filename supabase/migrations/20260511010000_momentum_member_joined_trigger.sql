-- When a new user signs up, link them to any pending cohort invitations
CREATE OR REPLACE FUNCTION public.handle_momentum_member_joined()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.accountability_cycle_members
  SET user_id = NEW.id, status = 'joined'
  WHERE LOWER(email) = LOWER(NEW.email) AND status = 'invited';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_momentum ON auth.users;
CREATE TRIGGER on_auth_user_created_momentum
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_momentum_member_joined();

-- Allow members to mark themselves as joined (when they visit /accountability)
DROP POLICY IF EXISTS "Members can mark themselves joined" ON public.accountability_cycle_members;
CREATE POLICY "Members can mark themselves joined"
  ON public.accountability_cycle_members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (status = 'joined');

-- Allow members to read their own cycle membership
DROP POLICY IF EXISTS "Members can read own cycle membership" ON public.accountability_cycle_members;
CREATE POLICY "Members can read own cycle membership"
  ON public.accountability_cycle_members FOR SELECT
  USING (auth.uid() = user_id);
