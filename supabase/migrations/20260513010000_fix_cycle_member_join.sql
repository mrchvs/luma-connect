-- Fix 1: "Members can mark themselves joined" USING clause checked user_id = auth.uid()
-- but user_id is NULL for freshly-invited members, so the update was always rejected.
-- Now allow the update when the row's email matches the calling user's email too.
DROP POLICY IF EXISTS "Members can mark themselves joined" ON public.accountability_cycle_members;
CREATE POLICY "Members can mark themselves joined"
  ON public.accountability_cycle_members FOR UPDATE
  USING (
    auth.uid() = user_id
    OR lower(auth.email()) = lower(email)
  )
  WITH CHECK (
    status = 'joined'
    AND user_id = auth.uid()
  );

-- Fix 2: Backfill user_id for any existing invited rows whose email matches an
-- auth user that already exists.  Runs once at migration time and leaves the
-- trigger to handle future signups.
UPDATE public.accountability_cycle_members acm
SET
  user_id = au.id,
  status  = 'joined'
FROM auth.users au
WHERE lower(acm.email) = lower(au.email)
  AND acm.user_id IS NULL;
