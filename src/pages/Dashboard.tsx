import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { MainNav } from "@/components/MainNav";
import { PrimaryCTA } from "@/components/PrimaryCTA";
import { CommunityAsksPreview } from "@/components/CommunityAsksPreview";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Users,
  Clock,
  Compass,
  CheckCircle2,
  AlertCircle,
  Target,
  ArrowRight,
  Sparkles,
} from "lucide-react";

function getWeekOfMonth(date: Date) {
  return Math.min(4, Math.ceil(date.getDate() / 7));
}

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(false);
  const [inCohort, setInCohort] = useState(false);
  const [hasMonthlyGoal, setHasMonthlyGoal] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    if (!loading && user && !profile?.completed) navigate("/onboarding");
  }, [user, profile, loading, navigate]);

  // Show welcome modal exactly once after approval.
  // Primary flag is profile.welcome_shown (DB-backed, persists across devices).
  // localStorage is kept as a fast client-side guard against flash-of-modal
  // on the same device before the DB write resolves.
  useEffect(() => {
    if (!user || !profile || profile.status !== "approved") return;

    // DB flag takes priority — if already marked shown, never show again.
    if ((profile as any).welcome_shown === true) return;

    // Client-side guard (same browser session).
    const key = `welcome_shown_${user.id}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");

    // Persist to DB so other devices/browsers also skip it.
    supabase.from("profiles").update({ welcome_shown: true } as any).eq("user_id", user.id).then(() => {});

    // Check cohort membership and monthly goal, then show.
    Promise.all([
      supabase.from("accountability_cycle_members")
        .select("id").eq("user_id", user.id).maybeSingle(),
      supabase.from("accountability_monthly_goals")
        .select("id").eq("user_id", user.id).maybeSingle(),
    ]).then(([{ data: member }, { data: goal }]) => {
      setInCohort(!!member);
      setHasMonthlyGoal(!!goal);
      setShowWelcome(true);
    });
  }, [user, profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(180deg, #FAF6F0 0%, #F1E9FB 100%)" }}>
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
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #FAF6F0 0%, #F1E9FB 100%)" }}>
      <MainNav />

      <main className="container py-8 px-4 max-w-4xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8 animate-slide-up">
          <p className="text-xs font-bold tracking-widest uppercase text-primary mb-1">Home</p>
          <h1 className="font-display text-3xl font-semibold leading-tight">
            Welcome back, {profile?.full_name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
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
                    <Link to="/momentum">
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

      {/* Welcome modal — shown once after approval */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="max-w-md p-0 overflow-hidden" style={{ borderRadius: 20 }}>
          {/* Header gradient */}
          <div className="px-8 pt-8 pb-6 text-center" style={{ background: 'linear-gradient(150deg, #FFEDE5 0%, #F1E9FB 100%)' }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FF5C2A, #E94A1C)', boxShadow: '0 14px 36px #FF5C2A50' }}>
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h2 className="font-display text-2xl font-semibold mb-1" style={{ color: '#2A241F', letterSpacing: -0.4 }}>
              You're in, {profile?.full_name?.split(" ")[0] ?? ""}!
            </h2>
            <p className="text-sm" style={{ color: '#6B6259' }}>
              Welcome to Luma Circle. Your application has been approved.
            </p>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-4" style={{ background: '#fff' }}>
            {inCohort && !hasMonthlyGoal ? (
              <>
                <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: '#FFEDE5' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#FF5C2A20' }}>
                    <Target className="w-4 h-4" style={{ color: '#FF5C2A' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#2A241F' }}>You're in a Momentum cohort</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6B6259' }}>
                      Set your monthly goal to get the most out of Monday Momentum.
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => { setShowWelcome(false); navigate("/momentum"); }}
                  style={{ background: 'linear-gradient(135deg, #FF5C2A, #E94A1C)', borderRadius: 12, height: 48 }}
                >
                  Set my monthly goal <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setShowWelcome(false)}>
                  I'll do it later
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-center" style={{ color: '#6B6259' }}>
                  Explore the community, connect with other members, and share what you need.
                </p>
                <Button
                  className="w-full"
                  onClick={() => setShowWelcome(false)}
                  style={{ background: 'linear-gradient(135deg, #FF5C2A, #E94A1C)', borderRadius: 12, height: 48 }}
                >
                  Explore Luma Circle <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
