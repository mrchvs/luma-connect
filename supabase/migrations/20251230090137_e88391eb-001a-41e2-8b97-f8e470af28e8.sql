-- Add invitation email template
INSERT INTO public.email_templates (template_key, name, subject, body_html, available_placeholders)
VALUES (
  'member_invitation',
  'Member Invitation',
  'You''ve been invited to join!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px;">You''re Invited!</h1>
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      {{inviter_email}} has invited you to join our community. Click the button below to create your account and get started.
    </p>
    <a href="{{invite_link}}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
      Accept Invitation
    </a>
    <p style="color: #9ca3af; font-size: 14px; margin-top: 32px;">
      This invitation will expire in 7 days. If you didn''t expect this email, you can safely ignore it.
    </p>
  </div>
</body>
</html>',
  ARRAY['inviter_email', 'invite_link', 'invitee_email']
)
ON CONFLICT (template_key) DO NOTHING;