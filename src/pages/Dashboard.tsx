import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { MainNav } from "@/components/MainNav";
import { PrimaryCTA } from "@/components/PrimaryCTA";
import { CommunityAsksPreview } from "@/components/CommunityAsksPreview";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  Users,
  Clock,
  Compass,
  CheckCircle2,
  AlertCircle,
  Target,
  ArrowRight,
} from "lucide-react";

function getWeekOfMonth(date: Date) {
  return Math.min(4, Math.ceil(date.getDate() / 7));
}

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

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
            {/* Primary CTA - "Ask the Community" */}
            <div className="mb-6">
              <PrimaryCTA />
            </div>

            {/* Monday Momentum */}
            <Card className="mb-6 animate-slide-up border-primary/20 bg-primary/5" style={{ animationDelay: "0.15s" }}>
              <CardContent className="py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-medium">Monday Momentum</h3>
                      <p className="text-sm text-muted-foreground">
                        Week {getWeekOfMonth(new Date())} of 4 · Set your commitment or log your reflection
                      </p>
                    </div>
                  </div>
                  <Button asChild className="gap-2">
                    <Link to="/accountability">
                      Open
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Community Asks Preview */}
            <div className="mb-6">
              <CommunityAsksPreview />
            </div>

            {/* Explore Members */}
            <Card className="mb-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <CardContent className="py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-medium">Explore Members</h3>
                      <p className="text-sm text-muted-foreground">Discover people in your circle</p>
                    </div>
                  </div>
                  <Button variant="outline" asChild className="gap-2">
                    <Link to="/members">
                      Browse
                      <Compass className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
