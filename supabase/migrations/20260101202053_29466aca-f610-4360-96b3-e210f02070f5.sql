-- Create table for private connection notes
CREATE TABLE public.connection_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intro_request_id UUID NOT NULL REFERENCES public.intro_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint so each user can only have one note per connection
CREATE UNIQUE INDEX unique_user_connection_note ON public.connection_notes(intro_request_id, user_id);

-- Enable Row Level Security
ALTER TABLE public.connection_notes ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own notes
CREATE POLICY "Users can view their own connection notes" 
ON public.connection_notes 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy: Users can insert their own notes (only if they're part of the connection)
CREATE POLICY "Users can create their own connection notes" 
ON public.connection_notes 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.intro_requests 
    WHERE id = intro_request_id 
    AND (requester_id = auth.uid() OR helper_id = auth.uid())
  )
);

-- Create policy: Users can update their own notes
CREATE POLICY "Users can update their own connection notes" 
ON public.connection_notes 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policy: Users can delete their own notes
CREATE POLICY "Users can delete their own connection notes" 
ON public.connection_notes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_connection_notes_updated_at
BEFORE UPDATE ON public.connection_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();