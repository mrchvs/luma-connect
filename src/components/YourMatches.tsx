import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, MapPin, MessageCircle, Award } from "lucide-react";
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
    solutions_count: number;
  } | null;
  offers: { id: string; label: string }[];
  matchingOffers: { id: string; label: string }[];
  is_mentor: boolean;
}

export function YourMatches() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
        .select("user_id, full_name, avatar_url, short_bio, city, country, languages, solutions_count")
        .in("user_id", matchedUserIds);

      if (profilesError) throw profilesError;

      // Get offers for matched users (what they can help with)
      const { data: offers } = await supabase
        .from("profile_offers")
        .select("user_id, tags:tag_id(id, label)")
        .in("user_id", matchedUserIds);

      // Get current user's needs (what they're looking for)
      const { data: userNeeds } = await supabase
        .from("profile_needs")
        .select("tags:tag_id(id, label)")
        .eq("user_id", user.id);

      const userNeedsLabels = new Set(
        userNeeds?.map((n: any) => n.tags?.label?.toLowerCase()).filter(Boolean) || []
      );

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

      return topMatches.map((match: any): MatchedMember => {
        const memberOffers = offersMap.get(match.matched_user_id) || [];
        // Find which of this member's offers match the user's needs
        const matchingOffers = memberOffers.filter(
          (offer) => userNeedsLabels.has(offer.label.toLowerCase())
        );
        
        return {
          ...match,
          profile: profiles?.find((p) => p.user_id === match.matched_user_id) || null,
          offers: memberOffers,
          matchingOffers,
          is_mentor: mentorUserIds.has(match.matched_user_id),
        };
      });
    },
    enabled: !!user,
  });

  if (isLoading || !matches || matches.length === 0) return null;

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Generate action-oriented match explanation based on needs/offers alignment
  const getMatchExplanation = (match: MatchedMember) => {
    // Priority 1: Direct match between user's needs and member's offers
    if (match.matchingOffers && match.matchingOffers.length > 0) {
      return {
        prefix: "Can help with what you're looking for:",
        topic: match.matchingOffers[0].label,
      };
    }
    
    // Priority 2: Member has relevant offers from overlapping tags
    if (match.overlapping_tags && match.overlapping_tags.length > 0) {
      return {
        prefix: "Offers support in:",
        topic: match.overlapping_tags[0],
      };
    }
    
    // Priority 3: Member has general offers
    if (match.offers && match.offers.length > 0) {
      return {
        prefix: "Has experience in:",
        topic: match.offers[0].label,
      };
    }
    
    return {
      prefix: "Experienced in topics you're exploring",
      topic: null,
    };
  };

  const handleAskForHelp = async (e: React.MouseEvent, matchedUserId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) return;
    
    // Navigate to inbox with the matched user to start a conversation
    navigate(`/inbox?user=${matchedUserId}`);
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="font-display text-lg font-medium">Your matches</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Members who can help with what you're looking for
      </p>
      
      {/* Same grid as main member cards: 2/3/4 columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {matches.map((match) => {
          const explanation = getMatchExplanation(match);
          const solutionsCount = match.profile?.solutions_count || 0;
          
          return (
            <Card
              key={match.matched_user_id}
              className="hover:shadow-elevated transition-shadow relative overflow-hidden"
            >
              <CardContent className="p-4 flex flex-col h-full">
                {/* Subtle match indicator - top right corner */}
                <Badge 
                  variant="secondary" 
                  className="absolute top-2 right-2 text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-0 font-normal"
                >
                  Match
                </Badge>
                
                {/* 1. Avatar + Name */}
                <div className="text-center mb-3">
                  <Avatar className="w-14 h-14 mx-auto mb-2 border border-border">
                    <AvatarImage src={match.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-base">
                      {getInitials(match.profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex items-center justify-center gap-1">
                    <h3 className="font-display font-medium truncate text-sm">
                      {match.profile?.full_name?.split(" ")[0] || "Member"}
                    </h3>
                    {match.is_mentor && <MentorBadge size="sm" />}
                  </div>
                </div>

                {/* 2. Location (subtle, secondary) */}
                {match.profile?.city && (
                  <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 mb-3">
                    <MapPin className="w-3 h-3" />
                    {match.profile.city}
                  </p>
                )}

                {/* 3. Highlighted match reason (hero element) */}
                <div className="bg-primary/5 rounded-md px-3 py-2 mb-3 flex-grow">
                  <p className="text-[11px] text-muted-foreground mb-0.5">
                    {explanation.prefix}
                  </p>
                  {explanation.topic && (
                    <p className="text-xs font-medium text-foreground">
                      {explanation.topic}
                    </p>
                  )}
                </div>

                {/* Optional trust signal */}
                {solutionsCount > 0 && (
                  <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mb-3">
                    <Award className="w-3 h-3" />
                    <span>{solutionsCount} solution{solutionsCount !== 1 ? 's' : ''} provided</span>
                  </div>
                )}

                {/* 4. Primary CTA: Ask for help */}
                <Button
                  size="sm"
                  className="w-full mb-2"
                  onClick={(e) => handleAskForHelp(e, match.matched_user_id)}
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                  Ask for help
                </Button>

                {/* 5. Secondary action: View profile */}
                <Link 
                  to={`/profile/${match.matched_user_id}`}
                  className="text-xs text-muted-foreground hover:text-foreground text-center transition-colors"
                >
                  View profile
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
