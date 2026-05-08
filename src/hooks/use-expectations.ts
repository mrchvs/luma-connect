import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useExpectations() {
  return useQuery({
    queryKey: ["expectations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expectations")
        .select("*")
        .order("label");
      if (error) throw error;
      return data;
    },
  });
}
