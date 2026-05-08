import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UpvoteButton } from "@/components/UpvoteButton";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, CheckCircle2, Reply, X } from "lucide-react";
import { toast } from "sonner";

interface CommentSectionProps {
  requestId: string;
  requestOwnerId: string;
  acceptedCommentId: string | null;
  onAcceptAnswer?: (commentId: string) => void;
  onUnmarkSolution?: () => void;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  parent_id: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  upvote_count: number;
  user_upvoted: boolean;
  replies?: Comment[];
}

export function CommentSection({ requestId, requestOwnerId, acceptedCommentId, onAcceptAnswer, onUnmarkSolution }: CommentSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const { data: comments, isLoading, refetch } = useQuery({
    queryKey: ["request-comments", requestId],
    queryFn: async () => {
      // Fetch comments
      const { data: commentsData, error } = await supabase
        .from("request_comments")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch profiles for comment authors
      const userIds = [...new Set(commentsData.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = Object.fromEntries(
        (profiles || []).map((p) => [p.user_id, p])
      );

      // Fetch upvotes
      const { data: upvotes } = await supabase
        .from("comment_upvotes")
        .select("comment_id, user_id")
        .in("comment_id", commentsData.map((c) => c.id));

      const upvotesByComment: Record<string, { count: number; userUpvoted: boolean }> = {};
      (upvotes || []).forEach((u) => {
        if (!upvotesByComment[u.comment_id]) {
          upvotesByComment[u.comment_id] = { count: 0, userUpvoted: false };
        }
        upvotesByComment[u.comment_id].count++;
        if (u.user_id === user?.id) {
          upvotesByComment[u.comment_id].userUpvoted = true;
        }
      });

      // Build tree structure
      const commentMap: Record<string, Comment> = {};
      const rootComments: Comment[] = [];

      commentsData.forEach((c) => {
        const upvoteData = upvotesByComment[c.id] || { count: 0, userUpvoted: false };
        commentMap[c.id] = {
          ...c,
          profile: profileMap[c.user_id],
          upvote_count: upvoteData.count,
          user_upvoted: upvoteData.userUpvoted,
          replies: [],
        };
      });

      commentsData.forEach((c) => {
        if (c.parent_id && commentMap[c.parent_id]) {
          commentMap[c.parent_id].replies!.push(commentMap[c.id]);
        } else if (!c.parent_id) {
          rootComments.push(commentMap[c.id]);
        }
      });

      return rootComments;
    },
    enabled: !!requestId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!user) throw new Error("Must be signed in");
      const { error } = await supabase
        .from("request_comments")
        .insert({
          request_id: requestId,
          user_id: user.id,
          content,
          parent_id: parentId || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request-comments", requestId] });
      setNewComment("");
      setReplyContent("");
      setReplyingTo(null);
      toast.success("Comment added!");
    },
    onError: () => {
      toast.error("Failed to add comment");
    },
  });

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const renderComment = (comment: Comment, depth = 0) => {
    const isAccepted = comment.id === acceptedCommentId;
    const isOwner = user?.id === requestOwnerId;
    const canAccept = isOwner && !acceptedCommentId && !comment.parent_id && comment.user_id !== requestOwnerId;
    const canUnmark = isOwner && isAccepted;

    return (
      <div
        key={comment.id}
        className={`${depth > 0 ? "ml-8 border-l-2 border-muted pl-4" : ""} ${
          isAccepted ? "bg-success/10 border border-success/30 rounded-lg p-3 -ml-3" : ""
        }`}
      >
        <div className="flex gap-3 py-3">
          <UpvoteButton
            type="comment"
            id={comment.id}
            initialCount={comment.upvote_count}
            initialUpvoted={comment.user_upvoted}
            onUpdate={refetch}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Link to={`/profile/${comment.user_id}`} className="hover:opacity-80">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={comment.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(comment.profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Link
                to={`/profile/${comment.user_id}`}
                className="text-sm font-medium hover:underline"
              >
                {comment.profile?.full_name || "Member"}
              </Link>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
              {isAccepted && (
                <Badge variant="secondary" className="text-success bg-success/20 gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Solution
                </Badge>
              )}
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
            <div className="flex items-center gap-3 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              >
                <Reply className="w-3 h-3 mr-1" />
                Reply
              </Button>
              {canAccept && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-success"
                  onClick={() => onAcceptAnswer?.(comment.id)}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Mark as solution
                </Button>
              )}
              {canUnmark && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => onUnmarkSolution?.()}
                >
                  <X className="w-3 h-3 mr-1" />
                  Unmark solution
                </Button>
              )}
            </div>

            {replyingTo === comment.id && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => addCommentMutation.mutate({ content: replyContent, parentId: comment.id })}
                    disabled={!replyContent.trim() || addCommentMutation.isPending}
                  >
                    Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {comment.replies?.map((reply) => renderComment(reply, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-medium">
          {comments?.length || 0} {(comments?.length || 0) === 1 ? "Answer" : "Answers"}
        </h3>
      </div>

      {/* Add new comment */}
      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your answer or advice..."
          rows={3}
        />
        <Button
          onClick={() => addCommentMutation.mutate({ content: newComment })}
          disabled={!newComment.trim() || addCommentMutation.isPending}
        >
          {addCommentMutation.isPending ? "Posting..." : "Post Answer"}
        </Button>
      </div>

      {/* Comments list */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading answers...</div>
      ) : comments && comments.length > 0 ? (
        <div className="divide-y divide-border">
          {comments.map((comment) => renderComment(comment))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No answers yet. Be the first to help!
        </div>
      )}
    </div>
  );
}
