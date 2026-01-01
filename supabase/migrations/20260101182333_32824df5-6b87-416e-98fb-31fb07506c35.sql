-- Create request_status enum
CREATE TYPE public.request_status AS ENUM ('open', 'resolved', 'archived');

-- Create requests table (Community Asks)
CREATE TABLE public.requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  status public.request_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create request_tags junction table
CREATE TABLE public.request_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(request_id, tag_id)
);

-- Create activity_events table
CREATE TABLE public.activity_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web',
  token TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Create notification_settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  push_enabled BOOLEAN NOT NULL DEFAULT false,
  push_intro BOOLEAN NOT NULL DEFAULT true,
  push_scheduling BOOLEAN NOT NULL DEFAULT true,
  email_intro BOOLEAN NOT NULL DEFAULT true,
  email_scheduling BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Extend invitations table with referral columns
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS invited_by_user_id UUID,
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'admin',
ADD COLUMN IF NOT EXISTS note TEXT;

-- Add referral limit setting to security_settings
INSERT INTO public.security_settings (setting_key, setting_value, description)
VALUES ('referrals_per_member_per_month', '3', 'Maximum number of referrals a member can send per month')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS on all new tables
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for requests
CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for notification_settings
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for requests table
CREATE POLICY "Approved users can view open and resolved requests"
  ON public.requests FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND is_approved_user(auth.uid()) 
    AND status IN ('open', 'resolved')
  );

CREATE POLICY "Approved users can create requests"
  ON public.requests FOR INSERT
  WITH CHECK (
    auth.uid() = created_by 
    AND is_approved_user(auth.uid())
  );

CREATE POLICY "Creator can update own request status"
  ON public.requests FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can update any request"
  ON public.requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all requests"
  ON public.requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Requests cannot be deleted"
  ON public.requests FOR DELETE
  USING (false);

-- RLS Policies for request_tags table
CREATE POLICY "Approved users can view request tags"
  ON public.request_tags FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND is_approved_user(auth.uid())
  );

CREATE POLICY "Users can add tags to own requests"
  ON public.request_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requests 
      WHERE id = request_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can remove tags from own requests"
  ON public.request_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.requests 
      WHERE id = request_id AND created_by = auth.uid()
    )
  );

-- RLS Policies for activity_events table
CREATE POLICY "Users can view own activity"
  ON public.activity_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity"
  ON public.activity_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert activity events"
  ON public.activity_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Activity events cannot be updated"
  ON public.activity_events FOR UPDATE
  USING (false);

CREATE POLICY "Activity events cannot be deleted"
  ON public.activity_events FOR DELETE
  USING (false);

-- RLS Policies for push_subscriptions table
CREATE POLICY "Users can view own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for notification_settings table
CREATE POLICY "Users can view own notification settings"
  ON public.notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notification settings"
  ON public.notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON public.notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy for members to view their own referrals
CREATE POLICY "Members can view own referrals"
  ON public.invitations FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND invited_by_user_id = auth.uid()
  );

-- Add email templates for onboarding
INSERT INTO public.email_templates (template_key, name, subject, body_html, available_placeholders)
VALUES 
(
  'onboarding_submitted',
  'Onboarding Submitted Confirmation',
  'We''ve received your application to Luma Circle!',
  '<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <h1 style="font-family: serif; color: #1a1a1a; font-size: 28px; margin-bottom: 24px;">Thank you, {{user_name}}!</h1>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">We''ve received your application to join Luma Circle. Our team is reviewing your profile and will get back to you within 2-3 business days.</p>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">In the meantime, you can log in to view your submitted profile.</p>
    <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6;">With warmth,<br>The Luma Circle Team</p>
  </div>',
  ARRAY['user_name']
),
(
  'approved_start_here',
  'Welcome - Start Here Guide',
  'Welcome to Luma Circle - Here''s how to get started',
  '<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <h1 style="font-family: serif; color: #1a1a1a; font-size: 28px; margin-bottom: 24px;">Welcome to the Circle, {{user_name}}! 🎉</h1>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Your application has been approved! Here are three ways to get started:</p>
    
    <div style="background: #f9f5f2; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
      <h3 style="color: #1a1a1a; font-size: 18px; margin: 0 0 8px 0;">1. Complete your profile</h3>
      <p style="color: #6a6a6a; font-size: 14px; margin: 0;">Add a photo and make sure your bio reflects what you''re working on.</p>
    </div>
    
    <div style="background: #f9f5f2; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
      <h3 style="color: #1a1a1a; font-size: 18px; margin: 0 0 8px 0;">2. Post your first ask</h3>
      <p style="color: #6a6a6a; font-size: 14px; margin: 0;">Share what you need help with. Our community is here to support you.</p>
    </div>
    
    <div style="background: #f9f5f2; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #1a1a1a; font-size: 18px; margin: 0 0 8px 0;">3. Respond to someone</h3>
      <p style="color: #6a6a6a; font-size: 14px; margin: 0;">Browse open asks and offer your expertise to a fellow founder.</p>
    </div>
    
    <a href="{{dashboard_link}}" style="display: inline-block; background: #E07A5F; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500;">Go to Dashboard</a>
    
    <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin-top: 32px;">With warmth,<br>The Luma Circle Team</p>
  </div>',
  ARRAY['user_name', 'dashboard_link', 'members_link', 'community_asks_link']
);

-- Create index for faster request queries
CREATE INDEX idx_requests_status ON public.requests(status);
CREATE INDEX idx_requests_created_by ON public.requests(created_by);
CREATE INDEX idx_requests_created_at ON public.requests(created_at DESC);
CREATE INDEX idx_activity_events_user_id ON public.activity_events(user_id);
CREATE INDEX idx_activity_events_created_at ON public.activity_events(created_at DESC);