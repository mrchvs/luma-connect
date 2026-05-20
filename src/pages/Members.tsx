import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { MainNav } from "@/components/MainNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Users,
  MapPin,
  Languages,
  Search,
  User,
  Filter,
  X,
  ChevronDown,
  LayoutGrid,
  LayoutList,
  Award,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MentorBadge } from "@/components/MentorBadge";
import { YourMatches } from "@/components/YourMatches";
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
  is_mentor?: boolean;
}

const ITEMS_PER_PAGE = 12;

export default function Members() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [selectedNeed, setSelectedNeed] = useState<string>("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [memberTab, setMemberTab] = useState<"all" | "mentors">("all");
  const loadMoreRef = useRef<HTMLDivElement>(null);

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

      // Check which members are mentors
      const { data: mentorProfiles } = await supabase
        .from("mentor_profiles")
        .select("user_id")
        .in("user_id", userIds)
        .eq("is_active", true)
        .eq("is_complete", true);

      const mentorUserIds = new Set(mentorProfiles?.map((m) => m.user_id) || []);

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
        is_mentor: mentorUserIds.has(p.user_id),
      }));
    },
    enabled: !!user && profile?.status === "approved",
  });

  // Extract unique filter options from members data
  const filterOptions = useMemo(() => {
    if (!members) return { skills: [], needs: [], languages: [] };

    const skillsSet = new Set<string>();
    const needsSet = new Set<string>();
    const languagesSet = new Set<string>();

    members.forEach((m) => {
      m.offers.forEach((o) => skillsSet.add(o.label));
      m.needs.forEach((n) => needsSet.add(n.label));
      m.languages?.forEach((l) => languagesSet.add(l));
    });

    return {
      skills: Array.from(skillsSet).sort(),
      needs: Array.from(needsSet).sort(),
      languages: Array.from(languagesSet).sort(),
    };
  }, [members]);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Filter members by search query and filters
  const filteredMembers = useMemo(() => {
    if (!members) return [];

    return members.filter((member) => {
      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = member.full_name?.toLowerCase().includes(query);
        const bioMatch = member.short_bio?.toLowerCase().includes(query);
        const locationMatch = `${member.city} ${member.country}`.toLowerCase().includes(query);
        const offersMatch = member.offers.some((o) => o.label.toLowerCase().includes(query));
        const needsMatch = member.needs.some((n) => n.label.toLowerCase().includes(query));
        const languagesMatch = member.languages?.some((l) => l.toLowerCase().includes(query));

        if (!nameMatch && !bioMatch && !locationMatch && !offersMatch && !needsMatch && !languagesMatch) {
          return false;
        }
      }

      // Skill filter
      if (selectedSkill && !member.offers.some((o) => o.label === selectedSkill)) {
        return false;
      }

      // Need filter
      if (selectedNeed && !member.needs.some((n) => n.label === selectedNeed)) {
        return false;
      }

      // Language filter (multi-select - member must have at least one of the selected languages)
      if (selectedLanguages.length > 0) {
        const memberLanguages = member.languages || [];
        const hasMatchingLanguage = selectedLanguages.some((lang) => memberLanguages.includes(lang));
        if (!hasMatchingLanguage) {
          return false;
        }
      }

      return true;
    });
  }, [members, searchQuery, selectedSkill, selectedNeed, selectedLanguages]);


  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [searchQuery, selectedSkill, selectedNeed, selectedLanguages, memberTab]);

  // Filter by member tab (all vs mentors only)
  const tabFilteredMembers = useMemo(() => {
    if (memberTab === "mentors") {
      return filteredMembers.filter(m => m.is_mentor);
    }
    return filteredMembers;
  }, [filteredMembers, memberTab]);

  // Paginated members for display
  const displayedMembers = useMemo(() => {
    return tabFilteredMembers.slice(0, displayCount);
  }, [tabFilteredMembers, displayCount]);

  const hasMore = displayCount < tabFilteredMembers.length;

  // Count mentors for the tab badge
  const mentorCount = useMemo(() => {
    return filteredMembers.filter(m => m.is_mentor).length;
  }, [filteredMembers]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore]);

  const clearFilters = useCallback(() => {
    setSelectedSkill("");
    setSelectedNeed("");
    setSelectedLanguages([]);
    setSearchQuery("");
  }, []);

  const activeFilterCount = [selectedSkill, selectedNeed].filter(Boolean).length + (selectedLanguages.length > 0 ? 1 : 0);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />

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

        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, skill, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* View toggle */}
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "list" | "grid")}>
              <ToggleGroupItem value="list" aria-label="List view">
                <LayoutList className="w-4 h-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <LayoutGrid className="w-4 h-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                  <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>

          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleContent>
              <Card>
                <CardContent className="pt-4">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Can help with</label>
                      <Select value={selectedSkill || "all"} onValueChange={(v) => setSelectedSkill(v === "all" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any skill offered" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any skill offered</SelectItem>
                          {filterOptions.skills.map((skill) => (
                            <SelectItem key={skill} value={skill}>
                              {skill}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Looking for</label>
                      <Select value={selectedNeed || "all"} onValueChange={(v) => setSelectedNeed(v === "all" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any need" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any need</SelectItem>
                          {filterOptions.needs.map((need) => (
                            <SelectItem key={need} value={need}>
                              {need}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <MultiSelectFilter
                      options={filterOptions.languages}
                      selected={selectedLanguages}
                      onChange={setSelectedLanguages}
                      placeholder="Any language"
                      label="Languages"
                    />
                  </div>

                  {activeFilterCount > 0 && (
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Showing {filteredMembers.length} of {members?.length || 0} members
                      </p>
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                        <X className="w-3 h-3" />
                        Clear filters
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Active filter badges */}
          {activeFilterCount > 0 && !filtersOpen && (
            <div className="flex flex-wrap gap-2">
              {selectedSkill && (
                <Badge variant="secondary" className="gap-1">
                  Skill: {selectedSkill}
                  <button onClick={() => setSelectedSkill("")}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {selectedNeed && (
                <Badge variant="secondary" className="gap-1">
                  Need: {selectedNeed}
                  <button onClick={() => setSelectedNeed("")}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {selectedLanguages.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {selectedLanguages.length === 1 ? selectedLanguages[0] : `${selectedLanguages.length} languages`}
                  <button onClick={() => setSelectedLanguages([])}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Your Matches Section */}
        <YourMatches />

        {/* Member/Mentor Tabs */}
        <Tabs value={memberTab} onValueChange={(v) => setMemberTab(v as "all" | "mentors")} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">
              All Members
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {filteredMembers.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="mentors">
              Mentors
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {mentorCount}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" text="Loading members..." />
          </div>
        ) : !tabFilteredMembers || tabFilteredMembers.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <User className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="font-display text-xl mb-2">
                {memberTab === "mentors" ? "No mentors found" : "No members found"}
              </h2>
              <p className="text-muted-foreground mb-4">
                {searchQuery || activeFilterCount > 0
                  ? "Try adjusting your search or filters"
                  : memberTab === "mentors" 
                    ? "There are no mentors matching your criteria"
                    : "Be the first to join!"}
              </p>
              {(searchQuery || activeFilterCount > 0) && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear all filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === "list" ? (
              /* List View */
              <div className="grid gap-4">
                {displayedMembers.map((member) => (
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
                              {member.is_mentor && <MentorBadge size="sm" />}
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
            ) : (
              /* Grid View */
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayedMembers.map((member) => (
                  <Card
                    key={member.id}
                    className="hover:shadow-elevated transition-shadow cursor-pointer"
                  >
                    <Link to={`/profile/${member.user_id}`}>
                      <CardContent className="p-4 text-center">
                        <Avatar className="w-16 h-16 mx-auto mb-3 border border-border">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-lg">
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex items-center justify-center gap-1 mb-1">
                          <h3 className="font-display font-medium truncate">
                            {member.full_name?.split(" ")[0] || "Member"}
                          </h3>
                          {member.is_mentor && <MentorBadge size="sm" />}
                        </div>

                        {member.city && member.country && (
                          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-2">
                            <MapPin className="w-3 h-3" />
                            {member.city}
                          </p>
                        )}

                        {member.languages && member.languages.length > 0 && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {member.languages.slice(0, 2).join(", ")}
                          </p>
                        )}

                        {/* Skills/Offers - show fewer in grid */}
                        {member.offers.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1">
                            {member.offers.slice(0, 2).map((offer) => (
                              <Badge key={offer.id} variant="default" className="text-xs">
                                {offer.label}
                              </Badge>
                            ))}
                            {member.offers.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{member.offers.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            )}

            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                <LoadingSpinner size="sm" text="Loading more..." />
              </div>
            )}

            {!hasMore && filteredMembers.length > ITEMS_PER_PAGE && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Showing all {filteredMembers.length} members
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
