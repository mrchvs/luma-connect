import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ArrowUp, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface AskCardProps {
  request: {
    id: string;
    title: string | null;
    body: string;
    status: string;
    created_at: string;
    created_by: string;
    upvote_count?: number;
    comment_count?: number;
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
  onOfferHelp?: () => void;
  style?: React.CSSProperties;
}

export function AskCard({ request, profile, isOwner, onOfferHelp, style }: AskCardProps) {
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const tags = request.request_tags?.map(rt => rt.tags) || [];
  const upvoteCount = request.upvote_count || 0;
  const commentCount = request.comment_count || 0;

  return (
    <Link 
      to={`/community-asks/${request.id}`}
      className="block"
    >
      <div 
        className={cn(
          "flex gap-4 p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors animate-slide-up",
          request.status === "resolved" && "opacity-70"
        )}
        style={style}
      >
        {/* Left column: Stats */}
        <div className="flex flex-col items-center gap-2 min-w-[56px] text-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-muted-foreground">
              <ArrowUp className="w-4 h-4" />
              <span className="text-sm font-medium">{upvoteCount}</span>
            </div>
            <span className="text-xs text-muted-foreground">votes</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">{commentCount}</span>
            </div>
            <span className="text-xs text-muted-foreground">answers</span>
          </div>
        </div>

        {/* Center column: Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="font-medium text-foreground mb-1 line-clamp-1">
            {request.title || request.body.slice(0, 60) + (request.body.length > 60 ? "..." : "")}
          </h3>
          
          {/* Description excerpt */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {request.body}
          </p>
          
          {/* Bottom row: Tags + Author + Time */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Topic tags */}
              {tags.slice(0, 3).map((tag, index) => (
                <Badge 
                  key={tag.id} 
                  variant={index === 0 ? "default" : "outline"} 
                  className="text-xs py-0 h-5"
                >
                  {tag.label}
                </Badge>
              ))}
            </div>

            {/* Author and time */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="h-5 w-5">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground/80">
                {profile?.full_name?.split(" ")[0] || "Member"}
              </span>
              <span>·</span>
              <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
              {isOwner && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 ml-1">
                  You
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Right column: CTA */}
        <div className="flex items-start flex-shrink-0">
          {!isOwner && request.status === "open" && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOfferHelp?.();
              }}
              className="h-8 text-xs whitespace-nowrap"
            >
              Reply
            </Button>
          )}
          {request.status === "resolved" && (
            <Badge variant="secondary" className="text-xs">
              Resolved
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}