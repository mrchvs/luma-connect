-- Add new columns to profiles table for intent-led orchestration
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_intent text CHECK (current_intent IN ('perspective', 'peers', 'focused_chats', 'quiet')),
ADD COLUMN IF NOT EXISTS availability_status text DEFAULT 'available' CHECK (availability_status IN ('available', 'async', 'heads_down')),
ADD COLUMN IF NOT EXISTS currently_navigating text,
ADD COLUMN IF NOT EXISTS not_looking_for text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS conversation_style text[] DEFAULT '{}';

-- Create community_events table for Community Rhythm
CREATE TABLE IF NOT EXISTS public.community_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  purpose text,
  who_its_for text,
  energy_level text CHECK (energy_level IN ('low', 'medium', 'high')),
  time_commitment text,
  event_type text NOT NULL,
  scheduled_at timestamp with time zone NOT NULL,
  duration_minutes integer DEFAULT 60,
  recurring_pattern text CHECK (recurring_pattern IN ('weekly', 'biweekly', 'monthly', 'one_time')),
  max_participants integer,
  is_active boolean DEFAULT true,
  created_by UUID NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create event RSVPs table
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status text DEFAULT 'attending' CHECK (status IN ('attending', 'maybe', 'declined')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create structured matching preferences table
CREATE TABLE IF NOT EXISTS public.matching_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  opt_in_1on1 boolean DEFAULT false,
  matching_mode text CHECK (matching_mode IN ('accountability_partner', 'thinking_buddy', 'skill_swap')),
  cadence text CHECK (cadence IN ('weekly', 'biweekly')),
  duration_weeks integer CHECK (duration_weeks IN (2, 4)),
  matching_intention text,
  opt_in_pods boolean DEFAULT false,
  pod_preference text CHECK (pod_preference IN ('stage', 'business_model', 'current_focus')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create active matches table for 1:1 partnerships
CREATE TABLE IF NOT EXISTS public.structured_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_one UUID NOT NULL,
  user_two UUID NOT NULL,
  match_type text NOT NULL CHECK (match_type IN ('accountability_partner', 'thinking_buddy', 'skill_swap')),
  cadence text NOT NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ends_at timestamp with time zone NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create pods table for small-group matching
CREATE TABLE IF NOT EXISTS public.pods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  focus_type text NOT NULL CHECK (focus_type IN ('stage', 'business_model', 'current_focus')),
  focus_value text,
  max_members integer DEFAULT 6,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ends_at timestamp with time zone NOT NULL,
  weekly_prompt text,
  status text DEFAULT 'active' CHECK (status IN ('forming', 'active', 'completed')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create pod members table
CREATE TABLE IF NOT EXISTS public.pod_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pod_id UUID NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(pod_id, user_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matching_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.structured_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for community_events
CREATE POLICY "Approved users can view active events"
  ON public.community_events FOR SELECT
  USING (is_active = true AND is_approved_user(auth.uid()));

CREATE POLICY "Admins can manage events"
  ON public.community_events FOR ALL
  USING (is_owner_or_admin(auth.uid()));

-- RLS policies for event_rsvps
CREATE POLICY "Users can view their own RSVPs"
  ON public.event_rsvps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own RSVPs"
  ON public.event_rsvps FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all RSVPs"
  ON public.event_rsvps FOR SELECT
  USING (is_owner_or_admin(auth.uid()));

-- RLS policies for matching_preferences
CREATE POLICY "Users can view and manage their own preferences"
  ON public.matching_preferences FOR ALL
  USING (auth.uid() = user_id);

-- RLS policies for structured_matches
CREATE POLICY "Users can view their own matches"
  ON public.structured_matches FOR SELECT
  USING (auth.uid() = user_one OR auth.uid() = user_two);

CREATE POLICY "Admins can manage matches"
  ON public.structured_matches FOR ALL
  USING (is_owner_or_admin(auth.uid()));

-- RLS policies for pods
CREATE POLICY "Pod members can view their pods"
  ON public.pods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pod_members pm 
      WHERE pm.pod_id = id AND pm.user_id = auth.uid()
    )
    OR is_owner_or_admin(auth.uid())
  );

CREATE POLICY "Admins can manage pods"
  ON public.pods FOR ALL
  USING (is_owner_or_admin(auth.uid()));

-- RLS policies for pod_members
CREATE POLICY "Pod members can view members of their pods"
  ON public.pod_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pod_members pm2 
      WHERE pm2.pod_id = pod_id AND pm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join pods"
  ON public.pod_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave pods"
  ON public.pod_members FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_community_events_updated_at
  BEFORE UPDATE ON public.community_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_matching_preferences_updated_at
  BEFORE UPDATE ON public.matching_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();