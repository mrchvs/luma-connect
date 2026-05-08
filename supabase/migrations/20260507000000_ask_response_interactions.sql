-- Add helpful flag to ask_responses
ALTER TABLE public.ask_responses ADD COLUMN IF NOT EXISTS is_helpful BOOLEAN NOT NULL DEFAULT false;

-- Upvotes on responses
CREATE TABLE IF NOT EXISTS public.ask_response_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.ask_responses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(response_id, user_id)
);

ALTER TABLE public.ask_response_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view upvotes"
  ON public.ask_response_upvotes FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_approved_user(auth.uid()));

CREATE POLICY "Approved users can upvote"
  ON public.ask_response_upvotes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_approved_user(auth.uid()));

CREATE POLICY "Users can remove own upvote"
  ON public.ask_response_upvotes FOR DELETE
  USING (auth.uid() = user_id);

-- Allow ask owner to mark responses as helpful
CREATE POLICY "Ask owners can mark responses helpful"
  ON public.ask_responses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.requests
      WHERE id = request_id AND created_by = auth.uid()
    )
  );
