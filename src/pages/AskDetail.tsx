import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainNav } from "@/components/MainNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { CommentSection } from "@/components/CommentSection";
import { UpvoteButton } from "@/components/UpvoteButton";
import { AskStatusBadge } from "@/components/AskStatusBadge";
import { RequestIntroModal } from "@/components/RequestIntroModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, CheckCircle2, Compass } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const HELP_TYPES: Record<string, string> = {
  "Perspective / sense-check": "Perspective",
  "Help deciding": "Help deciding",
  "Practical steps": "Practical steps",
  "Shared experience": "Shared experience",
};

// Parse help type from body text if it was appended
function parseHelpType(body: string): { cleanBody: string; helpType: string | null } {
  const helpTypePattern = /\n\n---\n\*Looking for: (.+?)\*$/;
  const match = body.match(helpTypePattern);
  
  if (match) {
    return {
      cleanBody: body.replace(helpTypePattern, "").trim(),
      helpType: match[1],
    };
  }
  
  return { cleanBody: body, helpType: null };
}

export default function AskDetail() {
  const { askId } = useParams<{ askId: string }>();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showIntroModal, setShowIntroModal] = useState(false);

  const { data: request, isLoading } = useQuery({
    queryKey: ["ask-detail", askId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select(`
          *,
          request_tags(tag_id, tags(id, label))
        `)
        .eq("id", askId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!askId && !!user,
  });

  const { data: authorProfile } = useQuery({
    queryKey: ["ask-author", request?.created_by],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, job_title, company_name")
        .eq("user_id", request!.created_by)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!request?.created_by,
  });

  const { data: upvoteData, refetch: refetchUpvotes } = useQuery({
    queryKey: ["ask-upvotes", askId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_upvotes")
        .select("user_id")
        .eq("request_id", askId);

      if (error) throw error;
      return {
        count: data.length,
        userUpvoted: data.some((u) => u.user_id === user?.id),
      };
    },
    enabled: !!askId && !!user,
  });

  const markResolvedMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("requests")
        .update({ status: "resolved" })
        .eq("id", askId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ask-detail", askId] });
      toast.success("Ask marked as resolved!");
    },
  });

  const acceptAnswerMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("requests")
        .update({ accepted_comment_id: commentId, status: "resolved" })
        .eq("id", askId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ask-detail", askId] });
      queryClient.invalidateQueries({ queryKey: ["request-comments", askId] });
      toast.success("Solution marked!");
    },
  });

  const unmarkSolutionMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("requests")
        .update({ accepted_comment_id: null, status: "open" })
        .eq("id", askId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ask-detail", askId] });
      queryClient.invalidateQueries({ queryKey: ["request-comments", askId] });
      toast.success("Solution unmarked, ask reopened");
    },
  });

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (profile?.status !== "approved") {
    navigate("/dashboard");
    return null;
  }

  if (!request) {
    return (
      <div className="min-h-screen gradient-hero">
        <MainNav />
        <main className="container py-8 px-4 max-w-3xl mx-auto">
          <Card className="py-10">
            <CardContent className="text-center">
              <h2 className="font-display text-xl mb-2">Ask not found</h2>
              <p className="text-muted-foreground mb-4">This ask may have been removed or doesn't exist.</p>
              <Button asChild>
                <Link to="/community-asks">Back to Community Asks</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isOwner = request.created_by === user.id;
  const tags = request.request_tags?.map((rt: any) => rt.tags) || [];
  const { cleanBody, helpType } = parseHelpType(request.body);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen gradient-hero">
      <MainNav />

      <main className="container py-8 px-4 max-w-3xl mx-auto">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-4 -ml-2">
          <Link to="/community-asks">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Asks
          </Link>
        </Button>

        {/* Main ask card */}
        <Card className="mb-6 animate-scale-in">
          <CardContent className="py-6">
            <div className="flex gap-4">
              {/* Upvote column */}
              <div className="flex flex-col items-center">
                <UpvoteButton
                  type="request"
                  id={request.id}
                  initialCount={upvoteData?.count || 0}
                  initialUpvoted={upvoteData?.userUpvoted || false}
                  onUpdate={refetchUpvotes}
                />
              </div>

              {/* Content column */}
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Link to={`/profile/${request.created_by}`} className="hover:opacity-80">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={authorProfile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(authorProfile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div>
                      <Link
                        to={`/profile/${request.created_by}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {authorProfile?.full_name || "Member"}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <AskStatusBadge status={request.status as "open" | "resolved" | "archived"} />
                </div>

                {request.title && (
                  <h1 className="font-display text-xl font-semibold mb-3">{request.title}</h1>
                )}

                <p className="text-foreground whitespace-pre-wrap mb-4">{cleanBody}</p>

                {/* Tags and Help Type as metadata */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {tags.map((tag: any) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.label}
                    </Badge>
                  ))}
                  {helpType && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                      <Compass className="w-3 h-3" />
                      <span>Looking for: {helpType}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {isOwner && request.status === "open" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markResolvedMutation.mutate()}
                      disabled={markResolvedMutation.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark resolved
                    </Button>
                  )}
                  {!isOwner && request.status === "open" && (
                    <Button size="sm" onClick={() => setShowIntroModal(true)}>
                      Offer help
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments/Answers section */}
        <Card className="animate-slide-up">
          <CardContent className="py-6">
            <CommentSection
              requestId={request.id}
              requestOwnerId={request.created_by}
              acceptedCommentId={request.accepted_comment_id}
              onAcceptAnswer={(commentId) => acceptAnswerMutation.mutate(commentId)}
              onUnmarkSolution={() => unmarkSolutionMutation.mutate()}
            />
          </CardContent>
        </Card>
      </main>

      {showIntroModal && authorProfile && (
        <RequestIntroModal
          open={showIntroModal}
          onOpenChange={(open) => !open && setShowIntroModal(false)}
          helper={{
            id: authorProfile.user_id,
            user_id: request.created_by,
            full_name: authorProfile.full_name || "Member",
            matchingTags: tags.map((t: any) => t.label),
          }}
        />
      )}
    </div>
  );
}
