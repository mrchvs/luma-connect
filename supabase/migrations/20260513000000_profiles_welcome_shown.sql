-- Track whether the user has seen the post-approval welcome modal.
-- Stored in DB so it persists across devices and browsers.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_shown BOOLEAN DEFAULT FALSE;
