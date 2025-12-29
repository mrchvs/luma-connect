-- Add email and phone number columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN email text,
ADD COLUMN phone_number text;