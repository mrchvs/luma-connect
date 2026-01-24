-- Create pod_applications table for member-to-pod applications
CREATE TABLE public.pod_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pod_id UUID NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pod_id, user_id)
);

-- Enable RLS
ALTER TABLE public.pod_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for pod_applications
CREATE POLICY "Users can view their own applications"
ON public.pod_applications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications"
ON public.pod_applications
FOR SELECT
USING (is_owner_or_admin(auth.uid()));

CREATE POLICY "Approved users can create applications"
ON public.pod_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_approved_user(auth.uid()));

CREATE POLICY "Admins can update applications"
ON public.pod_applications
FOR UPDATE
USING (is_owner_or_admin(auth.uid()));

CREATE POLICY "Users can delete their own pending applications"
ON public.pod_applications
FOR DELETE
USING (auth.uid() = user_id AND status = 'pending');

-- Add trigger for updated_at
CREATE TRIGGER update_pod_applications_updated_at
BEFORE UPDATE ON public.pod_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add is_open column to pods for admin to control visibility
ALTER TABLE public.pods ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;

-- Update pods RLS to allow approved users to view open pods
DROP POLICY IF EXISTS "Pod members can view their pods" ON public.pods;

CREATE POLICY "Approved users can view open pods"
ON public.pods
FOR SELECT
USING (
  (is_open = true AND is_approved_user(auth.uid()))
  OR EXISTS (SELECT 1 FROM pod_members pm WHERE pm.pod_id = pods.id AND pm.user_id = auth.uid())
  OR is_owner_or_admin(auth.uid())
);