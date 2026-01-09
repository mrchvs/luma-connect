import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { MainNav } from "@/components/MainNav";
import { PrimaryCTA } from "@/components/PrimaryCTA";
import { CommunityAsksPreview } from "@/components/CommunityAsksPreview";
import { SuggestedMembers } from "@/components/SuggestedMembers";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { MentorSetupPrompt } from "@/components/MentorSetupPrompt";
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
} from "lucide-react";

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  
  // Check mentor status
  const { data: isMentor } = useIsMentor(user?.id);
  const { data: mentorProfile } = useMentorProfile(user?.id);

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
            {/* Onboarding Checklist */}
            <OnboardingChecklist />

            {/* Mentor Setup Prompt - show if mentor but profile incomplete */}
            {isMentor && !mentorProfile?.is_complete && (
              <div className="mb-6">
                <MentorSetupPrompt variant="card" />
              </div>
            )}

            {/* Primary CTA - "Ask the Community" */}
            <div className="mb-6">
              <PrimaryCTA />
            </div>

            {/* Community Asks Preview */}
            <div className="mb-6">
              <CommunityAsksPreview />
            </div>

            {/* Explore Members - Simplified row */}
            <Card className="mb-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <CardContent className="py-5 px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-medium">Explore Members</h3>
                      <p className="text-sm text-muted-foreground">Discover new people in your circle</p>
                    </div>
                  </div>
                  <Button variant="outline" asChild className="gap-2 w-full sm:w-auto">
                    <Link to="/members">
                      Browse Directory
                      <Compass className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Discovery section */}
            <div className="mb-8">
              <SuggestedMembers />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
