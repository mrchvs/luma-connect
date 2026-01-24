import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { MainNav } from "@/components/MainNav";
import { PrimaryCTA } from "@/components/PrimaryCTA";
import { CommunityAsksPreview } from "@/components/CommunityAsksPreview";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { MentorSetupPrompt } from "@/components/MentorSetupPrompt";
import { SessionIntentSelector, SessionIntent } from "@/components/SessionIntentSelector";
import { QuietModeBanner } from "@/components/QuietModeBanner";
import { CommunityRhythm } from "@/components/CommunityRhythm";
import { useIsMentor, useMentorProfile } from "@/hooks/use-mentor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { 
  Users, 
  Clock,
  CheckCircle2,
  AlertCircle,
  UsersRound,
  MessageCircle,
  ArrowRight,
  Compass,
} from "lucide-react";

// Intent-aware action cards
import { PeersIntentCard } from "@/components/dashboard/PeersIntentCard";
import { FocusedChatsIntentCard } from "@/components/dashboard/FocusedChatsIntentCard";
import { QuietModeCard } from "@/components/dashboard/QuietModeCard";

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
      setCurrentIntent(profile.current_intent as SessionIntent);
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

            {/* INTENT-BASED PRIMARY ACTION */}
            {!isQuietMode && (
              <div className="mb-6">
                {/* "Get perspective" → Ask the Community */}
                {currentIntent === "perspective" && (
                  <div className="ring-2 ring-primary/20 rounded-lg animate-slide-up">
                    <PrimaryCTA />
                  </div>
                )}

                {/* "Meet peers at my stage" → Journey Pods */}
                {currentIntent === "peers" && (
                  <PeersIntentCard />
                )}

                {/* "Focused 1:1 chats" → 1:1 Matching */}
                {currentIntent === "focused_chats" && (
                  <FocusedChatsIntentCard />
                )}

                {/* No intent selected - show gentle prompt */}
                {!currentIntent && (
                  <Card className="animate-slide-up border-dashed">
                    <CardContent className="py-8 text-center">
                      <Compass className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <h3 className="font-display font-medium mb-1">Choose your intention above</h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Your dashboard will adapt to show the most relevant actions
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Quiet mode - browse community card */}
            {isQuietMode && <QuietModeCard />}

            {/* SECONDARY: Community Rhythm (always visible, de-emphasized) */}
            <div className={currentIntent ? "opacity-80" : ""}>
              <CommunityRhythm />
            </div>

            {/* TERTIARY: Community Asks Preview (always visible, de-emphasized when intent is not perspective) */}
            <div className={`mb-6 ${currentIntent && currentIntent !== "perspective" ? "opacity-70" : ""}`}>
              <CommunityAsksPreview />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
