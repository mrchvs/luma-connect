import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HandHeart, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AskPreview {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
  created_by: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  request_tags?: Array<{
    tag_id: string;
    tags: { id: string; label: string };
  }>;
}

export function CommunityAsksPreview() {
  const { user } = useAuth();

  const { data: asks, isLoading } = useQuery({
    queryKey: ["community-asks-preview", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get open requests not by current user
      const { data: requests, error } = await supabase
        .from("requests")
        .select(`
          id, title, body, created_at, created_by,
          request_tags(tag_id, tags(id, label))
        `)
        .eq("status", "open")
        .neq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(2);

      if (error) throw error;
      if (!requests?.length) return [];

      // Fetch profiles
      const creatorIds = [...new Set(requests.map((r) => r.created_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", creatorIds);

      return requests.map((req) => ({
        ...req,
        profile: profiles?.find((p) => p.user_id === req.created_by),
      })) as AskPreview[];
    },
    enabled: !!user,
  });

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading || !asks || asks.length === 0) {
    return null;
  }

  return (
    <Card className="animate-slide-up" style={{ animationDelay: "0.25s" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <HandHeart className="w-5 h-5 text-primary" />
            Community Asks
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link to="/community-asks" className="flex items-center gap-1">
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {asks.map((ask) => {
          const firstTag = ask.request_tags?.[0]?.tags;
          const displayText = ask.title || ask.body;
          const truncatedText = displayText.length > 60 
            ? displayText.slice(0, 60) + "..." 
            : displayText;

          return (
            <Link
              key={ask.id}
              to="/community-asks"
              className="block p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={ask.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(ask.profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">
                      {ask.profile?.full_name || "Member"}
                    </span>
                    {firstTag && (
                      <Badge variant="secondary" className="text-xs py-0 px-1.5">
                        {firstTag.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm line-clamp-1">{truncatedText}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(ask.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="flex-shrink-0 text-primary">
                  View ask
                </Button>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}