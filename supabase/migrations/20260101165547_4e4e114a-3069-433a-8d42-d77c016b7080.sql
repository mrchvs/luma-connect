-- Create table for time slot proposals
CREATE TABLE public.proposed_time_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intro_request_id UUID NOT NULL REFERENCES public.intro_requests(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposed_time_slots ENABLE ROW LEVEL SECURITY;

-- Both parties can view time slots for their requests
CREATE POLICY "Users can view time slots for their requests"
ON public.proposed_time_slots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.intro_requests ir
    WHERE ir.id = intro_request_id
    AND (ir.requester_id = auth.uid() OR ir.helper_id = auth.uid())
  )
);

-- Both parties can propose time slots
CREATE POLICY "Users can propose time slots for their requests"
ON public.proposed_time_slots
FOR INSERT
WITH CHECK (
  proposed_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.intro_requests ir
    WHERE ir.id = intro_request_id
    AND ir.status = 'accepted'
    AND (ir.requester_id = auth.uid() OR ir.helper_id = auth.uid())
  )
);

-- Users can update slots they proposed (or accept/decline slots proposed to them)
CREATE POLICY "Users can update time slots"
ON public.proposed_time_slots
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.intro_requests ir
    WHERE ir.id = intro_request_id
    AND (ir.requester_id = auth.uid() OR ir.helper_id = auth.uid())
  )
);

-- Users can delete their own proposed slots
CREATE POLICY "Users can delete their own proposed time slots"
ON public.proposed_time_slots
FOR DELETE
USING (proposed_by = auth.uid());

-- Create updated_at trigger
CREATE TRIGGER update_proposed_time_slots_updated_at
BEFORE UPDATE ON public.proposed_time_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();