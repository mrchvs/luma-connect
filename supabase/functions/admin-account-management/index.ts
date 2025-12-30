import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManageAccountRequest {
  action: 'list_locked' | 'unlock_account';
  email?: string;
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
    const { action, email }: ManageAccountRequest = await req.json();
    console.log(`Admin ${user.email} performing action: ${action}`);

    // Use service role client for login_attempts operations
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

      console.log(`Account ${email} unlocked by admin ${user.email}`);

      return new Response(
        JSON.stringify({ success: true, message: `Account ${email} has been unlocked` }),
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
