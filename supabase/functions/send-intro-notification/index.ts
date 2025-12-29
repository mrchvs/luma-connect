import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  requestId: string;
  status: "accepted" | "declined";
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-intro-notification function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { requestId, status }: NotificationRequest = await req.json();
    console.log(`Processing notification for request ${requestId} with status ${status}`);

    // Fetch the intro request with related profile information
    const { data: introRequest, error: requestError } = await supabase
      .from("intro_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError || !introRequest) {
      console.error("Error fetching intro request:", requestError);
      throw new Error("Intro request not found");
    }

    // Fetch requester profile
    const { data: requesterProfile, error: requesterError } = await supabase
      .from("profiles")
      .select("full_name, user_id")
      .eq("user_id", introRequest.requester_id)
      .single();

    if (requesterError || !requesterProfile) {
      console.error("Error fetching requester profile:", requesterError);
      throw new Error("Requester profile not found");
    }

    // Fetch helper profile
    const { data: helperProfile, error: helperError } = await supabase
      .from("profiles")
      .select("full_name, user_id")
      .eq("user_id", introRequest.helper_id)
      .single();

    if (helperError || !helperProfile) {
      console.error("Error fetching helper profile:", helperError);
      throw new Error("Helper profile not found");
    }

    // Get requester's email from auth.users
    const { data: requesterAuth, error: requesterAuthError } = await supabase
      .auth.admin.getUserById(introRequest.requester_id);

    if (requesterAuthError || !requesterAuth?.user?.email) {
      console.error("Error fetching requester email:", requesterAuthError);
      throw new Error("Requester email not found");
    }

    const requesterEmail = requesterAuth.user.email;
    const requesterName = requesterProfile.full_name || "there";
    const helperName = helperProfile.full_name || "A member";

    // Prepare email content based on status
    let subject: string;
    let htmlContent: string;

    if (status === "accepted") {
      subject = `Great news! ${helperName} accepted your introduction request`;
      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #10b981; margin-bottom: 24px;">Connection Accepted! 🎉</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hi ${requesterName},
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Great news! <strong>${helperName}</strong> has accepted your introduction request.
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            You can now view their full profile and contact information. Visit the platform to connect!
          </p>
          <div style="margin-top: 32px; padding: 16px; background-color: #f3f4f6; border-radius: 8px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This email was sent because you requested an introduction on our platform.
            </p>
          </div>
        </div>
      `;
    } else {
      subject = `Update on your introduction request`;
      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #6b7280; margin-bottom: 24px;">Request Update</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hi ${requesterName},
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Unfortunately, <strong>${helperName}</strong> was unable to accept your introduction request at this time.
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Don't be discouraged! There are many other members who might be a great fit for what you're looking for. Visit the platform to explore more matches.
          </p>
          <div style="margin-top: 32px; padding: 16px; background-color: #f3f4f6; border-radius: 8px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This email was sent because you requested an introduction on our platform.
            </p>
          </div>
        </div>
      `;
    }

    // Send the email using Resend API directly
    console.log(`Sending ${status} notification email to ${requesterEmail}`);
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Introductions <onboarding@resend.dev>",
        to: [requesterEmail],
        subject,
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    // Also create an in-app notification
    const notificationTitle = status === "accepted" 
      ? `${helperName} accepted your request!`
      : `${helperName} declined your request`;
    
    const notificationBody = status === "accepted"
      ? "You can now view their full profile and contact information."
      : "Check out other matches that might be a good fit.";

    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        user_id: introRequest.requester_id,
        title: notificationTitle,
        body: notificationBody,
        link: status === "accepted" ? `/profile/${introRequest.helper_id}` : "/matches",
      });

    if (notifError) {
      console.error("Error creating in-app notification:", notifError);
      // Don't throw - email was sent successfully
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-intro-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
