import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MentorApplication {
  id: string;
  user_id: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'revoked';
  expertise_areas: string[];
  industries: string[];
  services_description: string | null;
  pricing_info: string | null;
  mentor_bio: string | null;
  credentials_url: string | null;
  availability_preferences: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function useMentorApplication(userId: string | undefined) {
  return useQuery({
    queryKey: ["mentor-application", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("mentor_applications")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (error) throw error;
      return data as MentorApplication | null;
    },
    enabled: !!userId,
  });
}

export function useCreateMentorApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<MentorApplication> & { user_id: string }) => {
      const { data: result, error } = await supabase
        .from("mentor_applications")
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["mentor-application", data.user_id] });
    },
  });
}

export function useUpdateMentorApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<MentorApplication> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("mentor_applications")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["mentor-application", data.user_id] });
      queryClient.invalidateQueries({ queryKey: ["mentor-applications"] });
    },
  });
}

export function useSubmitMentorApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: result, error } = await supabase
        .from("mentor_applications")
        .update({ 
          status: 'pending_review' as const,
          submitted_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["mentor-application", data.user_id] });
      queryClient.invalidateQueries({ queryKey: ["mentor-applications"] });
    },
  });
}

export function useAllMentorApplications() {
  return useQuery({
    queryKey: ["mentor-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_applications")
        .select("*")
        .order("submitted_at", { ascending: false });
      
      if (error) throw error;
      return data as MentorApplication[];
    },
  });
}
