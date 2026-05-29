import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Homepage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen gradient-hero">

      {/* NAV */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-4">
          <Link to="/homepage"><Logo size="sm" /></Link>
          {!loading && (
            user
              ? <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
              : <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Sign in</Button>
          )}
        </div>
      </header>

      <main className="container px-4 max-w-4xl mx-auto py-16 space-y-10 animate-slide-up">

        <div className="text-center space-y-3">
          <h1 className="font-display text-3xl md:text-4xl font-semibold leading-tight text-foreground">
            Welcome to Luma Circle
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Watch this short video to see how Monday Momentum works.
          </p>
        </div>

        {/* LOOM VIDEO */}
        <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border border-border/50" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src="https://www.loom.com/embed/b7f4be02537740488fafab6411889e82"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>

        <div className="text-center">
          <Button variant="premium" size="lg" onClick={() => navigate("/auth")} className="gap-2">
            Apply to join <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

      </main>

      <footer className="border-t border-border/50 py-6 text-center">
        <p className="text-sm text-muted-foreground">© 2026 Luma Circle. All rights reserved.</p>
      </footer>

    </div>
  );
}
