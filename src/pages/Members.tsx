import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Users,
  MapPin,
  Languages,
  Search,
  User,
} from "lucide-react";
import { useState } from "react";

interface MemberProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  short_bio: string | null;
  city: string | null;
  country: string | null;
  languages: string[] | null;
  avatar_url: string | null;
}

interface MemberWithTags extends MemberProfile {
  offers: { id: string; label: string }[];
  needs: { id: string; label: string }[];
}

export default function Members() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
    if (!authLoading && user && !profile?.completed) {
      navigate("/onboarding");
    }
    if (!authLoading && profile?.status !== "approved") {
      navigate("/dashboard");
    }
  }, [user, profile, authLoading, navigate]);

  // Fetch all approved members except current user
  const { data: members, isLoading } = useQuery({
    queryKey: ["members-list"],
    queryFn: async () => {
      if (!user) return [];

      // Get approved profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, short_bio, city, country, languages, avatar_url")
        .eq("status", "approved")
        .eq("completed", true)
        .neq("user_id", user.id);

      if (error) throw error;
      if (!profiles || profiles.length === 0) return [];

      const userIds = profiles.map((p) => p.user_id);

      // Get offers for all members
      const { data: offers } = await supabase
        .from("profile_offers")
        .select("user_id, tags:tag_id(id, label)")
        .in("user_id", userIds);

      // Get needs for all members
      const { data: needs } = await supabase
        .from("profile_needs")
        .select("user_id, tags:tag_id(id, label)")
        .in("user_id", userIds);

      // Map offers and needs to profiles
      const offersMap = new Map<string, { id: string; label: string }[]>();
      offers?.forEach((o: any) => {
        if (o.tags) {
          const existing = offersMap.get(o.user_id) || [];
          existing.push(o.tags);
          offersMap.set(o.user_id, existing);
        }
      });

      const needsMap = new Map<string, { id: string; label: string }[]>();
      needs?.forEach((n: any) => {
        if (n.tags) {
          const existing = needsMap.get(n.user_id) || [];
          existing.push(n.tags);
          needsMap.set(n.user_id, existing);
        }
      });

      return profiles.map((p): MemberWithTags => ({
        ...p,
        offers: offersMap.get(p.user_id) || [],
        needs: needsMap.get(p.user_id) || [],
      }));
    },
    enabled: !!user && profile?.status === "approved",
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

  // Filter members by search query
  const filteredMembers = members?.filter((member) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    
    const nameMatch = member.full_name?.toLowerCase().includes(query);
    const bioMatch = member.short_bio?.toLowerCase().includes(query);
    const locationMatch = `${member.city} ${member.country}`.toLowerCase().includes(query);
    const offersMatch = member.offers.some((o) => o.label.toLowerCase().includes(query));
    const needsMatch = member.needs.some((n) => n.label.toLowerCase().includes(query));
    const languagesMatch = member.languages?.some((l) => l.toLowerCase().includes(query));

    return nameMatch || bioMatch || locationMatch || offersMatch || needsMatch || languagesMatch;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Logo size="sm" />
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="container py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-semibold">Members</h1>
          </div>
          <p className="text-muted-foreground">
            Browse our community of {members?.length || 0} members
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, skill, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" text="Loading members..." />
          </div>
        ) : !filteredMembers || filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <User className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="font-display text-xl mb-2">No members found</h2>
              <p className="text-muted-foreground">
                {searchQuery ? "Try adjusting your search terms" : "Be the first to join!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredMembers.map((member) => (
              <Card
                key={member.id}
                className="hover:shadow-elevated transition-shadow cursor-pointer"
              >
                <Link to={`/profile/${member.user_id}`}>
                  <CardContent className="py-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-14 h-14 border border-border">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-display font-medium truncate">
                            {member.full_name?.split(" ")[0] || "Member"}
                          </h3>
                        </div>

                        {member.short_bio && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {member.short_bio}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                          {member.city && member.country && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {member.city}, {member.country}
                            </span>
                          )}
                          {member.languages && member.languages.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Languages className="w-3 h-3" />
                              {member.languages.slice(0, 3).join(", ")}
                              {member.languages.length > 3 && `+${member.languages.length - 3}`}
                            </span>
                          )}
                        </div>

                        {/* Skills/Offers */}
                        {member.offers.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {member.offers.slice(0, 4).map((offer) => (
                              <Badge key={offer.id} variant="default" className="text-xs">
                                {offer.label}
                              </Badge>
                            ))}
                            {member.offers.length > 4 && (
                              <Badge variant="secondary" className="text-xs">
                                +{member.offers.length - 4}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Needs */}
                        {member.needs.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {member.needs.slice(0, 3).map((need) => (
                              <Badge key={need.id} variant="secondary" className="text-xs">
                                {need.label}
                              </Badge>
                            ))}
                            {member.needs.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{member.needs.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
