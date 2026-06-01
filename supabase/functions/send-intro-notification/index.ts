import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  requestId: string;
  type: "new_request" | "accepted" | "declined";
}

// Helper function to log activity events
async function logActivity(
  supabase: any,
  userId: string,
  eventType: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.from('activity_events').insert({
      user_id: userId,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata,
    });
    console.log(`Activity logged: ${eventType} for user ${userId}`);
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-intro-notification function invoked");

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

    const { requestId, type }: NotificationRequest = await req.json();
    console.log(`Processing ${type} notification for request ${requestId}`);

    // Fetch the intro request
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
      .select("full_name, city, country, user_id")
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

    // Log activity based on type
    const activityMap: Record<string, { userId: string; eventType: string }> = {
      new_request: { userId: introRequest.requester_id, eventType: 'intro_requested' },
      accepted: { userId: introRequest.helper_id, eventType: 'intro_accepted' },
      declined: { userId: introRequest.helper_id, eventType: 'intro_declined' },
    };
    
    const activityInfo = activityMap[type];
    await logActivity(supabase, activityInfo.userId, activityInfo.eventType, 'intro_request', requestId, {
      requester_id: introRequest.requester_id,
      helper_id: introRequest.helper_id,
      requester_name: requesterProfile.full_name,
      helper_name: helperProfile.full_name,
    });

    // Determine template key based on type
    let templateKey: string;
    let recipientId: string;
    
    if (type === "new_request") {
      templateKey = "new_intro_request";
      recipientId = introRequest.helper_id;
    } else if (type === "accepted") {
      templateKey = "intro_request_accepted";
      recipientId = introRequest.requester_id;
    } else {
      templateKey = "intro_request_declined";
      recipientId = introRequest.requester_id;
    }

    // Fetch the email template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("template_key", templateKey)
      .single();

    if (templateError || !template) {
      console.error("Error fetching email template:", templateError);
      throw new Error(`Email template '${templateKey}' not found`);
    }

    // Get recipient email
    const { data: recipientAuth, error: recipientAuthError } = await supabase
      .auth.admin.getUserById(recipientId);

    if (recipientAuthError || !recipientAuth?.user?.email) {
      console.error("Error fetching recipient email:", recipientAuthError);
      throw new Error("Recipient email not found");
    }

    const recipientEmail = recipientAuth.user.email;
    const requesterName = requesterProfile.full_name?.split(" ")[0] || "Someone";
    const helperName = helperProfile.full_name?.split(" ")[0] || "A member";
    const requesterLocation = [requesterProfile.city, requesterProfile.country].filter(Boolean).join(", ") || "Unknown";

    const baseUrl = Deno.env.get("SITE_URL") || "https://lumacircle.app";

    // Prepare placeholder values
    const placeholders: Record<string, string> = {
      requester_name: requesterName,
      helper_name: helperName,
      requester_location: requesterLocation,
      request_message: introRequest.message || "",
      profile_link: `${baseUrl}/profile/${introRequest.helper_id}`,
      matches_link: `${baseUrl}/matches`,
      requests_link: `${baseUrl}/requests`,
    };

    // Replace placeholders in subject and body
    let subject = template.subject;
    let bodyHtml = template.body_html;

    Object.entries(placeholders).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      subject = subject.replace(regex, value);
      bodyHtml = bodyHtml.replace(regex, value);
    });

    // Send the email
    console.log(`Sending ${type} notification email to ${recipientEmail}`);
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") || "LumaCircle <hello@lumacircle.co>",
        reply_to: "hello@lumacircle.co",
        to: [recipientEmail],
        subject,
        html: bodyHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    // Create in-app notification
    let notificationTitle: string;
    let notificationBody: string;
    let notificationLink: string;

    if (type === "new_request") {
      notificationTitle = `${requesterName} wants to connect!`;
      notificationBody = "You have a new introduction request.";
      notificationLink = "/requests";
    } else if (type === "accepted") {
      notificationTitle = `${helperName} accepted your request!`;
      notificationBody = "You can now view their full profile and contact information.";
      notificationLink = `/profile/${introRequest.helper_id}`;
    } else {
      notificationTitle = `${helperName} declined your request`;
      notificationBody = "Check out other matches that might be a good fit.";
      notificationLink = "/matches";
    }

    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        user_id: recipientId,
        title: notificationTitle,
        body: notificationBody,
        link: notificationLink,
      });

    if (notifError) {
      console.error("Error creating in-app notification:", notifError);
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
