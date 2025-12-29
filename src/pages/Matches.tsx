import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { RequestIntroModal } from "@/components/RequestIntroModal";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Sparkles,
  Linkedin,
  Globe,
  Briefcase,
  ExternalLink,
  Send,
  Bookmark,
  Users,
} from "lucide-react";

interface MatchedProfile {
  matched_user_id: string;
  score: number;
  overlapping_tags: string[];
  profile?: {
    id: string;
    full_name: string | null;
    short_bio: string | null;
    city: string | null;
    country: string | null;
    linkedin_url: string | null;
    website_url: string | null;
    portfolio_url: string | null;
    company_name: string | null;
    job_title: string | null;
    offers_labels?: string[];
  };
}

export default function Matches() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedHelper, setSelectedHelper] = useState<{
    id: string;
    user_id: string;
    full_name: string;
    matchingTags: string[];
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (!loading && profile?.status !== "approved") {
      toast({
        title: "Access restricted",
        description: "You need to be approved to view matches.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [user, profile, loading, navigate, toast]);

  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: ["matches", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Call the compute_matches function
      const { data: matchData, error: matchError } = await supabase.rpc(
        "compute_matches",
        { p_user_id: user.id }
      );

      if (matchError) throw matchError;
      if (!matchData || matchData.length === 0) return [];

      // Fetch profiles for matched users
      const matchedUserIds = matchData.map((m: any) => m.matched_user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, short_bio, city, country, linkedin_url, website_url, portfolio_url, company_name, job_title")
        .in("user_id", matchedUserIds);

      if (profilesError) throw profilesError;

      // Fetch offer tags for each profile
      const { data: offersData } = await supabase
        .from("profile_offers")
        .select("user_id, tags:tag_id(label)")
        .in("user_id", matchedUserIds);

      // Combine data
      const enrichedMatches = matchData.map((match: any) => {
        const matchProfile = profiles?.find((p) => p.user_id === match.matched_user_id);
        const userOffers = offersData?.filter((o) => o.user_id === match.matched_user_id) || [];
        const offersLabels = userOffers.map((o: any) => o.tags?.label).filter(Boolean);

        return {
          ...match,
          profile: matchProfile ? { ...matchProfile, offers_labels: offersLabels } : undefined,
        };
      });

      return enrichedMatches as MatchedProfile[];
    },
    enabled: !!user && profile?.status === "approved",
  });

  if (loading || matchesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Finding your matches..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="outline" size="sm" asChild>
              <Link to="/requests">My Requests</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="font-display text-3xl font-semibold">Your Matches</h1>
          </div>
          <p className="text-muted-foreground">
            Women who can help with what you need
          </p>
        </div>

        {!matches || matches.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="py-16 text-center">
              <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-display text-xl mb-2">No matches yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                We're looking for women who can help with what you need. 
                As more members join, you'll see matches here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <Card key={match.matched_user_id} className="overflow-hidden animate-scale-in">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-display text-xl">
                        {match.profile?.full_name || "Member"}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {match.profile?.city && match.profile?.country && (
                          <span>{match.profile.city}, {match.profile.country}</span>
                        )}
                        {match.profile?.job_title && match.profile?.company_name && (
                          <span className="block text-sm mt-0.5">
                            {match.profile.job_title} at {match.profile.company_name}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="font-medium">
                      {match.score} match{match.score !== 1 ? "es" : ""}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {match.profile?.short_bio && (
                    <p className="text-muted-foreground text-sm">
                      {match.profile.short_bio}
                    </p>
                  )}

                  {/* Why matched */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Why you matched
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {match.overlapping_tags?.map((tag) => (
                        <Badge key={tag} className="bg-primary/10 text-primary hover:bg-primary/20">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Offers */}
                  {match.profile?.offers_labels && match.profile.offers_labels.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Can help with
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {match.profile.offers_labels.map((label) => (
                          <Badge key={label} variant="outline" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Credibility links */}
                  {(match.profile?.linkedin_url || match.profile?.website_url || match.profile?.portfolio_url) && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {match.profile.linkedin_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={match.profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                            <Linkedin className="w-4 h-4 mr-1" />
                            LinkedIn
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </Button>
                      )}
                      {match.profile.website_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={match.profile.website_url} target="_blank" rel="noopener noreferrer">
                            <Globe className="w-4 h-4 mr-1" />
                            Website
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </Button>
                      )}
                      {match.profile.portfolio_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={match.profile.portfolio_url} target="_blank" rel="noopener noreferrer">
                            <Briefcase className="w-4 h-4 mr-1" />
                            Portfolio
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      className="flex-1"
                      onClick={() =>
                        setSelectedHelper({
                          id: match.profile?.id || "",
                          user_id: match.matched_user_id,
                          full_name: match.profile?.full_name || "Member",
                          matchingTags: match.overlapping_tags || [],
                        })
                      }
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Request Intro
                    </Button>
                    <Button variant="outline" size="icon">
                      <Bookmark className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {selectedHelper && (
        <RequestIntroModal
          open={!!selectedHelper}
          onOpenChange={(open) => !open && setSelectedHelper(null)}
          helper={selectedHelper}
        />
      )}
    </div>
  );
}
