-- Create invitations table to track member invites
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL,
  invited_by_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(email, status)
);

-- Create index for token lookups
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can view invitations
CREATE POLICY "Admins can view all invitations"
ON public.invitations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can create invitations
CREATE POLICY "Admins can create invitations"
ON public.invitations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update invitations
CREATE POLICY "Admins can update invitations"
ON public.invitations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Invitations cannot be deleted
CREATE POLICY "Invitations cannot be deleted"
ON public.invitations
FOR DELETE
USING (false);