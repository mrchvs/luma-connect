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

    console.log("Received request to notify mentors for ask:", askId, "with tags:", tagIds);

    if (!askId || !tagIds || tagIds.length === 0) {
      console.log("Missing askId or tagIds");
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

    console.log("Ask details:", ask);

    // Get tags labels
    const { data: tags, error: tagsError } = await supabase
      .from("tags")
      .select("id, label")
      .in("id", tagIds);

    if (tagsError) {
      console.error("Error fetching tags:", tagsError);
    }

    const tagLabels = tags?.map((t) => t.label.toLowerCase().trim()) || [];
    console.log("Tag labels for matching:", tagLabels);

    // Find ALL mentors with active and complete profiles
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

    console.log("Found mentor profiles:", mentorProfiles?.length || 0);
    
    if (mentorProfiles) {
      mentorProfiles.forEach(m => {
        console.log("Mentor", m.user_id, "expertise:", m.expertise_areas);
      });
    }

    // Filter mentors whose expertise overlaps with ask topics
    // Use case-insensitive matching and partial matching
    const matchingMentors = mentorProfiles?.filter((mentor) => {
      const expertise = (mentor.expertise_areas || []).map((e: string) => e.toLowerCase().trim());
      
      // Check for any overlap between tag labels and expertise areas
      const hasMatch = tagLabels.some((tagLabel) =>
        expertise.some((exp: string) => {
          const match = exp.includes(tagLabel) || tagLabel.includes(exp) || exp === tagLabel;
          if (match) {
            console.log(`Match found: tag "${tagLabel}" matches expertise "${exp}" for mentor ${mentor.user_id}`);
          }
          return match;
        })
      );
      
      return hasMatch;
    }) || [];

    console.log("Matching mentors:", matchingMentors.length);

    if (matchingMentors.length === 0) {
      console.log("No matching mentors found for ask:", askId, "with tags:", tagLabels);
      return new Response(
        JSON.stringify({ success: true, notified: 0, reason: "No mentors matched the topics" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notifications for matching mentors
    const mentorUserIds = matchingMentors.map((m) => m.user_id);
    
    const notifications = mentorUserIds.map((userId) => ({
      user_id: userId,
      title: "New Ask matches your expertise",
      body: ask.title
        ? `"${ask.title}" - A new community ask relates to your areas of expertise.`
        : `A new community ask relates to your areas of expertise. Check it out and offer your help!`,
      link: `/community-asks/${askId}`,
    }));

    console.log("Creating notifications for:", mentorUserIds);

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

    console.log(`Successfully notified ${notifications.length} mentors about ask ${askId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: notifications.length,
        matchedMentors: mentorUserIds,
        tagLabelsUsed: tagLabels
      }),
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