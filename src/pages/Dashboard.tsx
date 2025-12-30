import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { PendingRequestsSection } from "@/components/PendingRequestsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useUserNeeds, useUserOffers } from "@/hooks/use-tags";
import { 
  Users, 
  MessageSquare, 
  LogOut,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user, profile, loading, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: userNeeds } = useUserNeeds(user?.id);
  const { data: userOffers } = useUserOffers(user?.id);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (!loading && user && !profile?.completed) {
      navigate("/onboarding");
    }
  }, [user, profile, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

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
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-4">
          <Logo size="sm" />
          <nav className="flex items-center gap-2">
            <NotificationBell />
            {isAdmin && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin">Admin</Link>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </nav>
        </div>
      </header>

      <main className="container py-8 px-4">
        <div className="mb-8 animate-slide-up">
          <h1 className="font-display text-3xl font-semibold mb-2">
            Welcome back, {profile?.full_name?.split(" ")[0] || "there"}
          </h1>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${statusConfig[status].bg}`}>
            <StatusIcon className={`w-4 h-4 ${statusConfig[status].color}`} />
            <span className={`text-sm font-medium ${statusConfig[status].color}`}>
              {statusConfig[status].label}
            </span>
          </div>
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
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer animate-slide-up" style={{ animationDelay: "0.1s" }}>
                <Link to="/members">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-full bg-luma-lavender-light flex items-center justify-center mb-2">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="font-display">Members</CardTitle>
                    <CardDescription>
                      Browse all community members
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>

              <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer animate-slide-up" style={{ animationDelay: "0.15s" }}>
                <Link to="/matches">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-full bg-luma-lavender-light flex items-center justify-center mb-2">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="font-display">Your Matches</CardTitle>
                    <CardDescription>
                      View women matched to your needs
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>

              <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <Link to="/requests">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-full bg-luma-lavender-light flex items-center justify-center mb-2">
                      <MessageSquare className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="font-display">Requests</CardTitle>
                    <CardDescription>
                      Manage intro requests
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            </div>

            <PendingRequestsSection />
          </>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <CardHeader>
              <CardTitle className="font-display text-lg">What You Need</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {userNeeds?.map((tag) => (
                  <Badge key={tag.id} variant="secondary">{tag.label}</Badge>
                ))}
                {(!userNeeds || userNeeds.length === 0) && (
                  <p className="text-sm text-muted-foreground">No needs set yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
            <CardHeader>
              <CardTitle className="font-display text-lg">What You Offer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {userOffers?.map((tag) => (
                  <Badge key={tag.id}>{tag.label}</Badge>
                ))}
                {(!userOffers || userOffers.length === 0) && (
                  <p className="text-sm text-muted-foreground">No offers set yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
