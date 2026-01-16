import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, MapPin } from "lucide-react";
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
    languages: string[] | null;
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
        .select("user_id, full_name, avatar_url, short_bio, city, country, languages")
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

  // Generate human-readable match explanation from overlapping tags
  const getMatchExplanation = (overlappingTags: string[]) => {
    if (!overlappingTags || overlappingTags.length === 0) {
      return "Overlapping skills and goals";
    }
    const displayTags = overlappingTags.slice(0, 2);
    return `Shared interests: ${displayTags.join(", ")}`;
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
      
      {/* Same grid as main member cards: 2/3/4 columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {matches.map((match) => (
          <Card
            key={match.matched_user_id}
            className="hover:shadow-elevated transition-shadow cursor-pointer relative"
          >
            <Link to={`/profile/${match.matched_user_id}`}>
              <CardContent className="p-4 text-center">
                {/* Subtle match indicator - top right corner */}
                <Badge 
                  variant="secondary" 
                  className="absolute top-2 right-2 text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-0 font-normal"
                >
                  Match
                </Badge>
                
                {/* Same avatar size as member cards: 16x16 (w-16 h-16) */}
                <Avatar className="w-16 h-16 mx-auto mb-3 border border-border">
                  <AvatarImage src={match.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {getInitials(match.profile?.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex items-center justify-center gap-1 mb-1">
                  <h3 className="font-display font-medium truncate">
                    {match.profile?.full_name?.split(" ")[0] || "Member"}
                  </h3>
                  {match.is_mentor && <MentorBadge size="sm" />}
                </div>

                {match.profile?.city && match.profile?.country && (
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-2">
                    <MapPin className="w-3 h-3" />
                    {match.profile.city}
                  </p>
                )}

                {match.profile?.languages && match.profile.languages.length > 0 && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {match.profile.languages.slice(0, 2).join(", ")}
                  </p>
                )}

                {/* Why matched - subtle explanation */}
                <p className="text-[11px] text-muted-foreground/80 italic mb-2 line-clamp-1">
                  {getMatchExplanation(match.overlapping_tags)}
                </p>

                {/* Skills/Offers - same as member cards */}
                {match.offers.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1">
                    {match.offers.slice(0, 2).map((offer) => (
                      <Badge key={offer.id} variant="default" className="text-xs">
                        {offer.label}
                      </Badge>
                    ))}
                    {match.offers.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{match.offers.length - 2}
                      </Badge>
                    )}
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
