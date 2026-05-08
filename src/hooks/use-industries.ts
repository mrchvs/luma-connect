import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIndustries() {
  return useQuery({
    queryKey: ["industries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("industries")
        .select("*")
        .order("label");
      if (error) throw error;
      return data;
    },
  });
}
