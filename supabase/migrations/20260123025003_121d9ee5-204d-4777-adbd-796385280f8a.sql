-- Add live_event_link and signup_link to community_events
ALTER TABLE public.community_events 
ADD COLUMN live_event_link text,
ADD COLUMN signup_link text;

-- Add status column to pod_preferences for tracking membership state
ALTER TABLE public.pod_preferences 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'waiting_for_match';

-- Create comment explaining status values
COMMENT ON COLUMN public.pod_preferences.status IS 'Status values: waiting_for_match, active, completed';