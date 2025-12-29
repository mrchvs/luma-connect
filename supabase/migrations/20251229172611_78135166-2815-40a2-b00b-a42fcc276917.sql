-- Create separate admin_notes table for secure admin-only access
CREATE TABLE public.admin_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id)
);

-- Enable RLS
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin notes
CREATE POLICY "Only admins can view admin notes" ON public.admin_notes
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Only admins can insert admin notes
CREATE POLICY "Only admins can insert admin notes" ON public.admin_notes
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update admin notes
CREATE POLICY "Only admins can update admin notes" ON public.admin_notes
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete admin notes
CREATE POLICY "Only admins can delete admin notes" ON public.admin_notes
FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_admin_notes_updated_at
BEFORE UPDATE ON public.admin_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing admin_notes data
INSERT INTO public.admin_notes (profile_id, notes, created_at, updated_at)
SELECT id, admin_notes, created_at, updated_at
FROM public.profiles
WHERE admin_notes IS NOT NULL AND admin_notes != '';

-- Drop admin_notes column from profiles
ALTER TABLE public.profiles DROP COLUMN admin_notes;