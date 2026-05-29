-- Allow users to insert themselves as 'joined' when using an invite link
CREATE POLICY cycle_members_invite_join ON accountability_cycle_members
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND status = 'joined'
  );
