import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { MainNav } from "@/components/MainNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Sparkles } from "lucide-react";

export default function Matching() {
  const { user, profile, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
    if (!authLoading && user && !profile?.completed) {
      navigate("/onboarding");
    }
  }, [user, profile, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  // Admin users go to the matches page directly
  if (isAdmin) {
    navigate("/matches");
    return null;
  }

  // Non-admin users see coming soon state
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="container py-16 px-4 max-w-2xl mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-semibold mb-3">
          Matching is coming soon
        </h1>
        <p className="text-muted-foreground">
          We're working on smarter ways to help you discover relevant members.
        </p>
      </main>
    </div>
  );
}
