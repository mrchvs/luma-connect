import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  profileId: string;
  userId: string;
  action: 'approved' | 'rejected' | 'suspended' | 'pending_review';
  adminNotes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create user client to verify admin status
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user making the request
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin using service role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();
    const { profileId, userId, action, adminNotes } = body;

    console.log(`Admin ${user.id} performing action: ${action} on profile ${profileId}`);

    // Update profile status
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        status: action,
        admin_notes: adminNotes || null
      })
      .eq('id', profileId);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notification for the user
    const notificationMessages: Record<string, { title: string; body: string }> = {
      approved: {
        title: "You're approved!",
        body: "Your profile has been approved. Your matches are ready — start connecting!"
      },
      rejected: {
        title: "Profile not approved",
        body: "We're unable to approve your profile at this time. Please review your information and try again."
      },
      suspended: {
        title: "Account suspended",
        body: "Your account has been suspended. Please contact support for more information."
      },
      pending_review: {
        title: "Profile under review",
        body: "Your profile has been moved back to review status."
      }
    };

    const notification = notificationMessages[action];
    
    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        title: notification.title,
        body: notification.body,
        link: action === 'approved' ? '/dashboard' : null
      });

    if (notifError) {
      console.error('Notification insert error:', notifError);
      // Don't fail the request if notification fails
    }

    console.log(`Successfully updated profile ${profileId} to ${action} and notified user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, action }),
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
