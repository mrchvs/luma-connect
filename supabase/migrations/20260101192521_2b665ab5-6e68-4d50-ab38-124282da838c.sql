-- Drop the problematic RLS policy that uses INSERT inside a SELECT context
DROP POLICY IF EXISTS "Approved users can browse approved profiles with rate limit" ON public.profiles;

-- Create a simpler policy without the rate limiting function (rate limiting should be done at the application level)
CREATE POLICY "Approved users can browse approved profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND is_approved_user(auth.uid()) 
  AND status = 'approved'::profile_status
);