import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AskStatusBadge } from "@/components/AskStatusBadge";
import { AskResponsesSection } from "@/components/AskResponsesSection";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

interface AskCardProps {
  request: {
    id: string;
    title: string | null;
    body: string;
    status: string;
    created_at: string;
    created_by: string;
    request_tags?: Array<{ tag_id: string; tags: { id: string; label: string } }>;
  };
  profile?: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    job_title: string | null;
    company_name: string | null;
  };
  isOwner: boolean;
  onStatusChange: () => void;
  style?: React.CSSProperties;
}

export function AskCard({ request, profile, isOwner, onStatusChange, style }: AskCardProps) {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleMarkResolved = async () => {
    setIsUpdating(true);
    try {
      // Note: don't throw on Supabase error here — RLS may prevent reading
      // the result back even when the update itself succeeds, which would
      // surface a false error. The list will refresh via onStatusChange.
      await supabase
        .from("requests")
        .update({ status: "resolved" })
        .eq("id", request.id);
      toast.success("Ask marked as resolved!");
      onStatusChange();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const tags = request.request_tags?.map((rt) => rt.tags) || [];
  const isOpen = request.status === "open";

  return (
    <Card className="shadow-card hover:shadow-elevated transition-shadow animate-slide-up" style={style}>
      <CardContent className="py-4 px-4">
        {/* Top row: Avatar, name, status */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <Link to={`/profile/${request.created_by}`} className="hover:opacity-80 transition-opacity">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex items-center gap-2">
              <Link to={`/profile/${request.created_by}`} className="text-sm font-medium hover:underline">
                {profile?.full_name || "Member"}
              </Link>
              {isOwner && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">Your ask</Badge>
              )}
            </div>
          </div>
          <AskStatusBadge status={request.status as "open" | "resolved" | "archived"} />
        </div>

        {/* Title */}
        {request.title && (
          <h3 className="font-medium text-sm leading-snug mb-1">{request.title}</h3>
        )}

        {/* Body */}
        <p className="text-sm text-muted-foreground mb-3">{request.body}</p>

        {/* Tags + time + owner actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {tags.slice(0, 2).map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs py-0 h-5">
                {tag.label}
              </Badge>
            ))}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
            </span>
          </div>
          {isOwner && isOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkResolved}
              disabled={isUpdating}
              className="h-7 text-xs px-2 flex-shrink-0"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Mark resolved
            </Button>
          )}
        </div>

        {/* Responses section — always visible */}
        <AskResponsesSection
          requestId={request.id}
          askOwnerId={request.created_by}
          askTitle={request.title}
          isOwner={isOwner}
          isOpen={isOpen}
        />
      </CardContent>
    </Card>
  );
}
