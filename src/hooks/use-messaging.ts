import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export interface Conversation {
  id: string;
  participant_one: string;
  participant_two: string;
  last_message_at: string;
  created_at: string;
  booking_id: string | null;
  intro_request_id: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

export interface ConversationWithDetails extends Conversation {
  other_user: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    job_title: string | null;
    company_name: string | null;
  } | null;
  last_message?: Message;
  unread_count: number;
}

export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch conversations
      const { data: conversations, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      if (!conversations || conversations.length === 0) return [];

      // Get all other user IDs
      const otherUserIds = conversations.map((c) =>
        c.participant_one === user.id ? c.participant_two : c.participant_one
      );

      // Fetch profiles for other users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, job_title, company_name")
        .in("user_id", otherUserIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      // Fetch last message for each conversation
      const conversationIds = conversations.map((c) => c.id);
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false });

      // Group messages by conversation
      const lastMessageMap = new Map<string, Message>();
      const unreadCountMap = new Map<string, number>();

      messages?.forEach((m) => {
        if (!lastMessageMap.has(m.conversation_id)) {
          lastMessageMap.set(m.conversation_id, m);
        }
        // Count unread messages for current user
        if (m.recipient_id === user.id && !m.read_at) {
          unreadCountMap.set(
            m.conversation_id,
            (unreadCountMap.get(m.conversation_id) || 0) + 1
          );
        }
      });

      return conversations.map((c): ConversationWithDetails => {
        const otherUserId =
          c.participant_one === user.id ? c.participant_two : c.participant_one;
        return {
          ...c,
          other_user: profileMap.get(otherUserId) || null,
          last_message: lastMessageMap.get(c.id),
          unread_count: unreadCountMap.get(c.id) || 0,
        };
      });
    },
    enabled: !!user,
  });
}

export function useConversation(conversationId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      if (!conversationId || !user) return null;

      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      if (error) throw error;

      // Get other user profile
      const otherUserId =
        data.participant_one === user.id
          ? data.participant_two
          : data.participant_one;

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, job_title, company_name")
        .eq("user_id", otherUserId)
        .single();

      return {
        ...data,
        other_user: profile,
      } as ConversationWithDetails;
    },
    enabled: !!conversationId && !!user,
  });
}

export function useMessages(conversationId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId || !user) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId && !!user,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversationId,
      recipientId,
      content,
    }: {
      conversationId: string;
      recipientId: string;
      content: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          recipient_id: recipientId,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      otherUserId,
      bookingId,
      introRequestId,
      initialMessage,
    }: {
      otherUserId: string;
      bookingId?: string;
      introRequestId?: string;
      initialMessage?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Get or create conversation
      const { data: conversationId, error: convError } = await supabase.rpc(
        "get_or_create_conversation",
        {
          p_user_one: user.id,
          p_user_two: otherUserId,
          p_booking_id: bookingId || null,
          p_intro_request_id: introRequestId || null,
        }
      );

      if (convError) throw convError;

      // Send initial message if provided
      if (initialMessage) {
        const { error: msgError } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: user.id,
          recipient_id: otherUserId,
          content: initialMessage,
        });

        if (msgError) throw msgError;

        // Update last_message_at
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);
      }

      return conversationId as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("recipient_id", user.id)
        .is("read_at", null);

      if (error) throw error;
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useUnreadCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-messages-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .is("read_at", null);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
