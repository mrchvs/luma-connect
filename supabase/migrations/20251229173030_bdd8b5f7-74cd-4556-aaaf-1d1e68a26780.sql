-- Allow admins to view all intro requests for moderation
CREATE POLICY "Admins can view all intro requests"
ON public.intro_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));