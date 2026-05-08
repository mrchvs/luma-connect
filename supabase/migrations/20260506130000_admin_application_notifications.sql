-- Trigger: notify all admins/owners when a profile is submitted for review

CREATE OR REPLACE FUNCTION public.notify_admins_new_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  applicant_name TEXT;
BEGIN
  -- Fire when a profile becomes completed + pending_review
  IF (NEW.completed = true AND NEW.status = 'pending_review') AND
     (OLD.completed IS DISTINCT FROM true OR OLD.status IS DISTINCT FROM 'pending_review') THEN

    applicant_name := COALESCE(NEW.full_name, 'A new member');

    -- Insert a notification for every admin and owner
    FOR admin_user_id IN
      SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'owner')
    LOOP
      INSERT INTO public.notifications (user_id, title, body, link)
      VALUES (
        admin_user_id,
        'New application to review',
        applicant_name || ' just submitted their profile and is waiting for approval.',
        '/admin'
      );
    END LOOP;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_submitted ON public.profiles;
CREATE TRIGGER on_profile_submitted
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_application();
