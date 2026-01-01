import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WaitlistRequest {
  email: string;
  userId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Waitlist confirmation function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, userId }: WaitlistRequest = await req.json();
    console.log("Processing waitlist signup for:", email);

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Insert into waitlist
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: insertError } = await supabaseClient
      .from("matching_waitlist")
      .insert({
        email: email.toLowerCase().trim(),
        user_id: userId || null,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        console.log("Email already on waitlist:", email);
        return new Response(
          JSON.stringify({ success: true, message: "Already on waitlist" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      throw insertError;
    }

    // Send confirmation email
    const emailResponse = await resend.emails.send({
      from: Deno.env.get("RESEND_FROM_EMAIL") || "Luma Circle <onboarding@resend.dev>",
      to: [email],
      subject: "You're on the Smart Matching Waitlist! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7c3aed; margin-bottom: 10px;">You're on the list!</h1>
          </div>
          
          <p>Hi there,</p>
          
          <p>Thank you for joining the Smart Matching waitlist! We're thrilled to have you.</p>
          
          <p>Smart Matching is our intelligent algorithm that connects you with women who have exactly what you need—and finds those who need what you offer. No more endless scrolling or awkward networking.</p>
          
          <div style="background: linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%); padding: 20px; border-radius: 12px; margin: 24px 0;">
            <h3 style="color: #7c3aed; margin-top: 0;">What to expect:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>We'll notify you as soon as Smart Matching goes live</li>
              <li>Early access for waitlist members</li>
              <li>Your needs matched with others' expertise</li>
            </ul>
          </div>
          
          <p>In the meantime, make sure your profile is complete so you're ready to get matched!</p>
          
          <p style="margin-top: 30px;">
            Warmly,<br>
            <strong>The Luma Circle Team</strong>
          </p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #666; font-size: 12px;">
            <p>You received this email because you signed up for the Smart Matching waitlist.</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Confirmation email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Added to waitlist and confirmation sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in waitlist-confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
