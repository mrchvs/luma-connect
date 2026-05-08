-- Notify members when an ask is posted that matches their "Can help with" tags

CREATE OR REPLACE FUNCTION public.notify_matching_members_on_ask()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id UUID;
  v_title TEXT;
  v_body TEXT;
  v_notif_body TEXT;
BEGIN
  SELECT created_by, title, body INTO v_creator_id, v_title, v_body
  FROM public.requests WHERE id = NEW.request_id;

  v_notif_body := COALESCE(NULLIF(TRIM(v_title), ''), LEFT(v_body, 100));

  -- Notify members who offer this tag, excluding the ask creator
  -- Deduplicate: skip if we already sent a notification for this same ask to this user
  -- (handles multiple matching tags on one ask by checking within a short window)
  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT
    po.user_id,
    'New ask you can help with',
    v_notif_body,
    '/community-asks'
  FROM public.profile_offers po
  WHERE po.tag_id = NEW.tag_id
    AND po.user_id != v_creator_id
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = po.user_id
        AND n.title = 'New ask you can help with'
        AND n.body = v_notif_body
        AND n.created_at > NOW() - INTERVAL '10 minutes'
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ask_tag_added ON public.request_tags;
CREATE TRIGGER on_ask_tag_added
  AFTER INSERT ON public.request_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_matching_members_on_ask();
