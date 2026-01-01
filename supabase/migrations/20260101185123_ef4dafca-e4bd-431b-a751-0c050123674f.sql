-- Drop the restrictive delete policy and create one that allows admin deletions
DROP POLICY IF EXISTS "Invitations cannot be deleted" ON invitations;

CREATE POLICY "Admins can delete invitations" 
ON invitations 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also allow service role to delete (for edge function operations)
CREATE POLICY "Service role can delete invitations" 
ON invitations 
FOR DELETE 
USING (auth.uid() IS NULL);