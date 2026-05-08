-- Create trigger function to notify when someone answers an Ask
CREATE OR REPLACE FUNCTION public.notify_ask_answer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request_owner_id uuid;
  v_request_title text;
  v_request_body text;
  v_commenter_name text;
  v_parent_comment_owner_id uuid;
BEGIN
  -- Get the request owner and title
  SELECT created_by, title, body INTO v_request_owner_id, v_request_title, v_request_body
  FROM requests
  WHERE id = NEW.request_id;
  
  -- Get commenter name
  SELECT full_name INTO v_commenter_name
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  -- Use truncated body if no title
  IF v_request_title IS NULL THEN
    v_request_title := LEFT(v_request_body, 50) || '...';
  END IF;
  
  -- If this is a top-level comment (not a reply), notify the Ask owner
  IF NEW.parent_id IS NULL THEN
    -- Don't notify if the commenter is the Ask owner
    IF NEW.user_id != v_request_owner_id THEN
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (
        v_request_owner_id,
        'New answer on your Ask',
        COALESCE(v_commenter_name, 'A member') || ' answered "' || v_request_title || '"',
        '/community-asks/' || NEW.request_id
      );
    END IF;
  ELSE
    -- This is a reply to a comment - notify the parent comment owner
    SELECT user_id INTO v_parent_comment_owner_id
    FROM request_comments
    WHERE id = NEW.parent_id;
    
    -- Don't notify if replying to own comment
    IF v_parent_comment_owner_id IS NOT NULL AND NEW.user_id != v_parent_comment_owner_id THEN
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (
        v_parent_comment_owner_id,
        'Someone replied to your comment',
        COALESCE(v_commenter_name, 'A member') || ' replied to your comment on "' || v_request_title || '"',
        '/community-asks/' || NEW.request_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for comment notifications
DROP TRIGGER IF EXISTS on_ask_comment_created ON request_comments;
CREATE TRIGGER on_ask_comment_created
  AFTER INSERT ON request_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_ask_answer();