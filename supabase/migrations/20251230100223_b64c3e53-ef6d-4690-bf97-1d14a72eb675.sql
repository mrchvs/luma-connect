-- Create member feedback table
CREATE TABLE public.member_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'general', 'praise')),
  message TEXT NOT NULL,
  page_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.member_feedback ENABLE ROW LEVEL SECURITY;

-- Users can submit feedback
CREATE POLICY "Users can submit feedback"
ON public.member_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view own feedback
CREATE POLICY "Users can view own feedback"
ON public.member_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.member_feedback
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Feedback cannot be updated or deleted
CREATE POLICY "Feedback cannot be updated"
ON public.member_feedback
FOR UPDATE
USING (false);

CREATE POLICY "Feedback cannot be deleted"
ON public.member_feedback
FOR DELETE
USING (false);

-- Create match reviews table for admins to track algorithm accuracy
CREATE TABLE public.match_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  matched_user_id UUID NOT NULL,
  overlapping_tags TEXT[] DEFAULT '{}',
  score INTEGER NOT NULL,
  is_accurate BOOLEAN,
  review_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, matched_user_id)
);

-- Enable RLS
ALTER TABLE public.match_reviews ENABLE ROW LEVEL SECURITY;

-- Admins can manage match reviews
CREATE POLICY "Admins can view match reviews"
ON public.match_reviews
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert match reviews"
ON public.match_reviews
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update match reviews"
ON public.match_reviews
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Match reviews cannot be deleted"
ON public.match_reviews
FOR DELETE
USING (false);