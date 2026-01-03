-- ============================================
-- Q&A IMPROVEMENTS: upvotes, comments, accepted answers
-- ============================================

-- Add accepted_comment_id to requests table for marking accepted answers
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS accepted_comment_id UUID;

-- Create request_upvotes table for upvoting asks
CREATE TABLE public.request_upvotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(request_id, user_id)
);

-- Create request_comments table for threaded replies
CREATE TABLE public.request_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.request_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comment_upvotes table for upvoting comments
CREATE TABLE public.comment_upvotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.request_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Add foreign key constraint for accepted_comment_id
ALTER TABLE public.requests 
  ADD CONSTRAINT fk_requests_accepted_comment 
  FOREIGN KEY (accepted_comment_id) 
  REFERENCES public.request_comments(id) 
  ON DELETE SET NULL;

-- ============================================
-- ONBOARDING: industries and expectations
-- ============================================

-- Create industries table
CREATE TABLE public.industries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default industries
INSERT INTO public.industries (label) VALUES
  ('Tech'),
  ('Health & Well-being'),
  ('Education / Training'),
  ('Consulting / Coaching'),
  ('Finance'),
  ('Creative / Design'),
  ('Marketing / Communication'),
  ('Sustainability'),
  ('Other');

-- Create profile_industries junction table
CREATE TABLE public.profile_industries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  industry_id UUID NOT NULL REFERENCES public.industries(id) ON DELETE CASCADE,
  custom_industry TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, industry_id)
);

-- Create expectations table
CREATE TABLE public.expectations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default expectations
INSERT INTO public.expectations (label) VALUES
  ('Access entrepreneurial information'),
  ('Make my project / business visible'),
  ('Develop my skills'),
  ('Share my experience / expertise'),
  ('Connect with other women entrepreneurs'),
  ('I''m not sure yet'),
  ('Other');

-- Create profile_expectations junction table
CREATE TABLE public.profile_expectations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  expectation_id UUID NOT NULL REFERENCES public.expectations(id) ON DELETE CASCADE,
  custom_expectation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, expectation_id)
);

-- Add stage to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stage TEXT;

-- Add first_name and last_name to profiles (separate fields)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;

-- ============================================
-- ONBOARDING CHECKLIST: tracking progress
-- ============================================

-- Create onboarding_progress table
CREATE TABLE public.onboarding_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  profile_completed BOOLEAN DEFAULT false,
  industries_added BOOLEAN DEFAULT false,
  photo_uploaded BOOLEAN DEFAULT false,
  first_message_sent BOOLEAN DEFAULT false,
  first_ask_posted BOOLEAN DEFAULT false,
  checklist_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE public.request_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_expectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- request_upvotes policies
CREATE POLICY "Approved users can view upvotes" ON public.request_upvotes
  FOR SELECT USING (is_approved_user(auth.uid()));

CREATE POLICY "Approved users can add upvotes" ON public.request_upvotes
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_approved_user(auth.uid()));

CREATE POLICY "Users can remove their own upvotes" ON public.request_upvotes
  FOR DELETE USING (auth.uid() = user_id);

-- request_comments policies
CREATE POLICY "Approved users can view comments" ON public.request_comments
  FOR SELECT USING (is_approved_user(auth.uid()));

CREATE POLICY "Approved users can add comments" ON public.request_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_approved_user(auth.uid()));

CREATE POLICY "Users can update their own comments" ON public.request_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.request_comments
  FOR DELETE USING (auth.uid() = user_id);

-- comment_upvotes policies
CREATE POLICY "Approved users can view comment upvotes" ON public.comment_upvotes
  FOR SELECT USING (is_approved_user(auth.uid()));

CREATE POLICY "Approved users can add comment upvotes" ON public.comment_upvotes
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_approved_user(auth.uid()));

CREATE POLICY "Users can remove their own comment upvotes" ON public.comment_upvotes
  FOR DELETE USING (auth.uid() = user_id);

-- industries policies (public read)
CREATE POLICY "Anyone can view industries" ON public.industries
  FOR SELECT USING (true);

-- profile_industries policies
CREATE POLICY "Authenticated users can view profile industries" ON public.profile_industries
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own industries" ON public.profile_industries
  FOR ALL USING (auth.uid() = user_id);

-- expectations policies (public read)
CREATE POLICY "Anyone can view expectations" ON public.expectations
  FOR SELECT USING (true);

-- profile_expectations policies
CREATE POLICY "Authenticated users can view profile expectations" ON public.profile_expectations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own expectations" ON public.profile_expectations
  FOR ALL USING (auth.uid() = user_id);

-- onboarding_progress policies
CREATE POLICY "Users can view their own progress" ON public.onboarding_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own progress" ON public.onboarding_progress
  FOR ALL USING (auth.uid() = user_id);

-- Trigger for updated_at on comments
CREATE TRIGGER update_request_comments_updated_at
  BEFORE UPDATE ON public.request_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on onboarding_progress
CREATE TRIGGER update_onboarding_progress_updated_at
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();