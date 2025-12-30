import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RoleRequest {
  action: "list_users" | "update_role";
  userId?: string;
  role?: "admin" | "user";
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user client to verify owner
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

    // Create service role client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify owner role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Owner access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RoleRequest = await req.json();
    const { action } = body;

    if (action === "list_users") {
      // Get all users with their profiles and roles
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      
      const userIds = authUsers?.users?.map((u) => u.id) || [];
      
      // Get profiles
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      // Get roles
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);

      const users = authUsers?.users?.map((u) => ({
        user_id: u.id,
        email: u.email,
        full_name: profileMap.get(u.id)?.full_name || null,
        role: roleMap.get(u.id) || "user",
      })) || [];

      // Sort: owners first, then admins, then users
      const roleOrder = { owner: 0, admin: 1, user: 2 };
      users.sort((a, b) => roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder]);

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      const { userId, role } = body;
      
      if (!userId || !role) {
        return new Response(JSON.stringify({ error: "User ID and role are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!["admin", "user"].includes(role)) {
        return new Response(JSON.stringify({ error: "Invalid role" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Cannot change own role
      if (userId === user.id) {
        return new Response(JSON.stringify({ error: "Cannot change your own role" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if target is owner (cannot change owner roles)
      const { data: targetRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (targetRole?.role === "owner") {
        return new Response(JSON.stringify({ error: "Cannot change owner role" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get target user email for audit
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("user_id", userId)
        .single();

      // Update role
      const { error: updateError } = await supabaseAdmin
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      // Log audit action
      await logAuditAction(
        supabaseAdmin,
        user.id,
        user.email!,
        "update_user_role",
        targetProfile?.email || userId,
        { new_role: role, previous_role: targetRole?.role || "user" }
      );

      console.log(`Role updated for user ${userId} to ${role} by owner ${user.email}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in admin-role-management:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
