import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, ArrowRight } from "lucide-react";

export function SuggestedMembers() {
  const { user } = useAuth();

  const { data: matches, isLoading } = useQuery({
    queryKey: ["suggested-members", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Call the compute_matches function
      const { data: matchData, error: matchError } = await supabase.rpc(
        "compute_matches",
        { p_user_id: user.id }
      );

      if (matchError) throw matchError;
      if (!matchData || matchData.length === 0) return [];

      // Fetch profiles for top 3 matched users
      const topMatches = matchData.slice(0, 3);
      const matchedUserIds = topMatches.map((m: any) => m.matched_user_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, short_bio, job_title, company_name")
        .in("user_id", matchedUserIds);

      if (profilesError) throw profilesError;

      return topMatches.map((match: any) => ({
        ...match,
        profile: profiles?.find((p) => p.user_id === match.matched_user_id),
      }));
    },
    enabled: !!user,
  });

  if (isLoading || !matches || matches.length === 0) return null;

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Suggested Connections
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-primary">
            <Link to="/matches">
              View all
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {matches.map((match: any) => (
          <Link 
            key={match.matched_user_id} 
            to={`/profile/${match.matched_user_id}`}
            className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-colors"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={match.profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {getInitials(match.profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {match.profile?.full_name || "Member"}
              </p>
              {match.profile?.job_title && match.profile?.company_name && (
                <p className="text-xs text-muted-foreground truncate">
                  {match.profile.job_title} at {match.profile.company_name}
                </p>
              )}
              <div className="flex flex-wrap gap-1 mt-1">
                {match.overlapping_tags?.slice(0, 2).map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs py-0 px-1.5">
                    {tag}
                  </Badge>
                ))}
                {match.overlapping_tags?.length > 2 && (
                  <Badge variant="outline" className="text-xs py-0 px-1.5">
                    +{match.overlapping_tags.length - 2}
                  </Badge>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {match.score} match{match.score !== 1 ? "es" : ""}
            </Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
