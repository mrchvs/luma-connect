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

  // Fetch the onboarding progress record
  const { data: progress, isLoading: progressLoading } = useQuery({
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

  // Dynamically check if user has industries/skills added
  const { data: hasIndustries } = useQuery({
    queryKey: ["onboarding-check-industries", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      // Check profile_industries
      const { data: industries } = await supabase
        .from("profile_industries")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      
      // Check profile_offers (skills)
      const { data: offers } = await supabase
        .from("profile_offers")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      
      return (industries && industries.length > 0) || (offers && offers.length > 0);
    },
    enabled: !!user?.id && profile?.status === "approved",
  });

  // Dynamically check if user has sent a message
  const { data: hasSentMessage } = useQuery({
    queryKey: ["onboarding-check-message", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data } = await supabase
        .from("messages")
        .select("id")
        .eq("sender_id", user.id)
        .limit(1);
      
      return data && data.length > 0;
    },
    enabled: !!user?.id && profile?.status === "approved",
  });

  // Dynamically check if user has posted an ask
  const { data: hasPostedAsk } = useQuery({
    queryKey: ["onboarding-check-ask", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data } = await supabase
        .from("requests")
        .select("id")
        .eq("created_by", user.id)
        .limit(1);
      
      return data && data.length > 0;
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

  // Refetch all onboarding checks
  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["onboarding-progress", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["onboarding-check-industries", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["onboarding-check-message", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["onboarding-check-ask", user?.id] });
  };

  // Calculate completion based on actual data (dynamically checked)
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
        done: hasIndustries || false,
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
        done: hasSentMessage || false,
        link: "/members",
      },
      {
        key: "first_ask_posted",
        label: "Ask your first question",
        done: hasPostedAsk || false,
        link: "/community-asks",
      },
    ];

    const completed = items.filter((item) => item.done).length;
    return { completed, total: items.length, items };
  };

  const { completed, total, items } = calculateCompletion();
  const isComplete = completed === total;
  const isLoading = progressLoading;
  
  // Show checklist if:
  // 1. User is approved
  // 2. Checklist hasn't been dismissed
  // Show even when complete (to display celebration message)
  const shouldShow = profile?.status === "approved" && !progress?.checklist_dismissed;

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