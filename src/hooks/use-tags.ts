import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Tag {
  id: string;
  label: string;
  category: string;
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("label");

      if (error) throw error;
      return data as Tag[];
    },
  });
}

export function useUserNeeds(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-needs", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("profile_needs")
        .select("tag_id, tags(id, label, category)")
        .eq("user_id", userId);

      if (error) throw error;
      return data.map((item: any) => item.tags) as Tag[];
    },
    enabled: !!userId,
  });
}

export function useUserOffers(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-offers", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("profile_offers")
        .select("tag_id, tags(id, label, category)")
        .eq("user_id", userId);

      if (error) throw error;
      return data.map((item: any) => item.tags) as Tag[];
    },
    enabled: !!userId,
  });
}
