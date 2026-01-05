import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export interface MentorProfile {
  id: string;
  user_id: string;
  headline: string;
  expertise_areas: string[];
  who_this_is_for: string | null;
  availability: string;
  is_complete: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MentorService {
  id: string;
  mentor_id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface MentorBooking {
  id: string;
  mentor_id: string;
  service_id: string | null;
  client_user_id: string;
  status: string;
  service_name: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  scheduled_at: string | null;
  notes: string | null;
  intro_request_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useIsMentor(userId?: string) {
  return useQuery({
    queryKey: ["is-mentor", userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "mentor")
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!userId,
  });
}

export function useMentorProfile(userId?: string) {
  return useQuery({
    queryKey: ["mentor-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("mentor_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (error && error.code !== "PGRST116") throw error;
      return data as MentorProfile | null;
    },
    enabled: !!userId,
  });
}

export function useMentorServices(mentorId?: string) {
  return useQuery({
    queryKey: ["mentor-services", mentorId],
    queryFn: async () => {
      if (!mentorId) return [];
      
      const { data, error } = await supabase
        .from("mentor_services")
        .select("*")
        .eq("mentor_id", mentorId)
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data as MentorService[];
    },
    enabled: !!mentorId,
  });
}

export function useMentorBookings(userId?: string, asMentor = false) {
  return useQuery({
    queryKey: ["mentor-bookings", userId, asMentor],
    queryFn: async () => {
      if (!userId) return [];
      
      let query = supabase.from("mentor_bookings").select("*");
      
      if (asMentor) {
        // Get bookings where user is the mentor
        const { data: mentorProfile } = await supabase
          .from("mentor_profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        
        if (!mentorProfile) return [];
        query = query.eq("mentor_id", mentorProfile.id);
      } else {
        // Get bookings where user is the client
        query = query.eq("client_user_id", userId);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as MentorBooking[];
    },
    enabled: !!userId,
  });
}

export function useCreateMentorProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (profile: Partial<MentorProfile>) => {
      if (!user?.id) throw new Error("Must be logged in");
      
      const { data, error } = await supabase
        .from("mentor_profiles")
        .insert({
          user_id: user.id,
          headline: profile.headline || "",
          expertise_areas: profile.expertise_areas || [],
          who_this_is_for: profile.who_this_is_for || null,
          availability: profile.availability || "by_request",
          is_complete: profile.is_complete || false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as MentorProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-profile"] });
    },
  });
}

export function useUpdateMentorProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (updates: Partial<MentorProfile>) => {
      if (!user?.id) throw new Error("Must be logged in");
      
      const { data, error } = await supabase
        .from("mentor_profiles")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as MentorProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-profile"] });
    },
  });
}

export function useCreateMentorService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (service: Omit<MentorService, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("mentor_services")
        .insert(service)
        .select()
        .single();
      
      if (error) throw error;
      return data as MentorService;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["mentor-services", data.mentor_id] });
    },
  });
}

export function useUpdateMentorService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MentorService> & { id: string }) => {
      const { data, error } = await supabase
        .from("mentor_services")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as MentorService;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["mentor-services", data.mentor_id] });
    },
  });
}

export function useDeleteMentorService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, mentorId }: { id: string; mentorId: string }) => {
      const { error } = await supabase
        .from("mentor_services")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return { id, mentorId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["mentor-services", data.mentorId] });
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (booking: {
      mentor_id: string;
      service_id: string;
      service_name: string;
      duration_minutes: number;
      price_cents: number;
      currency: string;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error("Must be logged in");
      
      const { data, error } = await supabase
        .from("mentor_bookings")
        .insert({
          ...booking,
          client_user_id: user.id,
          status: "pending",
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as MentorBooking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-bookings"] });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("mentor_bookings")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as MentorBooking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-bookings"] });
    },
  });
}
