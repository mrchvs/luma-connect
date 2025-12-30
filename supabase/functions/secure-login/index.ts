import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoginRequest {
  email: string;
  password: string;
}

interface LockoutStatus {
  is_locked: boolean;
  locked_until: string | null;
  attempts_remaining: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { email, password }: LoginRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Use service role client for lockout checks
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if account is locked
    console.log(`Checking lockout status for email: ${email.substring(0, 3)}***`);
    const { data: lockoutData, error: lockoutError } = await adminClient
      .rpc('check_lockout', { p_email: email });

    if (lockoutError) {
      console.error('Error checking lockout:', lockoutError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify account status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lockoutStatus = lockoutData?.[0] as LockoutStatus | undefined;

    if (lockoutStatus?.is_locked) {
      console.log('Account is locked');
      const lockedUntil = new Date(lockoutStatus.locked_until!);
      const minutesRemaining = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
      
      return new Response(
        JSON.stringify({
          error: 'Account temporarily locked',
          locked_until: lockoutStatus.locked_until,
          message: `Too many failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Attempt login using anon client (simulates normal user login)
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.log('Login failed, recording attempt');
      
      // Record failed attempt
      const { data: attemptData, error: attemptError } = await adminClient
        .rpc('record_failed_attempt', { p_email: email });

      if (attemptError) {
        console.error('Error recording failed attempt:', attemptError);
      }

      const attemptStatus = attemptData?.[0] as LockoutStatus | undefined;

      if (attemptStatus?.is_locked) {
        const lockedUntil = new Date(attemptStatus.locked_until!);
        const minutesRemaining = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
        
        return new Response(
          JSON.stringify({
            error: 'Account locked',
            locked_until: attemptStatus.locked_until,
            message: `Too many failed login attempts. Your account has been locked for ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return generic error with attempts remaining
      return new Response(
        JSON.stringify({
          error: authError.message,
          attempts_remaining: attemptStatus?.attempts_remaining ?? 0
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Login successful - clear any failed attempts
    console.log('Login successful, clearing attempts');
    await adminClient.rpc('clear_login_attempts', { p_email: email });

    return new Response(
      JSON.stringify({
        session: authData.session,
        user: authData.user
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in secure-login:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});