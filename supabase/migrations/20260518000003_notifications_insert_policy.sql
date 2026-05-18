-- Allow authenticated users to insert notifications for any user.
-- This is required for features like cohort applications (user notifying admins)
-- and ask responses (user notifying ask owner).
CREATE POLICY "Authenticated users can send notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
