-- Create email templates table
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key text NOT NULL UNIQUE,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  available_placeholders text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can view templates
CREATE POLICY "Admins can view email templates"
ON public.email_templates
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update templates
CREATE POLICY "Admins can update email templates"
ON public.email_templates
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert is restricted (service role only for initial seeding)
CREATE POLICY "No user inserts for email templates"
ON public.email_templates
FOR INSERT
WITH CHECK (false);

-- No deletes allowed
CREATE POLICY "Email templates cannot be deleted"
ON public.email_templates
FOR DELETE
USING (false);

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default templates
INSERT INTO public.email_templates (template_key, name, subject, body_html, available_placeholders) VALUES
(
  'intro_request_accepted',
  'Introduction Accepted',
  'Great news! {{helper_name}} accepted your introduction request',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FDF8F4;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-family: serif; color: #1a1a1a; font-size: 28px; font-weight: normal; margin: 0;">Luma Circle</h1>
    </div>
    <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
      <h2 style="color: #10b981; margin: 0 0 24px 0; font-size: 24px;">Connection Accepted! 🎉</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi {{requester_name}},
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Great news! <strong>{{helper_name}}</strong> has accepted your introduction request.
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        You can now view their full profile and contact information. Visit the platform to connect!
      </p>
      <div style="text-align: center;">
        <a href="{{profile_link}}" style="display: inline-block; background: linear-gradient(135deg, #FF6B47, #E85A3C); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 500;">View Profile</a>
      </div>
    </div>
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
      This email was sent because you requested an introduction on Luma Circle.
    </p>
  </div>',
  ARRAY['requester_name', 'helper_name', 'profile_link']
),
(
  'intro_request_declined',
  'Introduction Declined',
  'Update on your introduction request',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FDF8F4;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-family: serif; color: #1a1a1a; font-size: 28px; font-weight: normal; margin: 0;">Luma Circle</h1>
    </div>
    <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
      <h2 style="color: #6b7280; margin: 0 0 24px 0; font-size: 24px;">Request Update</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi {{requester_name}},
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Unfortunately, <strong>{{helper_name}}</strong> was unable to accept your introduction request at this time.
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Don''t be discouraged! There are many other members who might be a great fit. Explore more matches on the platform.
      </p>
      <div style="text-align: center;">
        <a href="{{matches_link}}" style="display: inline-block; background: linear-gradient(135deg, #FF6B47, #E85A3C); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 500;">View Matches</a>
      </div>
    </div>
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
      This email was sent because you requested an introduction on Luma Circle.
    </p>
  </div>',
  ARRAY['requester_name', 'helper_name', 'matches_link']
),
(
  'new_intro_request',
  'New Introduction Request',
  '{{requester_name}} wants to connect with you!',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FDF8F4;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-family: serif; color: #1a1a1a; font-size: 28px; font-weight: normal; margin: 0;">Luma Circle</h1>
    </div>
    <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
      <h2 style="color: #8B5CF6; margin: 0 0 24px 0; font-size: 24px;">New Connection Request ✨</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi {{helper_name}},
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        <strong>{{requester_name}}</strong> from {{requester_location}} would like to connect with you!
      </p>
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0;">Their message:</p>
        <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0; font-style: italic;">"{{request_message}}"</p>
      </div>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 16px 0 24px 0;">
        Review their request and decide if you''d like to connect.
      </p>
      <div style="text-align: center;">
        <a href="{{requests_link}}" style="display: inline-block; background: linear-gradient(135deg, #FF6B47, #E85A3C); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 500;">View Request</a>
      </div>
    </div>
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
      This email was sent because someone requested an introduction with you on Luma Circle.
    </p>
  </div>',
  ARRAY['helper_name', 'requester_name', 'requester_location', 'request_message', 'requests_link']
);