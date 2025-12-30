-- Create a separate table for sensitive contact information
CREATE TABLE public.profile_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;

-- Owner can always view their own contact info
CREATE POLICY "Users can view own contact info"
ON public.profile_contacts
FOR SELECT
USING (auth.uid() = user_id);

-- Connected users can view contact info (via accepted intro request)
CREATE POLICY "Connected users can view contact info"
ON public.profile_contacts
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND are_users_connected(auth.uid(), user_id)
);

-- Admins can view all contact info
CREATE POLICY "Admins can view all contact info"
ON public.profile_contacts
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Users can insert their own contact info
CREATE POLICY "Users can insert own contact info"
ON public.profile_contacts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own contact info
CREATE POLICY "Users can update own contact info"
ON public.profile_contacts
FOR UPDATE
USING (auth.uid() = user_id);

-- Contact info cannot be deleted
CREATE POLICY "Contact info cannot be deleted"
ON public.profile_contacts
FOR DELETE
USING (false);

-- Migrate existing data from profiles to profile_contacts
INSERT INTO public.profile_contacts (user_id, email, phone_number)
SELECT user_id, email, phone_number 
FROM public.profiles 
WHERE email IS NOT NULL OR phone_number IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_profile_contacts_updated_at
BEFORE UPDATE ON public.profile_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Remove sensitive columns from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_number;