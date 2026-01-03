import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

interface OnboardingProgress {
  id: string;
  user_id: string;
  profile_completed: boolean;
  industries_added: boolean;
  photo_uploaded: boolean;
  first_message_sent: boolean;
  first_ask_posted: boolean;
  checklist_dismissed: boolean;
}

export function useOnboardingProgress() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: progress, isLoading, refetch } = useQuery({
    queryKey: ["onboarding-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Try to get existing progress
      const { data, error } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      // If no progress exists, create one
      if (!data) {
        const { data: newProgress, error: insertError } = await supabase
          .from("onboarding_progress")
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newProgress as OnboardingProgress;
      }
      
      return data as OnboardingProgress;
    },
    enabled: !!user?.id && profile?.status === "approved",
  });

  const dismissMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from("onboarding_progress")
        .update({ checklist_dismissed: true })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-progress"] });
    },
  });

  const updateProgress = useMutation({
    mutationFn: async (updates: Partial<OnboardingProgress>) => {
      if (!user?.id) return;
      const { error } = await supabase
        .from("onboarding_progress")
        .update(updates)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-progress"] });
    },
  });

  // Calculate completion based on actual data
  const calculateCompletion = () => {
    if (!profile) return { completed: 0, total: 5, items: [] };
    
    const items = [
      {
        key: "profile_completed",
        label: "Complete your profile",
        done: !!(profile.full_name && profile.short_bio && profile.city),
        link: "/profile/settings",
      },
      {
        key: "industries_added",
        label: "Add your industries & skills",
        done: progress?.industries_added || false,
        link: "/profile/settings",
      },
      {
        key: "photo_uploaded",
        label: "Upload a profile photo",
        done: !!profile.avatar_url,
        link: "/profile/settings",
      },
      {
        key: "first_message_sent",
        label: "Send your first message",
        done: progress?.first_message_sent || false,
        link: "/members",
      },
      {
        key: "first_ask_posted",
        label: "Ask your first question",
        done: progress?.first_ask_posted || false,
        link: "/community-asks",
      },
    ];

    const completed = items.filter((item) => item.done).length;
    return { completed, total: items.length, items };
  };

  const { completed, total, items } = calculateCompletion();
  const isComplete = completed === total;
  const shouldShow = !progress?.checklist_dismissed && !isComplete && profile?.status === "approved";

  return {
    progress,
    isLoading,
    refetch,
    dismiss: dismissMutation.mutate,
    updateProgress: updateProgress.mutate,
    completed,
    total,
    items,
    isComplete,
    shouldShow,
  };
}
