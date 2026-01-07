import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { askId, tagIds } = await req.json();

    if (!askId || !tagIds || tagIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing askId or tagIds" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the ask details
    const { data: ask, error: askError } = await supabase
      .from("requests")
      .select("id, title, body, created_by")
      .eq("id", askId)
      .single();

    if (askError || !ask) {
      console.error("Error fetching ask:", askError);
      return new Response(
        JSON.stringify({ error: "Ask not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tags labels
    const { data: tags } = await supabase
      .from("tags")
      .select("id, label")
      .in("id", tagIds);

    const tagLabels = tags?.map((t) => t.label) || [];

    // Find mentors with expertise matching the ask topics
    // Look in mentor_profiles.expertise_areas which contains tag labels
    const { data: mentorProfiles, error: mentorError } = await supabase
      .from("mentor_profiles")
      .select("user_id, expertise_areas")
      .eq("is_active", true)
      .eq("is_complete", true)
      .neq("user_id", ask.created_by); // Exclude the ask author

    if (mentorError) {
      console.error("Error fetching mentors:", mentorError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch mentors" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter mentors whose expertise overlaps with ask topics
    const matchingMentors = mentorProfiles?.filter((mentor) => {
      const expertise = mentor.expertise_areas || [];
      return tagLabels.some((tagLabel) =>
        expertise.some((exp: string) =>
          exp.toLowerCase().includes(tagLabel.toLowerCase()) ||
          tagLabel.toLowerCase().includes(exp.toLowerCase())
        )
      );
    }) || [];

    if (matchingMentors.length === 0) {
      console.log("No matching mentors found for ask:", askId);
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check which mentors haven't been notified about this ask yet
    const mentorUserIds = matchingMentors.map((m) => m.user_id);

    // Create notifications for matching mentors
    const notifications = mentorUserIds.map((userId) => ({
      user_id: userId,
      title: "New Ask matches your expertise",
      body: ask.title
        ? `"${ask.title}" - A new community ask relates to your areas of expertise.`
        : `A new community ask relates to your areas of expertise. Check it out and offer your help!`,
      link: `/community-asks/${askId}`,
    }));

    const { error: notifyError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (notifyError) {
      console.error("Error creating notifications:", notifyError);
      return new Response(
        JSON.stringify({ error: "Failed to create notifications" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Notified ${notifications.length} mentors about ask ${askId}`);

    return new Response(
      JSON.stringify({ success: true, notified: notifications.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-mentors-ask:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
