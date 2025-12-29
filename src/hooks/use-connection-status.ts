import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

/**
 * Hook to check if the current user is connected to another user
 * (i.e., has an accepted intro request with them)
 */
export function useConnectionStatus(targetUserIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["connection-status", user?.id, targetUserIds],
    queryFn: async () => {
      if (!user || targetUserIds.length === 0) return {};

      const { data, error } = await supabase
        .from("intro_requests")
        .select("requester_id, helper_id")
        .eq("status", "accepted")
        .or(
          `and(requester_id.eq.${user.id},helper_id.in.(${targetUserIds.join(",")})),and(helper_id.eq.${user.id},requester_id.in.(${targetUserIds.join(",")}))`
        );

      if (error) throw error;

      // Build a map of user_id -> isConnected
      const connectionMap: Record<string, boolean> = {};
      
      targetUserIds.forEach((targetId) => {
        connectionMap[targetId] = data?.some(
          (req) =>
            (req.requester_id === user.id && req.helper_id === targetId) ||
            (req.helper_id === user.id && req.requester_id === targetId)
        ) ?? false;
      });

      return connectionMap;
    },
    enabled: !!user && targetUserIds.length > 0,
  });
}

/**
 * Helper function to mask sensitive profile data for non-connected users
 * Hides: last name, linkedin_url, instagram_url, website_url, portfolio_url
 */
export function maskProfileForNonConnected(
  profile: {
    full_name?: string | null;
    linkedin_url?: string | null;
    instagram_url?: string | null;
    website_url?: string | null;
    portfolio_url?: string | null;
    [key: string]: any;
  },
  isConnected: boolean
) {
  if (isConnected) {
    return profile;
  }

  // Mask last name by showing only first name
  const firstName = profile.full_name?.split(" ")[0] || "Member";

  return {
    ...profile,
    full_name: firstName,
    linkedin_url: null,
    instagram_url: null,
    website_url: null,
    portfolio_url: null,
  };
}
