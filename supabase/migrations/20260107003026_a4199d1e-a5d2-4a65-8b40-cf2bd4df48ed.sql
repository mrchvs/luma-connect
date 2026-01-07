-- Create messages table for 1:1 conversations
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create conversations table to track unique conversation pairs
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_one UUID NOT NULL,
  participant_two UUID NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Optional: link to booking or intro request that created this conversation
  booking_id UUID REFERENCES public.mentor_bookings(id) ON DELETE SET NULL,
  intro_request_id UUID REFERENCES public.intro_requests(id) ON DELETE SET NULL,
  UNIQUE(participant_one, participant_two)
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Users can view their own conversations" 
ON public.conversations 
FOR SELECT 
USING (auth.uid() = participant_one OR auth.uid() = participant_two);

CREATE POLICY "Authenticated users can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND (auth.uid() = participant_one OR auth.uid() = participant_two));

CREATE POLICY "Users can update their own conversations" 
ON public.conversations 
FOR UPDATE 
USING (auth.uid() = participant_one OR auth.uid() = participant_two);

-- RLS policies for messages
CREATE POLICY "Users can view messages in their conversations" 
ON public.messages 
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own sent messages" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Create indexes for performance
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX idx_conversations_participants ON public.conversations(participant_one, participant_two);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Helper function to get or create conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_user_one UUID,
  p_user_two UUID,
  p_booking_id UUID DEFAULT NULL,
  p_intro_request_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id UUID;
  v_participant_one UUID;
  v_participant_two UUID;
BEGIN
  -- Ensure consistent ordering to avoid duplicate conversations
  IF p_user_one < p_user_two THEN
    v_participant_one := p_user_one;
    v_participant_two := p_user_two;
  ELSE
    v_participant_one := p_user_two;
    v_participant_two := p_user_one;
  END IF;

  -- Try to find existing conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE participant_one = v_participant_one AND participant_two = v_participant_two;

  -- Create new conversation if not found
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (participant_one, participant_two, booking_id, intro_request_id)
    VALUES (v_participant_one, v_participant_two, p_booking_id, p_intro_request_id)
    RETURNING id INTO v_conversation_id;
  ELSE
    -- Update booking_id or intro_request_id if provided
    IF p_booking_id IS NOT NULL OR p_intro_request_id IS NOT NULL THEN
      UPDATE conversations 
      SET 
        booking_id = COALESCE(p_booking_id, booking_id),
        intro_request_id = COALESCE(p_intro_request_id, intro_request_id)
      WHERE id = v_conversation_id;
    END IF;
  END IF;

  RETURN v_conversation_id;
END;
$$;