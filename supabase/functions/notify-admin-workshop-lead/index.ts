import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadBody {
  firstName: string;
  lastName: string;
  email: string;
  source: string; // human-readable resource/workshop name
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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Recipients: the founder inbox is always notified, plus any admins/owners.
    const recipients = new Set<string>(["hello@lumacircle.co"]);
    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "owner"]);
    for (const a of adminRoles ?? []) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(a.user_id);
      if (data?.user?.email) recipients.add(data.user.email);
    }

    const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Someone";
    const baseUrl = Deno.env.get("SITE_URL") || "https://lumacircle.co";
    const subject = `New lead: ${fullName} accessed “${source}”`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px; background-color: #FAF6F0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-family: Georgia, serif; color: #1a1a1a; font-size: 26px; font-weight: normal; margin: 0;">Luma Circle</h1>
        </div>
        <div style="background-color: #ffffff; border-radius: 14px; padding: 28px;">
          <h2 style="color: #E5602B; margin: 0 0 16px; font-size: 20px;">New lead 🎉</h2>
          <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
            Someone just entered their details to access a resource.
          </p>
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
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
          Admin notification from Luma Circle.
        </p>
      </div>
    `;

    const brandedFrom = Deno.env.get("RESEND_FROM_EMAIL") || "Luma Circle <hello@lumacircle.co>";

    // Try the branded sender first; if the custom domain isn't verified in Resend
    // yet, fall back to Resend's shared domain (delivers to the account-owner inbox).
    let send = await sendViaResend(resendApiKey, brandedFrom, Array.from(recipients), email, subject, html);
    if (!send.ok && send.status === 403 && /not verified/i.test(String((send.result as any)?.message ?? ""))) {
      console.warn("Custom domain not verified in Resend — falling back to onboarding@resend.dev");
      send = await sendViaResend(resendApiKey, "Luma Circle <onboarding@resend.dev>", ["hello@lumacircle.co"], email, subject, html);
    }

    if (!send.ok) {
      console.error("Resend error:", send.result);
      return new Response(JSON.stringify({ error: "Failed to send notification" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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
