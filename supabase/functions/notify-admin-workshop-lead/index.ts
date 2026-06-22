import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generic admin lead notifier — used by both the workshop gate pages and the
// hero "Apply to join" capture. Notifies via email, Slack and in-app, each
// channel best-effort so one failing never blocks the others.
interface LeadBody {
  firstName?: string;
  lastName?: string;
  email: string;
  source: string; // human-readable lead source / resource name
}

async function sendViaResend(
  apiKey: string,
  from: string,
  to: string[],
  replyTo: string,
  subject: string,
  html: string,
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, reply_to: replyTo, to, subject, html }),
  });
  const result = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, result };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { firstName, lastName, email, source }: LeadBody = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Someone";
    const baseUrl = Deno.env.get("SITE_URL") || "https://lumacircle.co";

    // Admin/owner users → recipients for email + in-app notifications.
    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "owner"]);
    const adminIds = (adminRoles ?? []).map((a: { user_id: string }) => a.user_id);

    const channels = { email: false, slack: false, inApp: false };

    // ---- 1. Email (Resend) ----
    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const recipients = new Set<string>(["hello@lumacircle.co"]);
        for (const id of adminIds) {
          const { data } = await supabaseAdmin.auth.admin.getUserById(id);
          if (data?.user?.email) recipients.add(data.user.email);
        }
        const subject = `New lead: ${fullName} — ${source}`;
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px; background-color: #FAF6F0;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="font-family: Georgia, serif; color: #1a1a1a; font-size: 26px; font-weight: normal; margin: 0;">Luma Circle</h1>
            </div>
            <div style="background-color: #ffffff; border-radius: 14px; padding: 28px;">
              <h2 style="color: #E5602B; margin: 0 0 16px; font-size: 20px;">New lead 🎉</h2>
              <div style="background-color: #FAF6F0; border-radius: 10px; padding: 16px; margin: 0 0 20px;">
                <p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0;">
                  <strong>Name:</strong> ${fullName}<br>
                  <strong>Email:</strong> ${email}<br>
                  <strong>Source:</strong> ${source}
                </p>
              </div>
              <div style="text-align: center;">
                <a href="${baseUrl}/admin/leads" style="display: inline-block; background: #E5602B; color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 14px;">View all leads</a>
              </div>
            </div>
          </div>
        `;
        const brandedFrom = Deno.env.get("RESEND_FROM_EMAIL") || "Luma Circle <hello@lumacircle.co>";
        let send = await sendViaResend(resendApiKey, brandedFrom, Array.from(recipients), email, subject, html);
        // Fall back to Resend's shared domain until lumacircle.co is verified.
        if (!send.ok && send.status === 403 && /not verified/i.test(String((send.result as any)?.message ?? ""))) {
          send = await sendViaResend(resendApiKey, "Luma Circle <onboarding@resend.dev>", ["hello@lumacircle.co"], email, subject, html);
        }
        channels.email = send.ok;
        if (!send.ok) console.error("Resend error:", send.result);
      } else {
        console.warn("RESEND_API_KEY not configured — skipping email");
      }
    } catch (e) {
      console.error("Email channel failed:", e);
    }

    // ---- 2. Slack (incoming webhook) ----
    try {
      const slackUrl = Deno.env.get("SLACK_WEBHOOK_URL");
      if (slackUrl) {
        const res = await fetch(slackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `🎉 *New lead*\n*Name:* ${fullName}\n*Email:* ${email}\n*Source:* ${source}`,
          }),
        });
        channels.slack = res.ok;
        if (!res.ok) console.error("Slack webhook error:", res.status, await res.text().catch(() => ""));
      } else {
        console.warn("SLACK_WEBHOOK_URL not configured — skipping Slack");
      }
    } catch (e) {
      console.error("Slack channel failed:", e);
    }

    // ---- 3. In-app notifications (one per admin/owner) ----
    try {
      if (adminIds.length > 0) {
        const rows = adminIds.map((id: string) => ({
          user_id: id,
          title: "New lead 🎉",
          body: `${fullName} (${email}) — ${source}`,
          link: "/admin/leads",
        }));
        const { error } = await supabaseAdmin.from("notifications").insert(rows);
        channels.inApp = !error;
        if (error) console.error("In-app notification error:", error);
      }
    } catch (e) {
      console.error("In-app channel failed:", e);
    }

    return new Response(JSON.stringify({ success: true, channels }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-admin-workshop-lead error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
