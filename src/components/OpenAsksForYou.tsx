import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useUserOffers } from "@/hooks/use-tags";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HandHeart, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function OpenAsksForYou() {
  const { user } = useAuth();
  const { data: userOffers } = useUserOffers(user?.id);

  const { data: asks, isLoading } = useQuery({
    queryKey: ["open-asks-for-you", user?.id, userOffers],
    queryFn: async () => {
      if (!user || !userOffers || userOffers.length === 0) return [];

      const offerTagIds = userOffers.map(o => o.id);

      // First get requests with matching tags
      const { data: matchingRequests, error: matchError } = await supabase
        .from("request_tags")
        .select("request_id")
        .in("tag_id", offerTagIds);

      if (matchError) throw matchError;

      const matchingRequestIds = [...new Set(matchingRequests?.map(r => r.request_id) || [])];
      
      if (matchingRequestIds.length === 0) {
        // Fallback: get any open requests not by user
        const { data: anyRequests, error } = await supabase
          .from("requests")
          .select(`
            id, title, body, status, created_at, created_by,
            request_tags(tag_id, tags(id, label))
          `)
          .eq("status", "open")
          .neq("created_by", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) throw error;
        
        // Fetch profiles
        if (anyRequests && anyRequests.length > 0) {
          const creatorIds = [...new Set(anyRequests.map(r => r.created_by))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url")
            .in("user_id", creatorIds);

          return anyRequests.map(req => ({
            ...req,
            profile: profiles?.find(p => p.user_id === req.created_by)
          }));
        }
        return [];
      }

      // Get open requests that match user's offers
      const { data: requests, error } = await supabase
        .from("requests")
        .select(`
          id, title, body, status, created_at, created_by,
          request_tags(tag_id, tags(id, label))
        `)
        .in("id", matchingRequestIds)
        .eq("status", "open")
        .neq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      // Fetch profiles
      if (requests && requests.length > 0) {
        const creatorIds = [...new Set(requests.map(r => r.created_by))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", creatorIds);

        return requests.map(req => ({
          ...req,
          profile: profiles?.find(p => p.user_id === req.created_by)
        }));
      }

      return [];
    },
    enabled: !!user,
  });

  if (isLoading || !asks || asks.length === 0) return null;

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <Card className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <HandHeart className="w-5 h-5 text-primary" />
            Asks You Can Help With
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-primary">
            <Link to="/community-asks">
              View all
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {asks.slice(0, 3).map((ask) => (
          <Link 
            key={ask.id} 
            to="/community-asks"
            className="block p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={ask.profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(ask.profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {ask.title || ask.body.slice(0, 50) + (ask.body.length > 50 ? "..." : "")}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {ask.profile?.full_name || "Member"}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(ask.created_at), { addSuffix: true })}
                  </span>
                </div>
                {ask.request_tags && ask.request_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ask.request_tags.slice(0, 2).map((rt: any) => (
                      <Badge key={rt.tag_id} variant="secondary" className="text-xs py-0 px-1.5">
                        {rt.tags?.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
