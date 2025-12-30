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
  rejectionReason?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
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

    // Check if user is admin or owner using service role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'owner'])
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Role check error:', roleError, 'User ID:', user.id);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${user.id} has role: ${roleData.role}`);

    const body: RequestBody = await req.json();
    const { profileId, userId, action, adminNotes, rejectionReason } = body;

    console.log(`Admin ${user.id} performing action: ${action} on profile ${profileId}`);

    // Fetch profile info for email
    const { data: profile, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', profileId)
      .single();

    if (profileFetchError) {
      console.error('Profile fetch error:', profileFetchError);
    }

    // Update profile status
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ status: action })
      .eq('id', profileId);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert admin notes to separate table
    if (adminNotes !== undefined) {
      const { error: notesError } = await supabaseAdmin
        .from('admin_notes')
        .upsert({ 
          profile_id: profileId,
          notes: adminNotes || null
        }, { 
          onConflict: 'profile_id' 
        });

      if (notesError) {
        console.error('Admin notes update error:', notesError);
        // Don't fail the request if notes update fails
      }
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

    // Send email notification for status changes (except pending_review)
    if (resendApiKey && action !== 'pending_review') {
      try {
        // Map action to template key
        const templateKeyMap: Record<string, string> = {
          approved: 'profile_approved',
          rejected: 'profile_rejected',
          suspended: 'profile_suspended',
        };

        const templateKey = templateKeyMap[action];
        
        // Fetch email template
        const { data: template, error: templateError } = await supabaseAdmin
          .from('email_templates')
          .select('*')
          .eq('template_key', templateKey)
          .single();

        if (templateError || !template) {
          console.error('Template fetch error:', templateError);
        } else {
          // Get user email
          const { data: userAuth, error: userAuthError } = await supabaseAdmin
            .auth.admin.getUserById(userId);

          if (userAuthError || !userAuth?.user?.email) {
            console.error('User auth fetch error:', userAuthError);
          } else {
            const userEmail = userAuth.user.email;
            const userName = profile?.full_name?.split(' ')[0] || 'there';
            const baseUrl = Deno.env.get('SITE_URL') || 'https://lumacircle.app';

            // For approved action, compute matches
            let matchesHtml = '';
            if (action === 'approved') {
              console.log(`Computing matches for newly approved user ${userId}`);
              const { data: matches, error: matchesError } = await supabaseAdmin
                .rpc('compute_matches', { p_user_id: userId });

              if (matchesError) {
                console.error('Matches computation error:', matchesError);
              } else if (matches && matches.length > 0) {
                // Fetch profile details for top 3 matches
                const topMatches = matches.slice(0, 3);
                const matchUserIds = topMatches.map((m: { matched_user_id: string }) => m.matched_user_id);
                
                const { data: matchProfiles, error: matchProfilesError } = await supabaseAdmin
                  .from('profiles')
                  .select('user_id, full_name, short_bio, job_title, company_name')
                  .in('user_id', matchUserIds);

                if (matchProfilesError) {
                  console.error('Match profiles fetch error:', matchProfilesError);
                } else if (matchProfiles && matchProfiles.length > 0) {
                  // Build matches HTML section
                  matchesHtml = `
                    <div style="margin: 24px 0; padding: 20px; background-color: #f8f4ff; border-radius: 12px;">
                      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #6b21a8;">Your Top Matches</h3>
                      ${matchProfiles.map(mp => {
                        const matchData = topMatches.find((m: { matched_user_id: string; overlapping_tags: string[] }) => m.matched_user_id === mp.user_id);
                        const tags = matchData?.overlapping_tags || [];
                        const firstName = mp.full_name?.split(' ')[0] || 'Member';
                        const role = mp.job_title && mp.company_name 
                          ? `${mp.job_title} at ${mp.company_name}`
                          : mp.job_title || mp.company_name || '';
                        
                        return `
                          <div style="margin-bottom: 16px; padding: 16px; background-color: white; border-radius: 8px; border-left: 4px solid #9333ea;">
                            <p style="margin: 0 0 4px 0; font-weight: 600; color: #1f2937;">${firstName}</p>
                            ${role ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">${role}</p>` : ''}
                            ${mp.short_bio ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">${mp.short_bio}</p>` : ''}
                            ${tags.length > 0 ? `
                              <div style="margin-top: 8px;">
                                ${tags.slice(0, 3).map((tag: string) => `
                                  <span style="display: inline-block; margin: 2px 4px 2px 0; padding: 4px 10px; background-color: #f3e8ff; color: #7c3aed; font-size: 12px; border-radius: 20px;">${tag}</span>
                                `).join('')}
                              </div>
                            ` : ''}
                          </div>
                        `;
                      }).join('')}
                      <a href="${baseUrl}/matches" style="display: inline-block; margin-top: 12px; padding: 12px 24px; background-color: #9333ea; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">View All Matches</a>
                    </div>
                  `;
                  console.log(`Generated matches HTML for ${matchProfiles.length} profiles`);
                }
              } else {
                console.log('No matches found for newly approved user');
              }
            }

            // Prepare placeholders
            const placeholders: Record<string, string> = {
              user_name: userName,
              dashboard_link: `${baseUrl}/dashboard`,
              profile_link: `${baseUrl}/profile`,
              matches_link: `${baseUrl}/matches`,
              rejection_reason: rejectionReason || 'No specific reason provided.',
              matches_section: matchesHtml,
            };

            // Replace placeholders
            let subject = template.subject;
            let bodyHtml = template.body_html;

            Object.entries(placeholders).forEach(([key, value]) => {
              const regex = new RegExp(`{{${key}}}`, 'g');
              subject = subject.replace(regex, value);
              bodyHtml = bodyHtml.replace(regex, value);
            });

            // Send email
            console.log(`Sending ${action} email to ${userEmail}`);
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Luma Circle <onboarding@resend.dev>',
                to: [userEmail],
                subject,
                html: bodyHtml,
              }),
            });

            if (!emailResponse.ok) {
              const errorData = await emailResponse.text();
              console.error('Resend API error:', errorData);
            } else {
              const emailResult = await emailResponse.json();
              console.log('Email sent successfully:', emailResult);
            }
          }
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail the request if email fails
      }
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
