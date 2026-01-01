import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AskStatusBadge } from "@/components/AskStatusBadge";
import { RequestIntroModal } from "@/components/RequestIntroModal";
import { formatDistanceToNow } from "date-fns";
import { HandHeart, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleMarkResolved = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("requests")
        .update({ status: "resolved" })
        .eq("id", request.id);

      if (error) throw error;
      toast.success("Ask marked as resolved!");
      onStatusChange();
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const tags = request.request_tags?.map(rt => rt.tags) || [];

  return (
    <>
      <Card className="shadow-card hover:shadow-elevated transition-shadow animate-slide-up" style={style}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <Link to={`/profile/${request.created_by}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{profile?.full_name || "Member"}</p>
                <p className="text-xs text-muted-foreground">
                  {profile?.job_title && profile?.company_name 
                    ? `${profile.job_title} at ${profile.company_name}`
                    : formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                </p>
              </div>
            </Link>
            <AskStatusBadge status={request.status as "open" | "resolved" | "archived"} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {request.title && (
            <h3 className="font-display text-lg font-medium">{request.title}</h3>
          )}
          <p className="text-foreground/90 whitespace-pre-wrap">{request.body}</p>
          
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <Badge key={tag.id} variant="secondary" className="text-xs">
                  {tag.label}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            {isOwner && request.status === "open" && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleMarkResolved}
                disabled={isUpdating}
                className="gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark Resolved
              </Button>
            )}
            {!isOwner && request.status === "open" && (
              <Button 
                size="sm" 
                onClick={() => setShowIntroModal(true)}
                className="gap-2"
              >
                <HandHeart className="w-4 h-4" />
                I can help
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {showIntroModal && profile && (
        <RequestIntroModal
          isOpen={showIntroModal}
          onClose={() => setShowIntroModal(false)}
          targetUserId={request.created_by}
          targetUserName={profile.full_name || "Member"}
          matchingTags={tags.map(t => t.label)}
        />
      )}
    </>
  );
}
