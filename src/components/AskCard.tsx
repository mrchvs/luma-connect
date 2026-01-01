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
        <CardHeader className="pb-2">
          {/* Top row: Avatar, name, timestamp, status */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to={`/profile/${request.created_by}`} className="hover:opacity-80 transition-opacity">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <Link 
                    to={`/profile/${request.created_by}`}
                    className="font-medium text-sm hover:underline"
                  >
                    {profile?.full_name || "Member"}
                  </Link>
                  {isOwner && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      Your ask
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <AskStatusBadge status={request.status as "open" | "resolved" | "archived"} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {/* Second row: Title (emphasized) */}
          {request.title && (
            <h3 className="font-display text-base font-semibold leading-snug">{request.title}</h3>
          )}
          
          {/* Third row: Description (secondary, truncated) */}
          <p className="text-sm text-muted-foreground line-clamp-2">{request.body}</p>
          
          {/* Bottom row: Tags + Primary CTA */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <Badge key={tag.id} variant="secondary" className="text-xs">
                  {tag.label}
                </Badge>
              ))}
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {isOwner && request.status === "open" && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleMarkResolved}
                  disabled={isUpdating}
                  className="gap-1.5 text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mark resolved
                </Button>
              )}
              {!isOwner && request.status === "open" && (
                <div className="flex flex-col items-end gap-1">
                  <Button 
                    size="sm" 
                    onClick={() => setShowIntroModal(true)}
                    className="gap-1.5 text-xs"
                  >
                    <HandHeart className="w-3.5 h-3.5" />
                    Offer help
                  </Button>
                  <span className="text-[10px] text-muted-foreground">
                    Starts a private connection
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {showIntroModal && profile && (
        <RequestIntroModal
          open={showIntroModal}
          onOpenChange={(open) => !open && setShowIntroModal(false)}
          helper={{
            id: profile.user_id,
            user_id: request.created_by,
            full_name: profile.full_name || "Member",
            matchingTags: tags.map(t => t.label),
          }}
        />
      )}
    </>
  );
}
