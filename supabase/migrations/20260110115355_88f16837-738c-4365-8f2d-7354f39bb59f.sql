-- Add solutions_count column to profiles to track accepted solutions
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS solutions_count integer NOT NULL DEFAULT 0;

-- Create a function to increment/decrement solutions count
CREATE OR REPLACE FUNCTION public.update_solutions_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_comment_user_id uuid;
  v_new_comment_user_id uuid;
BEGIN
  -- Get the user who wrote the old accepted comment (if any)
  IF OLD.accepted_comment_id IS NOT NULL THEN
    SELECT user_id INTO v_old_comment_user_id
    FROM request_comments
    WHERE id = OLD.accepted_comment_id;
  END IF;
  
  -- Get the user who wrote the new accepted comment (if any)
  IF NEW.accepted_comment_id IS NOT NULL THEN
    SELECT user_id INTO v_new_comment_user_id
    FROM request_comments
    WHERE id = NEW.accepted_comment_id;
  END IF;
  
  -- Decrement old user's count if there was a previous accepted answer
  IF v_old_comment_user_id IS NOT NULL AND v_old_comment_user_id IS DISTINCT FROM v_new_comment_user_id THEN
    UPDATE profiles
    SET solutions_count = GREATEST(0, solutions_count - 1)
    WHERE user_id = v_old_comment_user_id;
  END IF;
  
  -- Increment new user's count if there's a new accepted answer
  IF v_new_comment_user_id IS NOT NULL AND v_new_comment_user_id IS DISTINCT FROM v_old_comment_user_id THEN
    UPDATE profiles
    SET solutions_count = solutions_count + 1
    WHERE user_id = v_new_comment_user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for solutions count
DROP TRIGGER IF EXISTS trigger_update_solutions_count ON requests;
CREATE TRIGGER trigger_update_solutions_count
  AFTER UPDATE OF accepted_comment_id ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_solutions_count();

-- Create function to notify contributor when their answer is accepted
CREATE OR REPLACE FUNCTION public.notify_solution_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment_user_id uuid;
  v_requester_name text;
  v_request_title text;
BEGIN
  -- Only notify when a new solution is marked (not when unmarking)
  IF NEW.accepted_comment_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Don't notify if the same comment was already accepted
  IF OLD.accepted_comment_id = NEW.accepted_comment_id THEN
    RETURN NEW;
  END IF;
  
  -- Get the comment author
  SELECT user_id INTO v_comment_user_id
  FROM request_comments
  WHERE id = NEW.accepted_comment_id;
  
  -- Don't notify if the author is the same as the requester
  IF v_comment_user_id = NEW.created_by THEN
    RETURN NEW;
  END IF;
  
  -- Get requester name
  SELECT full_name INTO v_requester_name
  FROM profiles
  WHERE user_id = NEW.created_by;
  
  -- Get request title or truncated body
  v_request_title := COALESCE(NEW.title, LEFT(NEW.body, 50) || '...');
  
  -- Create notification
  INSERT INTO notifications (user_id, title, body, link)
  VALUES (
    v_comment_user_id,
    'Your answer was marked as the solution! 🎉',
    COALESCE(v_requester_name, 'A member') || ' accepted your answer on "' || v_request_title || '"',
    '/community-asks/' || NEW.id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for solution notification
DROP TRIGGER IF EXISTS trigger_notify_solution_accepted ON requests;
CREATE TRIGGER trigger_notify_solution_accepted
  AFTER UPDATE OF accepted_comment_id ON requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_solution_accepted();