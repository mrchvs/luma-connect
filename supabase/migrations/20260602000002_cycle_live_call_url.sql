-- Add live call URL directly to the cycle
ALTER TABLE public.accountability_cycles
  ADD COLUMN IF NOT EXISTS live_call_url TEXT DEFAULT NULL;
