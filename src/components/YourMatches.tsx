import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, MapPin, Award } from "lucide-react";
import { MentorBadge } from "@/components/MentorBadge";

interface MatchedMember {
  matched_user_id: string;
  overlapping_tags: string[];
  score: number;
  profile: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    short_bio: string | null;
    city: string | null;
    country: string | null;
    solutions_count: number;
  } | null;
  offers: { id: string; label: string }[];
  is_mentor: boolean;
}

export function YourMatches() {
  const { user } = useAuth();

  const { data: matches, isLoading } = useQuery({
    queryKey: ["your-matches", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Call the compute_matches function
      const { data: matchData, error: matchError } = await supabase.rpc(
        "compute_matches",
        { p_user_id: user.id }
      );

      if (matchError) throw matchError;
      if (!matchData || matchData.length === 0) return [];

      // Fetch profiles for top 5 matched users
      const topMatches = matchData.slice(0, 5);
      const matchedUserIds = topMatches.map((m: any) => m.matched_user_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, short_bio, city, country, solutions_count")
        .in("user_id", matchedUserIds);

      if (profilesError) throw profilesError;

      // Get offers for matched users
      const { data: offers } = await supabase
        .from("profile_offers")
        .select("user_id, tags:tag_id(id, label)")
        .in("user_id", matchedUserIds);

      // Check which members are mentors
      const { data: mentorProfiles } = await supabase
        .from("mentor_profiles")
        .select("user_id")
        .in("user_id", matchedUserIds)
        .eq("is_active", true)
        .eq("is_complete", true);

      const mentorUserIds = new Set(mentorProfiles?.map((m) => m.user_id) || []);

      // Map offers to users
      const offersMap = new Map<string, { id: string; label: string }[]>();
      offers?.forEach((o: any) => {
        if (o.tags) {
          const existing = offersMap.get(o.user_id) || [];
          existing.push(o.tags);
          offersMap.set(o.user_id, existing);
        }
      });

      return topMatches.map((match: any): MatchedMember => ({
        ...match,
        profile: profiles?.find((p) => p.user_id === match.matched_user_id) || null,
        offers: offersMap.get(match.matched_user_id) || [],
        is_mentor: mentorUserIds.has(match.matched_user_id),
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
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="font-display text-lg font-medium">Your matches</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Members who share similar interests, skills, or goals
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {matches.map((match) => (
          <Card
            key={match.matched_user_id}
            className="hover:shadow-elevated transition-shadow cursor-pointer relative"
          >
            <Link to={`/profile/${match.matched_user_id}`}>
              <CardContent className="p-4 text-center">
                {/* Subtle match indicator */}
                <Badge 
                  variant="secondary" 
                  className="absolute top-2 right-2 text-xs py-0 px-1.5 bg-primary/10 text-primary border-0"
                >
                  Match
                </Badge>
                
                <Avatar className="w-14 h-14 mx-auto mb-3 border border-border">
                  <AvatarImage src={match.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(match.profile?.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex items-center justify-center gap-1 mb-1">
                  <h3 className="font-display font-medium text-sm truncate">
                    {match.profile?.full_name?.split(" ")[0] || "Member"}
                  </h3>
                  {match.is_mentor && <MentorBadge size="sm" />}
                </div>

                {match.profile?.city && (
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-2">
                    <MapPin className="w-3 h-3" />
                    {match.profile.city}
                  </p>
                )}

                {match.profile?.solutions_count && match.profile.solutions_count > 0 && (
                  <p className="text-xs text-success flex items-center justify-center gap-1 mb-2">
                    <Award className="w-3 h-3" />
                    {match.profile.solutions_count}
                  </p>
                )}

                {/* Skills/Offers - show fewer */}
                {match.offers.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1">
                    {match.offers.slice(0, 2).map((offer) => (
                      <Badge key={offer.id} variant="default" className="text-xs">
                        {offer.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
