import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  userId: string;
  profileId: string;
  userName: string;
  userLocation: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    const { userId, profileId, userName, userLocation } = body;

    console.log(`New application received from ${userName} (${userId})`);

    // Get all admin users
    const { data: adminRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) {
      console.error('Error fetching admin roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch admins' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log('No admin users found');
      return new Response(
        JSON.stringify({ success: true, message: 'No admins to notify' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin emails
    const adminEmails: string[] = [];
    for (const admin of adminRoles) {
      const { data: userData, error: userError } = await supabaseAdmin
        .auth.admin.getUserById(admin.user_id);
      
      if (!userError && userData?.user?.email) {
        adminEmails.push(userData.user.email);
      }
    }

    if (adminEmails.length === 0) {
      console.log('No admin emails found');
      return new Response(
        JSON.stringify({ success: true, message: 'No admin emails found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch email template
    const { data: template, error: templateError } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .eq('template_key', 'new_application_admin')
      .single();

    const baseUrl = Deno.env.get('SITE_URL') || 'https://lumacircle.app';
    const adminLink = `${baseUrl}/admin`;

    let subject: string;
    let bodyHtml: string;

    if (templateError || !template) {
      console.log('Using fallback email template');
      // Fallback template
      subject = `New Application: ${userName} wants to join Luma Circle`;
      bodyHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FDF8F4;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-family: serif; color: #1a1a1a; font-size: 28px; font-weight: normal; margin: 0;">Luma Circle</h1>
          </div>
          <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <h2 style="color: #8B5CF6; margin: 0 0 24px 0; font-size: 24px;">New Application Received ✨</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
              A new founder has applied to join Luma Circle and needs your review.
            </p>
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0;">
                <strong>Name:</strong> ${userName}<br>
                <strong>Location:</strong> ${userLocation}
              </p>
            </div>
            <div style="text-align: center;">
              <a href="${adminLink}" style="display: inline-block; background: linear-gradient(135deg, #FF6B47, #E85A3C); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 500;">Review Application</a>
            </div>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
            This is an admin notification from Luma Circle.
          </p>
        </div>
      `;
    } else {
      // Use template with placeholders
      const placeholders: Record<string, string> = {
        user_name: userName,
        user_location: userLocation,
        admin_link: adminLink,
      };

      subject = template.subject;
      bodyHtml = template.body_html;

      Object.entries(placeholders).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, value);
        bodyHtml = bodyHtml.replace(regex, value);
      });
    }

    // Send email to all admins
    console.log(`Sending notification to ${adminEmails.length} admin(s)`);
    
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") || 'Luma Circle <onboarding@resend.dev>',
        to: adminEmails,
        subject,
        html: bodyHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Resend API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailResult = await emailResponse.json();
    console.log('Admin notification email sent successfully:', emailResult);

    // Create in-app notifications for all admins
    const notificationsToInsert = adminRoles.map((admin) => ({
      user_id: admin.user_id,
      title: `New member application`,
      body: `${userName} from ${userLocation} wants to join. Review their profile.`,
      link: '/admin',
    }));

    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationsToInsert);

    if (notifError) {
      console.error('Error creating in-app notifications:', notifError);
      // Don't fail - email was sent successfully
    } else {
      console.log(`Created in-app notifications for ${adminRoles.length} admin(s)`);
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
