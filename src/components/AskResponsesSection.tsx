import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ThumbsUp, Send, CheckCircle2, MessageCircle } from "lucide-react";

interface Props {
  requestId: string;
  askOwnerId: string;
  askTitle: string | null;
  isOwner: boolean;
  isOpen: boolean;
}

interface Response {
  id: string;
  user_id: string;
  body: string;
  is_helpful: boolean;
  created_at: string;
  full_name: string | null;
  avatar_url: string | null;
  upvote_count: number;
  user_upvoted: boolean;
}

export function AskResponsesSection({ requestId, askOwnerId, askTitle, isOwner, isOpen }: Props) {
  const INITIAL_LIMIT = 2;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { data: responses = [], isLoading } = useQuery({
    queryKey: ["ask-responses", requestId],
    queryFn: async () => {
      const { data: rawResponses, error } = await supabase
        .from("ask_responses")
        .select("id, user_id, body, created_at, is_helpful")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      // If is_helpful column doesn't exist yet (migration not run), retry without it
      if (error?.message?.includes("is_helpful")) {
        const { data: fallback, error: e2 } = await supabase
          .from("ask_responses")
          .select("id, user_id, body, created_at")
          .eq("request_id", requestId)
          .order("created_at", { ascending: true });
        if (e2) throw e2;
        if (!fallback?.length) return [];
        const userIds2 = [...new Set(fallback.map((r) => r.user_id))];
        const { data: profiles2 } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds2);
        return fallback.map((r) => ({
          ...r, is_helpful: false,
          full_name: profiles2?.find((p) => p.user_id === r.user_id)?.full_name ?? null,
          avatar_url: profiles2?.find((p) => p.user_id === r.user_id)?.avatar_url ?? null,
          upvote_count: 0, user_upvoted: false,
        })) as Response[];
      }
      if (error) throw error;
      if (!rawResponses?.length) return [];

      const userIds = [...new Set(rawResponses.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const { data: upvotes } = await supabase
        .from("ask_response_upvotes")
        .select("response_id, user_id")
        .in("response_id", rawResponses.map((r) => r.id));

      return rawResponses.map((r) => {
        const profile = profiles?.find((p) => p.user_id === r.user_id);
        const responseUpvotes = upvotes?.filter((u) => u.response_id === r.id) ?? [];
        return {
          ...r,
          full_name: profile?.full_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          upvote_count: responseUpvotes.length,
          user_upvoted: responseUpvotes.some((u) => u.user_id === user?.id),
        } as Response;
      });
    },
    enabled: !!user,
  });

  const postResponse = async () => {
    if (!body.trim() || !user) return;
    setIsSending(true);
    try {
      const { error } = await supabase.from("ask_responses").insert({
        request_id: requestId,
        user_id: user.id,
        body: body.trim(),
      });
      if (error) throw error;

      // Notification is best-effort — don't let its failure block the success flow
      supabase.from("notifications").insert({
        user_id: askOwnerId,
        title: "Someone responded to your ask",
        body: body.trim().slice(0, 100),
        link: "/community-asks",
      }).then(() => {});

      toast.success("Response posted!");
      setBody("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["ask-responses", requestId] });
      queryClient.invalidateQueries({ queryKey: ["community-asks"] });
    } catch {
      toast.error("Failed to post response");
    } finally {
      setIsSending(false);
    }
  };

  const toggleUpvote = useMutation({
    mutationFn: async ({ responseId, upvoted }: { responseId: string; upvoted: boolean }) => {
      if (!user) return;
      if (upvoted) {
        await supabase.from("ask_response_upvotes").delete()
          .eq("response_id", responseId).eq("user_id", user.id);
      } else {
        await supabase.from("ask_response_upvotes").insert({ response_id: responseId, user_id: user.id });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ask-responses", requestId] }),
    onError: () => toast.error("Failed to update vote"),
  });

  const markHelpful = useMutation({
    mutationFn: async ({ responseId, current }: { responseId: string; current: boolean }) => {
      await supabase.from("ask_responses").update({ is_helpful: !current }).eq("id", responseId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ask-responses", requestId] }),
    onError: () => toast.error("Failed to update"),
  });

  const getInitials = (name: string | null) =>
    (name ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const canRespond = !isOwner && isOpen && !!user;

  return (
    <div className="border-t border-border/40 mt-3 pt-3 space-y-3">
      {/* Response count header */}
      {responses.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageCircle className="w-3.5 h-3.5" />
          {`${responses.length} response${responses.length > 1 ? "s" : ""}`}
        </div>
      )}

      {/* Response list */}
      {responses.length > 0 && (
        <div className="space-y-3">
          {(showAll ? responses : responses.slice(0, INITIAL_LIMIT)).map((r) => (
            <div key={r.id} className={`flex gap-2.5 ${r.is_helpful ? "bg-green-50 -mx-1 px-1 py-2 rounded-lg" : ""}`}>
              <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5">
                <AvatarImage src={r.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                  {getInitials(r.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-medium">{r.full_name ?? "Member"}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                  {r.is_helpful && (
                    <Badge className="h-4 text-[10px] px-1.5 bg-green-100 text-green-700 border-0 gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Helpful
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {/* Upvote */}
                  <button
                    onClick={() => toggleUpvote.mutate({ responseId: r.id, upvoted: r.user_upvoted })}
                    disabled={!user || r.user_id === user?.id}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      r.user_upvoted
                        ? "text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    } disabled:opacity-40 disabled:cursor-default`}
                  >
                    <ThumbsUp className="w-3 h-3" />
                    {r.upvote_count > 0 && <span>{r.upvote_count}</span>}
                  </button>
                  {/* Mark helpful — only ask owner, only on open asks */}
                  {isOwner && isOpen && (
                    <button
                      onClick={() => markHelpful.mutate({ responseId: r.id, current: r.is_helpful })}
                      className={`text-xs transition-colors ${
                        r.is_helpful
                          ? "text-green-600"
                          : "text-muted-foreground hover:text-green-600"
                      }`}
                    >
                      {r.is_helpful ? "✓ Marked helpful" : "Mark as helpful"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {responses.length > INITIAL_LIMIT && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-primary hover:underline"
            >
              {showAll
                ? "Show less"
                : `Show ${responses.length - INITIAL_LIMIT} more response${responses.length - INITIAL_LIMIT > 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      )}

      {/* Inline response form — always visible for eligible users */}
      {canRespond && (
        <div className="flex items-end gap-2 pt-1">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your advice, resources, or offer to connect…"
            rows={2}
            className="resize-none text-sm flex-1"
          />
          <Button size="sm" onClick={postResponse} disabled={!body.trim() || isSending} className="flex-shrink-0 mb-0.5">
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
