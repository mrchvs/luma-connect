import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { MainNav } from "@/components/MainNav";
import { PrimaryCTA } from "@/components/PrimaryCTA";
import { CommunityAsksPreview } from "@/components/CommunityAsksPreview";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { MentorSetupPrompt } from "@/components/MentorSetupPrompt";
import { SessionIntentSelector, SessionIntent } from "@/components/SessionIntentSelector";
import { QuietModeBanner } from "@/components/QuietModeBanner";
import { CommunityRhythm } from "@/components/CommunityRhythm";
import { StructuredMatchingCard } from "@/components/StructuredMatchingCard";
import { PodMatchingCard } from "@/components/PodMatchingCard";
import { useIsMentor, useMentorProfile } from "@/hooks/use-mentor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { 
  Users, 
  Clock,
  Compass,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MessageCircle,
} from "lucide-react";

export default function Dashboard() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [currentIntent, setCurrentIntent] = useState<SessionIntent>(null);
  
  // Check mentor status
  const { data: isMentor } = useIsMentor(user?.id);
  const { data: mentorProfile } = useMentorProfile(user?.id);

  // Sync current intent from profile
  useEffect(() => {
    if (profile?.current_intent) {
      setCurrentIntent(profile.current_intent);
    }
  }, [profile]);

  const handleIntentChange = async (intent: SessionIntent) => {
    setCurrentIntent(intent);
    await refreshProfile();
  };

  const isQuietMode = currentIntent === "quiet";
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (!loading && user && !profile?.completed) {
      navigate("/onboarding");
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  const statusConfig = {
    pending_review: { icon: Clock, color: "text-warning", bg: "bg-warning/10", label: "Under Review" },
    approved: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Approved" },
    rejected: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Rejected" },
    suspended: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Suspended" },
  };

  const status = profile?.status || "pending_review";
  const StatusIcon = statusConfig[status].icon;

  return (
    <div className="min-h-screen gradient-hero">
      <MainNav />

      <main className="container py-8 px-4 max-w-4xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8 animate-slide-up">
          <h1 className="font-display text-3xl font-semibold mb-1">
            Welcome back, {profile?.full_name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening in your circle today
          </p>
        </div>

        {status === "pending_review" && (
          <Card className="mb-8 border-warning/30 bg-warning/5 animate-scale-in">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Profile Under Review</h3>
                <p className="text-sm text-muted-foreground">
                  Thank you — your profile is under review. We'll notify you when approved.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {status === "approved" && (
          <>
            {/* Session Intent Selector */}
            <SessionIntentSelector onIntentChange={handleIntentChange} />

            {/* Quiet Mode Banner */}
            {isQuietMode && <QuietModeBanner />}

            {/* Onboarding Checklist */}
            <OnboardingChecklist />

            {/* Mentor Setup Prompt - show if mentor but profile incomplete */}
            {isMentor && !mentorProfile?.is_complete && (
              <div className="mb-6">
                <MentorSetupPrompt variant="card" />
              </div>
            )}

            {/* Adaptive CTAs based on intent */}
            {!isQuietMode && (
              <>
                {/* Primary CTA - "Ask the Community" - highlighted for "perspective" intent */}
                {(currentIntent === "perspective" || !currentIntent) && (
                  <div className={`mb-6 ${currentIntent === "perspective" ? "ring-2 ring-primary/20 rounded-lg" : ""}`}>
                    <PrimaryCTA />
                  </div>
                )}

                {/* Explore Members - highlighted for "peers" intent */}
                {(currentIntent === "peers" || !currentIntent) && (
                  <Card className={`mb-6 animate-slide-up ${currentIntent === "peers" ? "ring-2 ring-primary/20" : ""}`} style={{ animationDelay: "0.1s" }}>
                    <CardContent className="py-5 px-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-display text-base font-medium">Meet Peers at Your Stage</h3>
                            <p className="text-sm text-muted-foreground">Connect with founders in similar phases</p>
                          </div>
                        </div>
                        <Button variant={currentIntent === "peers" ? "default" : "outline"} asChild className="gap-2 w-full sm:w-auto">
                          <Link to="/members">
                            Browse Members
                            <Users className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Your Matches - highlighted for "focused_chats" intent */}
                {(currentIntent === "focused_chats" || !currentIntent) && (
                  <Card className={`mb-6 animate-slide-up ${currentIntent === "focused_chats" ? "ring-2 ring-primary/20" : ""}`} style={{ animationDelay: "0.15s" }}>
                    <CardContent className="py-5 px-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-display text-base font-medium">Your Matches</h3>
                            <p className="text-sm text-muted-foreground">Members who can help with what you're looking for</p>
                          </div>
                        </div>
                        <Button variant={currentIntent === "focused_chats" ? "default" : "outline"} asChild className="gap-2 w-full sm:w-auto">
                          <Link to="/members">
                            View Matches
                            <MessageCircle className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Structured Matching Card */}
            <StructuredMatchingCard />

            {/* Pod Matching Card */}
            <PodMatchingCard />

            {/* Community Rhythm Events */}
            <CommunityRhythm />

            {/* Community Asks Preview */}
            <div className="mb-6">
              <CommunityAsksPreview />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
