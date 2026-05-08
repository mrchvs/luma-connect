-- Create pod_preferences table to separate pod matching from 1:1 matching
CREATE TABLE public.pod_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  grouping_type TEXT NOT NULL CHECK (grouping_type IN ('stage', 'focus')),
  stage TEXT CHECK (stage IN ('exploring', 'building', 'growing', 'established')),
  focus TEXT CHECK (focus IN ('product_development', 'go_to_market', 'fundraising', 'operations')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Validation: stage required when grouping_type is 'stage', focus required when grouping_type is 'focus'
  CONSTRAINT valid_stage_preference CHECK (
    (grouping_type != 'stage' OR stage IS NOT NULL)
  ),
  CONSTRAINT valid_focus_preference CHECK (
    (grouping_type != 'focus' OR focus IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.pod_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own pod preferences
CREATE POLICY "Users can view their own pod preferences"
ON public.pod_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pod preferences"
ON public.pod_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_approved_user(auth.uid()));

CREATE POLICY "Users can update their own pod preferences"
ON public.pod_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pod preferences"
ON public.pod_preferences FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all pod preferences for matching
CREATE POLICY "Admins can view all pod preferences"
ON public.pod_preferences FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_pod_preferences_updated_at
BEFORE UPDATE ON public.pod_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Remove pod-related columns from matching_preferences if they conflict
-- (opt_in_pods and pod_preference can remain as we'll just not use them for pod signup anymore)