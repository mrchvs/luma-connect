CREATE TABLE public.ask_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ask_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view responses"
  ON public.ask_responses FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_approved_user(auth.uid()));

CREATE POLICY "Approved users can post responses"
  ON public.ask_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_approved_user(auth.uid()));

CREATE POLICY "Users can delete own responses"
  ON public.ask_responses FOR DELETE
  USING (auth.uid() = user_id);
