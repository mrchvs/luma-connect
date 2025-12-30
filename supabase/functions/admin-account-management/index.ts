import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManageAccountRequest {
  action: 'list_locked' | 'unlock_account' | 'get_settings' | 'update_settings' | 'get_audit_logs';
  email?: string;
  settings?: {
    lockout_duration_minutes?: number;
    max_login_attempts?: number;
  };
}

async function logAuditAction(
  serviceClient: any,
  adminUserId: string,
  adminEmail: string,
  actionType: string,
  targetIdentifier: string | null,
  details: Record<string, unknown> | null
) {
  const { error } = await serviceClient
    .from('admin_audit_logs')
    .insert({
      admin_user_id: adminUserId,
      admin_email: adminEmail,
      action_type: actionType,
      target_identifier: targetIdentifier,
      details: details
    });
  
  if (error) {
    console.error('Failed to log audit action:', error);
  }
}

async function sendUnlockNotificationEmail(email: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured, skipping email notification');
    return;
  }

  const resend = new Resend(resendApiKey);

  try {
    await resend.emails.send({
      from: 'Security <onboarding@resend.dev>',
      to: [email],
      subject: 'Your Account Has Been Unlocked',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Account Unlocked</h1>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Good news! Your account has been manually unlocked by an administrator.
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            You can now log in to your account. If you've forgotten your password, please use the password reset feature.
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-top: 24px;">
            If you didn't request this unlock or have any concerns about your account security, please contact our support team immediately.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #888; font-size: 14px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    });
    console.log(`Unlock notification email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send unlock notification email:', error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization header exists
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // First verify the user is an admin using their JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.error('Role check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { action, email, settings }: ManageAccountRequest = await req.json();
    console.log(`Admin ${user.email} performing action: ${action}`);

    // Use service role client for operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'list_locked') {
      // Get all locked accounts (where locked_until is in the future)
      const { data: lockedAccounts, error: listError } = await serviceClient
        .from('login_attempts')
        .select('*')
        .not('locked_until', 'is', null)
        .gt('locked_until', new Date().toISOString())
        .order('locked_until', { ascending: false });

      if (listError) {
        console.error('Error listing locked accounts:', listError);
        throw listError;
      }

      // Also get accounts with high attempt counts (near lockout)
      const { data: atRiskAccounts, error: atRiskError } = await serviceClient
        .from('login_attempts')
        .select('*')
        .gte('attempt_count', 3)
        .or(`locked_until.is.null,locked_until.lte.${new Date().toISOString()}`)
        .order('attempt_count', { ascending: false });

      if (atRiskError) {
        console.error('Error listing at-risk accounts:', atRiskError);
      }

      return new Response(
        JSON.stringify({ 
          lockedAccounts: lockedAccounts || [],
          atRiskAccounts: atRiskAccounts || []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'unlock_account') {
      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email is required for unlock action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete the login attempts record to unlock the account
      const { error: unlockError } = await serviceClient
        .from('login_attempts')
        .delete()
        .eq('email', email.toLowerCase());

      if (unlockError) {
        console.error('Error unlocking account:', unlockError);
        throw unlockError;
      }

      // Log the audit action
      await logAuditAction(
        serviceClient,
        user.id,
        user.email || 'unknown',
        'account_unlocked',
        email.toLowerCase(),
        { unlocked_by: user.email }
      );

      // Send notification email to the user
      await sendUnlockNotificationEmail(email.toLowerCase());

      console.log(`Account ${email} unlocked by admin ${user.email}`);

      return new Response(
        JSON.stringify({ success: true, message: `Account ${email} has been unlocked` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_settings') {
      const { data: settingsData, error: settingsError } = await serviceClient
        .from('security_settings')
        .select('*');

      if (settingsError) {
        console.error('Error fetching settings:', settingsError);
        throw settingsError;
      }

      const settingsMap: Record<string, unknown> = {};
      settingsData?.forEach((s: { setting_key: string; setting_value: unknown; id: string; description: string }) => {
        settingsMap[s.setting_key] = s;
      });

      return new Response(
        JSON.stringify({ settings: settingsMap }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update_settings') {
      if (!settings) {
        return new Response(
          JSON.stringify({ error: 'Settings object is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const changedSettings: Record<string, { old?: unknown; new: unknown }> = {};

      if (settings.lockout_duration_minutes !== undefined) {
        // Get current value for audit log
        const { data: currentSetting } = await serviceClient
          .from('security_settings')
          .select('setting_value')
          .eq('setting_key', 'lockout_duration_minutes')
          .single();

        changedSettings['lockout_duration_minutes'] = {
          old: currentSetting?.setting_value,
          new: settings.lockout_duration_minutes
        };

        const { error: updateError } = await serviceClient
          .from('security_settings')
          .update({ setting_value: settings.lockout_duration_minutes })
          .eq('setting_key', 'lockout_duration_minutes');
        
        if (updateError) throw updateError;
      }

      if (settings.max_login_attempts !== undefined) {
        // Get current value for audit log
        const { data: currentSetting } = await serviceClient
          .from('security_settings')
          .select('setting_value')
          .eq('setting_key', 'max_login_attempts')
          .single();

        changedSettings['max_login_attempts'] = {
          old: currentSetting?.setting_value,
          new: settings.max_login_attempts
        };

        const { error: updateError } = await serviceClient
          .from('security_settings')
          .update({ setting_value: settings.max_login_attempts })
          .eq('setting_key', 'max_login_attempts');
        
        if (updateError) throw updateError;
      }

      // Log the audit action
      await logAuditAction(
        serviceClient,
        user.id,
        user.email || 'unknown',
        'security_settings_updated',
        null,
        { changes: changedSettings }
      );

      console.log(`Security settings updated by admin ${user.email}:`, changedSettings);

      return new Response(
        JSON.stringify({ success: true, message: 'Settings updated successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_audit_logs') {
      const { data: auditLogs, error: auditError } = await serviceClient
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (auditError) {
        console.error('Error fetching audit logs:', auditError);
        throw auditError;
      }

      return new Response(
        JSON.stringify({ auditLogs: auditLogs || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin account management error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
