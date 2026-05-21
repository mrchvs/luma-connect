import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Forward auth callback tokens (password reset, invite, OAuth) to /auth
  useEffect(() => {
    if (window.location.hash.includes("access_token") || window.location.hash.includes("error_description")) {
      navigate("/auth" + window.location.hash, { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #FAF6F0 0%, #F1E9FB 100%)" }}>
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-4">
          <Link to="/">
            <Logo size="sm" />
          </Link>
          {!loading && (
            user ? (
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            )
          )}
        </div>
      </header>

      <main className="container px-4 py-16 max-w-4xl mx-auto">

        {/* Hero */}
        <div className="text-center space-y-5 animate-slide-up py-12">
          <p className="text-sm font-semibold tracking-widest text-primary uppercase">
            Momentum · Accountability Cohort
          </p>

          <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight text-foreground">
            Four weeks. One{" "}
            <span className="text-gradient italic">thing.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            A four-week rhythm to commit to one goal and move it forward, alongside women doing the same.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button variant="premium" onClick={() => navigate("/auth")} className="w-full sm:w-auto gap-2">
              Apply to Join
              <ArrowRight className="w-4 h-4" />
            </Button>
            {user && (
              <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full sm:w-auto">
                Go to Dashboard
              </Button>
            )}
          </div>
        </div>

        {/* Monthly goal feature */}
        <Card className="mt-4 border-accent/60 animate-slide-up" style={{ background: "#F1E9FB", animationDelay: "0.15s" }}>
          <CardContent className="py-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 text-lg">
              🎯
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-base font-medium">Your monthly goal — the north star</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Before week one starts, you set one meaningful goal for the month. Every weekly commitment you make should move this goal forward. It's your anchor — come back to it when you're deciding what to focus on each week.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Weekly rhythm */}
        <div className="grid md:grid-cols-3 gap-4 mt-4 animate-slide-up" style={{ animationDelay: "0.25s" }}>
          {[
            {
              tag: "Monday",
              tagColor: "#FF5C2A",
              title: "Live session",
              desc: "We meet as a group — review last week's reflections, celebrate wins, learn from what didn't work, and each set one commitment for the week ahead.",
            },
            {
              tag: "All week",
              tagColor: "#6B6259",
              title: "Move",
              desc: "Work on your one commitment. Keep it visible, keep it honest. Cheer on your cohort.",
            },
            {
              tag: "Sunday",
              tagColor: "#8B5CF6",
              title: "Reflect",
              desc: "5 min to write your honest reflection before Monday's session — what moved, what didn't, and why.",
            },
          ].map((item, i) => (
            <Card key={i} className="border-border/50 animate-slide-up" style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
              <CardContent className="py-6 space-y-2">
                <p className="text-xs font-bold tracking-widest uppercase" style={{ color: item.tagColor }}>
                  {item.tag}
                </p>
                <h3 className="font-display text-xl font-medium">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <Card className="mt-8 mb-8 border-primary/20 bg-primary/5 animate-slide-up" style={{ animationDelay: "0.5s" }}>
          <CardContent className="py-10 text-center space-y-4">
            <h2 className="font-display text-2xl md:text-3xl font-semibold">
              Ready to grow with support?
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              Join a cohort of ambitious female founders committed to holding each other accountable and building businesses that last.
            </p>
            <Button variant="premium" onClick={() => navigate("/auth")} className="gap-2 mt-2">
              Apply to Join
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </main>

      <footer className="container py-6 px-4 text-center text-sm text-muted-foreground border-t border-border/50">
        © 2025 Luma Circle. All rights reserved.
      </footer>
    </div>
  );
}
