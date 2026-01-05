-- Add 'mentor' to the app_role enum (this needs its own transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'mentor';