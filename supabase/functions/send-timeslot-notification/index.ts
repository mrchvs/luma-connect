import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TimeSlotNotificationRequest {
  timeSlotId: string;
  type: "proposed" | "accepted";
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-timeslot-notification function invoked");

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

    const { timeSlotId, type }: TimeSlotNotificationRequest = await req.json();
    console.log(`Processing ${type} notification for time slot ${timeSlotId}`);

    // Fetch the time slot
    const { data: timeSlot, error: timeSlotError } = await supabase
      .from("proposed_time_slots")
      .select("*")
      .eq("id", timeSlotId)
      .single();

    if (timeSlotError || !timeSlot) {
      console.error("Error fetching time slot:", timeSlotError);
      throw new Error("Time slot not found");
    }

    // Fetch the intro request
    const { data: introRequest, error: requestError } = await supabase
      .from("intro_requests")
      .select("*")
      .eq("id", timeSlot.intro_request_id)
      .single();

    if (requestError || !introRequest) {
      console.error("Error fetching intro request:", requestError);
      throw new Error("Intro request not found");
    }

    // Determine who to notify
    let recipientId: string;
    let senderId: string;
    
    if (type === "proposed") {
      // Notify the other party
      recipientId = timeSlot.proposed_by === introRequest.requester_id 
        ? introRequest.helper_id 
        : introRequest.requester_id;
      senderId = timeSlot.proposed_by;
    } else {
      // Accepted - notify the person who proposed
      recipientId = timeSlot.proposed_by;
      senderId = timeSlot.proposed_by === introRequest.requester_id 
        ? introRequest.helper_id 
        : introRequest.requester_id;
    }

    // Fetch sender profile
    const { data: senderProfile, error: senderError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", senderId)
      .single();

    if (senderError || !senderProfile) {
      console.error("Error fetching sender profile:", senderError);
      throw new Error("Sender profile not found");
    }

    // Get recipient email
    const { data: recipientAuth, error: recipientAuthError } = await supabase
      .auth.admin.getUserById(recipientId);

    if (recipientAuthError || !recipientAuth?.user?.email) {
      console.error("Error fetching recipient email:", recipientAuthError);
      throw new Error("Recipient email not found");
    }

    const recipientEmail = recipientAuth.user.email;
    const senderName = senderProfile.full_name?.split(" ")[0] || "A member";
    
    // Format the time slot
    const startTime = new Date(timeSlot.start_time);
    const formattedDate = startTime.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const formattedTime = startTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const duration = timeSlot.duration_minutes;

    const baseUrl = Deno.env.get("SITE_URL") || "https://lumacircle.app";
    const requestsLink = `${baseUrl}/requests`;

    let subject: string;
    let bodyHtml: string;

    if (type === "proposed") {
      subject = `${senderName} proposed a meeting time`;
      bodyHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9fafb; }
            .container { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); padding: 32px; text-align: center; }
            .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 32px; }
            .time-card { background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .time-card .date { font-size: 18px; font-weight: 600; color: #111827; }
            .time-card .time { font-size: 16px; color: #6b7280; margin-top: 4px; }
            .button { display: inline-block; background: #7c3aed; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px; }
            .footer { padding: 24px; text-align: center; color: #9ca3af; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Time Proposal</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p><strong>${senderName}</strong> has proposed a time for your call:</p>
              <div class="time-card">
                <div class="date">${formattedDate}</div>
                <div class="time">${formattedTime} · ${duration} minutes</div>
              </div>
              <p>If this works for you, head over to accept it. Or propose your own times instead.</p>
              <div style="text-align: center;">
                <a href="${requestsLink}" class="button">View & Respond</a>
              </div>
            </div>
            <div class="footer">
              © ${new Date().getFullYear()} Luma Circle · Building meaningful connections
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      // Generate calendar links for the accepted time slot
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
      const googleCalendarUrl = generateGoogleCalendarUrl(
        `Luma Circle Call with ${senderName}`,
        startTime,
        endTime,
        "Connection call via Luma Circle"
      );
      const outlookCalendarUrl = generateOutlookCalendarUrl(
        `Luma Circle Call with ${senderName}`,
        startTime,
        endTime,
        "Connection call via Luma Circle"
      );

      subject = `${senderName} confirmed your meeting time!`;
      bodyHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9fafb; }
            .container { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #059669 0%, #34d399 100%); padding: 32px; text-align: center; }
            .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 32px; }
            .time-card { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .time-card .date { font-size: 18px; font-weight: 600; color: #065f46; }
            .time-card .time { font-size: 16px; color: #047857; margin-top: 4px; }
            .calendar-buttons { text-align: center; margin-top: 24px; }
            .calendar-btn { display: inline-block; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 4px; font-size: 14px; }
            .google-btn { background: #4285f4; color: #fff; }
            .outlook-btn { background: #0078d4; color: #fff; }
            .footer { padding: 24px; text-align: center; color: #9ca3af; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Meeting Confirmed! 🎉</h1>
            </div>
            <div class="content">
              <p>Great news!</p>
              <p><strong>${senderName}</strong> has confirmed your proposed meeting time:</p>
              <div class="time-card">
                <div class="date">${formattedDate}</div>
                <div class="time">${formattedTime} · ${duration} minutes</div>
              </div>
              <p>Add this to your calendar so you don't miss it:</p>
              <div class="calendar-buttons">
                <a href="${googleCalendarUrl}" class="calendar-btn google-btn" target="_blank">Add to Google Calendar</a>
                <a href="${outlookCalendarUrl}" class="calendar-btn outlook-btn" target="_blank">Add to Outlook</a>
              </div>
              <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
                You can exchange contact details on <a href="${requestsLink}" style="color: #7c3aed;">your requests page</a>.
              </p>
            </div>
            <div class="footer">
              © ${new Date().getFullYear()} Luma Circle · Building meaningful connections
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // Send the email
    console.log(`Sending ${type} notification email to ${recipientEmail}`);
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") || "Luma Circle <onboarding@resend.dev>",
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
    const notificationTitle = type === "proposed" 
      ? `${senderName} proposed a meeting time`
      : `${senderName} confirmed your meeting!`;
    const notificationBody = type === "proposed"
      ? `${formattedDate} at ${formattedTime}`
      : `Your call is scheduled for ${formattedDate} at ${formattedTime}`;

    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        user_id: recipientId,
        title: notificationTitle,
        body: notificationBody,
        link: "/requests",
      });

    if (notifError) {
      console.error("Error creating in-app notification:", notifError);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-timeslot-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

// Helper function to generate Google Calendar URL
function generateGoogleCalendarUrl(
  title: string,
  startTime: Date,
  endTime: Date,
  description: string
): string {
  const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatDate(startTime)}/${formatDate(endTime)}`,
    details: description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Helper function to generate Outlook Calendar URL
function generateOutlookCalendarUrl(
  title: string,
  startTime: Date,
  endTime: Date,
  description: string
): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    startdt: startTime.toISOString(),
    enddt: endTime.toISOString(),
    body: description,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

serve(handler);
