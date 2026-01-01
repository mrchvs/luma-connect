import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { MainNav } from "@/components/MainNav";
import { RequestIntroModal } from "@/components/RequestIntroModal";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Linkedin,
  Globe,
  Briefcase,
  Instagram,
  ExternalLink,
  Send,
  MapPin,
  Clock,
  Languages,
  Lock,
  CheckCircle2,
  User,
  Mail,
  Phone,
  Settings,
  ArrowLeft,
} from "lucide-react";

interface ProfileData {
  id: string;
  user_id: string;
  full_name: string | null;
  short_bio: string | null;
  bio_long: string | null;
  city: string | null;
  country: string | null;
  timezone: string | null;
  languages: string[] | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  portfolio_url: string | null;
  company_name: string | null;
  job_title: string | null;
  years_experience: number | null;
  avatar_url: string | null;
}

interface ProfileContacts {
  email: string | null;
  phone_number: string | null;
}

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const { user, profile: currentUserProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Check if current user is connected to this profile
  const { data: isConnected, isLoading: connectionLoading } = useQuery({
    queryKey: ["connection-check", user?.id, userId],
    queryFn: async () => {
      if (!user || !userId || userId === user.id) return true; // Own profile = connected

      const { data, error } = await supabase
        .from("intro_requests")
        .select("id")
        .eq("status", "accepted")
        .or(
          `and(requester_id.eq.${user.id},helper_id.eq.${userId}),and(helper_id.eq.${user.id},requester_id.eq.${userId})`
        )
        .limit(1);

      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
    enabled: !!user && !!userId,
  });

  // Fetch the profile
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data as ProfileData | null;
    },
    enabled: !!userId && !!user,
  });

  // Fetch contact info (RLS will only allow if connected or own profile)
  const { data: contactData } = useQuery({
    queryKey: ["profile-contacts", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("profile_contacts")
        .select("email, phone_number")
        .eq("user_id", userId)
        .maybeSingle();

      // If RLS blocks access, data will be null - that's expected
      if (error && error.code !== "PGRST116") {
        console.log("Contact info not accessible (expected for non-connected users)");
      }
      return data as ProfileContacts | null;
    },
    enabled: !!userId && !!user,
  });

  // Fetch offer tags for this profile
  const { data: offerTags } = useQuery({
    queryKey: ["profile-offers", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("profile_offers")
        .select("tags:tag_id(id, label)")
        .eq("user_id", userId);

      if (error) throw error;
      return data?.map((o: any) => o.tags).filter(Boolean) || [];
    },
    enabled: !!userId && !!user,
  });

  // Fetch need tags for this profile
  const { data: needTags } = useQuery({
    queryKey: ["profile-needs", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("profile_needs")
        .select("tags:tag_id(id, label)")
        .eq("user_id", userId);

      if (error) throw error;
      return data?.map((n: any) => n.tags).filter(Boolean) || [];
    },
    enabled: !!userId && !!user,
  });

  const isLoading = authLoading || connectionLoading || profileLoading;
  const isOwnProfile = userId === user?.id;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="container py-16 px-4 text-center">
          <User className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="font-display text-2xl mb-2">Profile Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This profile doesn't exist or you don't have permission to view it.
          </p>
          <Button asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </main>
      </div>
    );
  }

  // Mask data for non-connected users
  const displayName = isConnected
    ? profileData.full_name
    : profileData.full_name?.split(" ")[0];

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNav />

      <main className="container py-8 px-4 max-w-3xl">
        {/* Connection status banner */}
        {!isOwnProfile && (
          <div
            className={`mb-6 flex items-center gap-3 p-4 rounded-lg ${
              isConnected
                ? "bg-green-500/10 border border-green-500/30"
                : "bg-muted/50 border border-border"
            }`}
          >
            {isConnected ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-green-700 dark:text-green-400">
                    Connected
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You can see full profile details and contact information.
                  </p>
                </div>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">Limited View</p>
                  <p className="text-sm text-muted-foreground">
                    Request an intro to see full profile and contact details.
                  </p>
                </div>
                <Button
                  onClick={() => setShowRequestModal(true)}
                  disabled={currentUserProfile?.status !== "approved"}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Request Intro
                </Button>
              </>
            )}
          </div>
        )}

        {/* Profile header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <Avatar className="w-24 h-24 border-2 border-border">
                <AvatarImage src={profileData.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials(profileData.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-2xl font-semibold">
                      {displayName || "Member"}
                    </h1>
                    {!isConnected && !isOwnProfile && (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  {isOwnProfile && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/profile/settings">
                        <Settings className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Link>
                    </Button>
                  )}
                </div>

                {profileData.job_title && profileData.company_name && (
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    {profileData.job_title} at {profileData.company_name}
                    {profileData.years_experience && (
                      <span className="text-xs">
                        · {profileData.years_experience}+ years
                      </span>
                    )}
                  </p>
                )}

                {profileData.city && profileData.country && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {profileData.city}, {profileData.country}
                  </p>
                )}

                {profileData.timezone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {profileData.timezone}
                  </p>
                )}

                {profileData.languages && profileData.languages.length > 0 && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    {profileData.languages.join(", ")}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bio section */}
        {(profileData.short_bio || profileData.bio_long) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display text-lg">About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileData.short_bio && (
                <p className="text-muted-foreground">{profileData.short_bio}</p>
              )}
              {profileData.bio_long && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {profileData.bio_long}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tags section */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {offerTags && offerTags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Can Help With</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {offerTags.map((tag: any) => (
                    <Badge key={tag.id}>{tag.label}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {needTags && needTags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Looking For</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {needTags.map((tag: any) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Contact links - only for connected users */}
        {isConnected && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Contact & Links</CardTitle>
              <CardDescription>
                Connect with {displayName || "this member"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Direct contact info */}
              {(contactData?.email || contactData?.phone_number) && (
                <div className="flex flex-wrap gap-4 pb-4 border-b border-border">
                  {contactData.email && (
                    <a
                      href={`mailto:${contactData.email}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      {contactData.email}
                    </a>
                  )}
                  {contactData.phone_number && (
                    <a
                      href={`tel:${contactData.phone_number}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      {contactData.phone_number}
                    </a>
                  )}
                </div>
              )}
              
              {/* Social links */}
              <div className="flex flex-wrap gap-3">
                {profileData.linkedin_url && (
                  <Button variant="outline" asChild>
                    <a
                      href={profileData.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Linkedin className="w-4 h-4 mr-2" />
                      LinkedIn
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </Button>
                )}
                {profileData.instagram_url && (
                  <Button variant="outline" asChild>
                    <a
                      href={profileData.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Instagram className="w-4 h-4 mr-2" />
                      Instagram
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </Button>
                )}
                {profileData.website_url && (
                  <Button variant="outline" asChild>
                    <a
                      href={profileData.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Website
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </Button>
                )}
                {profileData.portfolio_url && (
                  <Button variant="outline" asChild>
                    <a
                      href={profileData.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Briefcase className="w-4 h-4 mr-2" />
                      Portfolio
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </Button>
                )}
                {!profileData.linkedin_url &&
                  !profileData.instagram_url &&
                  !profileData.website_url &&
                  !profileData.portfolio_url &&
                  !contactData?.email &&
                  !contactData?.phone_number && (
                    <p className="text-sm text-muted-foreground">
                      No contact links available.
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Locked contact section for non-connected */}
        {!isConnected && !isOwnProfile && (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="py-8 text-center">
              <Lock className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="font-display text-lg mb-2">Contact Info Hidden</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Request an intro to unlock full contact details and social links.
              </p>
              <Button
                onClick={() => setShowRequestModal(true)}
                disabled={currentUserProfile?.status !== "approved"}
              >
                <Send className="w-4 h-4 mr-2" />
                Request Intro
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Request modal */}
      {showRequestModal && profileData && (
        <RequestIntroModal
          open={showRequestModal}
          onOpenChange={setShowRequestModal}
          helper={{
            id: profileData.id,
            user_id: profileData.user_id,
            full_name: profileData.full_name || "Member",
            matchingTags: [],
          }}
        />
      )}
    </div>
  );
}
