-- Create mentor_application_status enum
CREATE TYPE public.mentor_application_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'revoked');

-- Create mentor_applications table
CREATE TABLE public.mentor_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status public.mentor_application_status NOT NULL DEFAULT 'draft',
  
  -- Application content
  expertise_areas TEXT[] NOT NULL DEFAULT '{}',
  industries TEXT[] NOT NULL DEFAULT '{}',
  services_description TEXT,
  pricing_info TEXT,
  mentor_bio TEXT,
  
  -- Optional fields
  credentials_url TEXT,
  availability_preferences TEXT,
  
  -- Metadata
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.mentor_applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own application
CREATE POLICY "Users can view own mentor application"
ON public.mentor_applications FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own application
CREATE POLICY "Users can create own mentor application"
ON public.mentor_applications FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_approved_user(auth.uid()));

-- Users can update their draft/rejected applications
CREATE POLICY "Users can update own draft or rejected application"
ON public.mentor_applications FOR UPDATE
USING (auth.uid() = user_id AND status IN ('draft', 'rejected'))
WITH CHECK (auth.uid() = user_id);

-- Admins can view all applications
CREATE POLICY "Admins can view all mentor applications"
ON public.mentor_applications FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update applications (approve/reject)
CREATE POLICY "Admins can update mentor applications"
ON public.mentor_applications FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- No deletions allowed
CREATE POLICY "Mentor applications cannot be deleted"
ON public.mentor_applications FOR DELETE
USING (false);

-- Add updated_at trigger
CREATE TRIGGER update_mentor_applications_updated_at
BEFORE UPDATE ON public.mentor_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();