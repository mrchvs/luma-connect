import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface InviteRequest {
  action: "send_invite" | "bulk_invite" | "invite_user" | "bulk_invite_users" | "delete_user" | "list_invitations" | "resend_invite" | "cancel_invite" | "validate_invite" | "accept_invite" | "member_referral" | "send_momentum_invite";
  email?: string;
  emails?: string[];
  invitationId?: string;
  token?: string;
  note?: string;
  metadata?: { cycle_id?: string; cycle_name?: string };
}

async function getEmailTemplate(supabase: any): Promise<{ subject: string; body_html: string } | null> {
  try {
    const { data } = await supabase
      .from("email_templates")
      .select("subject, body_html")
      .eq("template_key", "member_invitation")
      .single();
    return data;
  } catch {
    return null;
  }
}

async function sendInvitationEmail(
  supabase: any,
  toEmail: string,
  inviterEmail: string,
  inviteToken: string
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set");
    return false;
  }

  const appUrl = Deno.env.get("APP_URL") || "https://luma-connect-flow.lovable.app";
  const inviteLink = `${appUrl}/auth?invite=${inviteToken}`;

  // Try to get custom template
  const template = await getEmailTemplate(supabase);
  
  let subject = "You've been invited to join!";
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px;">You're Invited!</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          ${inviterEmail} has invited you to join our community. Click the button below to create your account and get started.
        </p>
        <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Accept Invitation
        </a>
        <p style="color: #9ca3af; font-size: 14px; margin-top: 32px;">
          This invitation will expire in 7 days. If you didn't expect this email, you can safely ignore it.
        </p>
      </div>
    </body>
    </html>
  `;

  if (template) {
    subject = template.subject
      .replace(/\{\{inviter_email\}\}/g, inviterEmail)
      .replace(/\{\{invite_link\}\}/g, inviteLink)
      .replace(/\{\{invitee_email\}\}/g, toEmail);
    html = template.body_html
      .replace(/\{\{inviter_email\}\}/g, inviterEmail)
      .replace(/\{\{invite_link\}\}/g, inviteLink)
      .replace(/\{\{invitee_email\}\}/g, toEmail);
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") || "Lovable App <onboarding@resend.dev>",
        to: [toEmail],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to send invitation email:", errorText);
      return false;
    }

    console.log("Invitation email sent successfully to:", toEmail);
    return true;
  } catch (error) {
    console.error("Error sending invitation email:", error);
    return false;
  }
}

async function logAuditAction(
  supabase: any,
  adminUserId: string,
  adminEmail: string,
  actionType: string,
  targetIdentifier: string,
  details: Record<string, unknown>
) {
  try {
    await supabase.from("admin_audit_logs").insert({
      admin_user_id: adminUserId,
      admin_email: adminEmail,
      action_type: actionType,
      target_identifier: targetIdentifier,
      details,
    });
  } catch (err) {
    console.error("Failed to log audit action:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: InviteRequest = await req.json();
    const { action } = body;

    // Create service role client for operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Public actions that don't require admin auth
    if (action === "validate_invite") {
      const { token } = body;
      if (!token) {
        return new Response(JSON.stringify({ error: "Token is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: invitation, error } = await supabaseAdmin
        .from("invitations")
        .select("id, email, status, expires_at")
        .eq("token", token)
        .single();

      if (error || !invitation) {
        return new Response(JSON.stringify({ valid: false, error: "Invalid invitation" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isExpired = new Date(invitation.expires_at) < new Date();
      if (invitation.status !== "pending" || isExpired) {
        return new Response(JSON.stringify({ 
          valid: false, 
          error: invitation.status === "accepted" ? "Invitation already used" : "Invitation has expired" 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ 
        valid: true, 
        email: invitation.email,
        invitationId: invitation.id 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "accept_invite") {
      const { token } = body;
      if (!token) {
        return new Response(JSON.stringify({ error: "Token is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: invitation, error: fetchError } = await supabaseAdmin
        .from("invitations")
        .select("id, email, status, expires_at")
        .eq("token", token)
        .single();

      if (fetchError || !invitation) {
        return new Response(JSON.stringify({ error: "Invalid invitation" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isExpired = new Date(invitation.expires_at) < new Date();
      if (invitation.status !== "pending" || isExpired) {
        return new Response(JSON.stringify({ error: "Invitation is no longer valid" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark invitation as accepted
      const { error: updateError } = await supabaseAdmin
        .from("invitations")
        .update({ 
          status: "accepted", 
          accepted_at: new Date().toISOString() 
        })
        .eq("id", invitation.id);

      if (updateError) {
        console.error("Failed to update invitation:", updateError);
        return new Response(JSON.stringify({ error: "Failed to accept invitation" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Invitation accepted for:", invitation.email);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Member referral action - requires authenticated user but not admin
    if (action === "member_referral") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user is approved
      const { data: userProfile } = await supabaseAdmin
        .from("profiles")
        .select("status")
        .eq("user_id", user.id)
        .single();

      if (userProfile?.status !== "approved") {
        return new Response(JSON.stringify({ error: "Only approved members can send referrals" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { email, note } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check rate limit
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyReferrals } = await supabaseAdmin
        .from("invitations")
        .select("id")
        .eq("invited_by_user_id", user.id)
        .eq("source", "member")
        .gte("created_at", startOfMonth.toISOString());

      const { data: limitSetting } = await supabaseAdmin
        .from("security_settings")
        .select("setting_value")
        .eq("setting_key", "referrals_per_member_per_month")
        .single();

      const limit = typeof limitSetting?.setting_value === "number" ? limitSetting.setting_value : 3;

      if ((monthlyReferrals?.length || 0) >= limit) {
        return new Response(JSON.stringify({ error: `Monthly referral limit (${limit}) reached` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user already exists (is already a member)
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = existingUser?.users?.some((u) => u.email === email.toLowerCase());
      if (userExists) {
        return new Response(JSON.stringify({ 
          error: "This email is already associated with an existing member profile. They are already part of the community!"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for existing pending invitation
      const { data: existingInvite } = await supabaseAdmin
        .from("invitations")
        .select("id")
        .eq("email", email.toLowerCase())
        .eq("status", "pending")
        .single();

      if (existingInvite) {
        return new Response(JSON.stringify({ error: "An invitation is already pending for this email" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete any expired/cancelled invitations for this email to prevent unique constraint violations
      await supabaseAdmin
        .from("invitations")
        .delete()
        .eq("email", email.toLowerCase())
        .in("status", ["expired", "cancelled"]);

      // Create invitation with member source
      const { data: invitation, error: insertError } = await supabaseAdmin
        .from("invitations")
        .insert({
          email: email.toLowerCase(),
          invited_by: user.id,
          invited_by_email: user.email,
          invited_by_user_id: user.id,
          source: "member",
          note: note || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Send invitation email
      const emailSent = await sendInvitationEmail(supabaseAdmin, email, user.email!, invitation.token);

      console.log("Member referral created:", { email, by: user.email, emailSent });

      return new Response(
        JSON.stringify({
          success: true,
          message: emailSent ? "Referral sent successfully" : "Referral created but email failed to send",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin-only actions require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user client to verify admin
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin or owner role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "owner"])
      .limit(1);

    if (!roleData || roleData.length === 0) {
      console.log("User does not have admin/owner role:", user.id);
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log("User authorized with role:", roleData[0].role);

    if (action === "list_invitations") {
      const { data: invitations, error } = await supabaseAdmin
        .from("invitations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return new Response(JSON.stringify({ invitations }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send_invite") {
      const { email } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(JSON.stringify({ error: "Invalid email format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user already exists (is already a member)
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = existingUser?.users?.some((u) => u.email === email.toLowerCase());
      if (userExists) {
        return new Response(JSON.stringify({ 
          error: "This email is already associated with an existing member profile. They are already part of the community!"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for existing pending invitation
      const { data: existingInvite } = await supabaseAdmin
        .from("invitations")
        .select("id")
        .eq("email", email.toLowerCase())
        .eq("status", "pending")
        .single();

      if (existingInvite) {
        return new Response(JSON.stringify({ error: "An invitation is already pending for this email" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete any expired/cancelled invitations for this email to prevent unique constraint violations
      await supabaseAdmin
        .from("invitations")
        .delete()
        .eq("email", email.toLowerCase())
        .in("status", ["expired", "cancelled"]);

      // Create invitation
      const { data: invitation, error: insertError } = await supabaseAdmin
        .from("invitations")
        .insert({
          email: email.toLowerCase(),
          invited_by: user.id,
          invited_by_email: user.email,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Send invitation email
      const emailSent = await sendInvitationEmail(supabaseAdmin, email, user.email!, invitation.token);

      // Log audit action
      await logAuditAction(supabaseAdmin, user.id, user.email!, "invite_member", email, {
        invitation_id: invitation.id,
        email_sent: emailSent,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: emailSent ? "Invitation sent successfully" : "Invitation created but email failed to send",
          invitation,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "bulk_invite") {
      const { emails } = body;
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return new Response(JSON.stringify({ error: "Emails array is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (emails.length > 50) {
        return new Response(JSON.stringify({ error: "Maximum 50 emails per bulk invite" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const results: { email: string; success: boolean; error?: string }[] = [];

      // Get existing users
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingEmails = new Set(existingUsers?.users?.map((u) => u.email?.toLowerCase()) || []);

      // Get existing pending invitations
      const { data: existingInvites } = await supabaseAdmin
        .from("invitations")
        .select("email")
        .eq("status", "pending");
      const pendingEmails = new Set(existingInvites?.map((i) => i.email.toLowerCase()) || []);

      for (const email of emails) {
        const normalizedEmail = email.trim().toLowerCase();

        if (!emailRegex.test(normalizedEmail)) {
          results.push({ email: normalizedEmail, success: false, error: "Invalid email format" });
          continue;
        }

        if (existingEmails.has(normalizedEmail)) {
          results.push({ email: normalizedEmail, success: false, error: "User already exists" });
          continue;
        }

        if (pendingEmails.has(normalizedEmail)) {
          results.push({ email: normalizedEmail, success: false, error: "Invitation already pending" });
          continue;
        }

        try {
          const { data: invitation, error: insertError } = await supabaseAdmin
            .from("invitations")
            .insert({
              email: normalizedEmail,
              invited_by: user.id,
              invited_by_email: user.email,
            })
            .select()
            .single();

          if (insertError) {
            results.push({ email: normalizedEmail, success: false, error: insertError.message });
            continue;
          }

          const emailSent = await sendInvitationEmail(supabaseAdmin, normalizedEmail, user.email!, invitation.token);
          results.push({ email: normalizedEmail, success: true });
          pendingEmails.add(normalizedEmail);

          // Log audit action for each invite
          await logAuditAction(supabaseAdmin, user.id, user.email!, "bulk_invite_member", normalizedEmail, {
            invitation_id: invitation.id,
            email_sent: emailSent,
          });
        } catch (err: any) {
          results.push({ email: normalizedEmail, success: false, error: err.message });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      return new Response(
        JSON.stringify({
          success: true,
          message: `Sent ${successCount} invitation${successCount !== 1 ? "s" : ""}${failCount > 0 ? `, ${failCount} failed` : ""}`,
          results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "resend_invite") {
      const { invitationId } = body;
      if (!invitationId) {
        return new Response(JSON.stringify({ error: "Invitation ID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get invitation
      const { data: invitation, error: fetchError } = await supabaseAdmin
        .from("invitations")
        .select("*")
        .eq("id", invitationId)
        .single();

      if (fetchError || !invitation) {
        return new Response(JSON.stringify({ error: "Invitation not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update expiration and generate new token
      const { data: updatedInvite, error: updateError } = await supabaseAdmin
        .from("invitations")
        .update({
          token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "pending",
        })
        .eq("id", invitationId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Resend email
      const emailSent = await sendInvitationEmail(supabaseAdmin, invitation.email, user.email!, updatedInvite.token);

      // Log audit action
      await logAuditAction(supabaseAdmin, user.id, user.email!, "resend_invite", invitation.email, {
        invitation_id: invitationId,
        email_sent: emailSent,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: emailSent ? "Invitation resent successfully" : "Invitation updated but email failed to send",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "cancel_invite") {
      const { invitationId } = body;
      if (!invitationId) {
        return new Response(JSON.stringify({ error: "Invitation ID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get invitation for audit log
      const { data: invitation } = await supabaseAdmin
        .from("invitations")
        .select("email, status")
        .eq("id", invitationId)
        .single();

      if (!invitation) {
        return new Response(JSON.stringify({ error: "Invitation not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete the invitation instead of updating status to avoid unique constraint issues
      const { error: deleteError } = await supabaseAdmin
        .from("invitations")
        .delete()
        .eq("id", invitationId);

      if (deleteError) throw deleteError;

      // Log audit action
      await logAuditAction(supabaseAdmin, user.id, user.email!, "cancel_invite", invitation?.email || invitationId, {
        invitation_id: invitationId,
        previous_status: invitation.status,
      });

      return new Response(
        JSON.stringify({ success: true, message: "Invitation cancelled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete_user") {
      const { userId } = body as any;
      if (!userId) {
        return new Response(JSON.stringify({ success: false, error: "userId is required" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user email before deletion (needed to clean up email-keyed records)
      const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId);
      const userEmail = authUser?.email;

      // Delete related data first to avoid FK constraint errors
      const tables = [
        "ask_response_upvotes",
        "ask_responses",
        "accountability_weekly_reflections",
        "accountability_weekly_entries",
        "accountability_monthly_goals",
        "notifications",
        "user_roles",
        "profile_needs",
        "profile_offers",
        "profile_tags",
        "profile_contacts",
        "profiles",
      ];
      for (const table of tables) {
        await supabaseAdmin.from(table).delete().eq("user_id", userId);
      }
      // cycle_members can have user_id=NULL (invited but never signed up) — delete by email too
      if (userEmail) {
        await supabaseAdmin.from("accountability_cycle_members").delete().ilike("email", userEmail);
      } else {
        await supabaseAdmin.from("accountability_cycle_members").delete().eq("user_id", userId);
      }
      // requests use created_by
      await supabaseAdmin.from("requests").delete().eq("created_by", userId);

      // Now delete the auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) {
        return new Response(JSON.stringify({ success: false, error: deleteError.message }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ success: true, message: "User deleted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "invite_user") {
      const { email } = body;
      if (!email) {
        return new Response(JSON.stringify({ success: false, error: "Email is required" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const appUrl = Deno.env.get("APP_URL") || "https://luma-connect-flow.lovable.app";

      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

      if (existingUser) {
        return new Response(JSON.stringify({ success: false, error: "This email already has an account on LumaCircle." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${appUrl}/onboarding`,
      });

      if (inviteError) {
        return new Response(JSON.stringify({ success: false, error: inviteError.message }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: "Invite email sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "bulk_invite_users") {
      const { emails } = body;
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return new Response(JSON.stringify({ error: "Emails array is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const appUrl = Deno.env.get("APP_URL") || "https://luma-connect-flow.lovable.app";
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingEmails = new Set(existingUsers?.users?.map((u) => u.email?.toLowerCase()) ?? []);

      const results: { email: string; success: boolean; error?: string }[] = [];

      for (const email of emails) {
        const normalized = email.trim().toLowerCase();
        if (existingEmails.has(normalized)) {
          results.push({ email: normalized, success: false, error: "Already a member" });
          continue;
        }
        const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(normalized, {
          redirectTo: `${appUrl}/onboarding`,
        });
        if (inviteError) {
          results.push({ email: normalized, success: false, error: inviteError.message });
        } else {
          results.push({ email: normalized, success: true });
          existingEmails.add(normalized);
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      return new Response(
        JSON.stringify({
          success: true,
          message: `Sent ${successCount} invitation${successCount !== 1 ? "s" : ""}${failCount > 0 ? `, ${failCount} failed` : ""}`,
          results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "send_momentum_invite") {
      const { email, metadata } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const appUrl = Deno.env.get("APP_URL") || "https://luma-connect-flow.lovable.app";
      const cycleName = metadata?.cycle_name ?? "Monday Momentum";

      // Check if user already exists in auth
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

      let emailSent = false;

      if (existingUser) {
        // Existing member — send a magic link email so they get an actual email
        const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${appUrl}/accountability`,
            shouldCreateUser: false,
          },
        });

        // Also send in-app notification
        await supabaseAdmin.from("notifications").insert({
          user_id: existingUser.id,
          title: `You've been added to ${cycleName}!`,
          body: "Set your monthly goal to get started with your accountability cohort.",
          link: "/accountability",
        });

        emailSent = !otpError;
        if (otpError) console.error("OTP email error:", otpError.message);
      } else {
        // New user — magic-link invite; after signup they complete onboarding
        // then ?from=momentum redirects them straight to set their monthly goal
        const redirectTo = `${appUrl}/onboarding?from=momentum`;
        const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: {
            cycle_id: metadata?.cycle_id,
            cycle_name: cycleName,
            invited_to_momentum: true,
          },
        });
        if (inviteError) {
          console.error("inviteUserByEmail error:", inviteError.message);
        } else {
          emailSent = true;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: emailSent
            ? existingUser ? "In-app notification sent to existing member" : "Invite email sent via Supabase"
            : "Participant added (email delivery failed)",
          existing_user: !!existingUser,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in admin-invite-member:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
