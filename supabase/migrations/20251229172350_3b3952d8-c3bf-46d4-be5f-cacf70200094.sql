-- Add explicit denial policies for tags table to make security posture clear
CREATE POLICY "Tags cannot be inserted by users" ON tags
FOR INSERT WITH CHECK (false);

CREATE POLICY "Tags cannot be updated by users" ON tags
FOR UPDATE USING (false);

CREATE POLICY "Tags cannot be deleted by users" ON tags
FOR DELETE USING (false);