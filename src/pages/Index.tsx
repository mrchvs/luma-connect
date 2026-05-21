import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Sparkles, Target, Users } from "lucide-react";

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
    <div className="min-h-screen gradient-hero">
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
        <div className="text-center space-y-6 animate-slide-up py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            For female founders ready to grow
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight text-foreground">
            Connect with women who can help you{" "}
            <span className="text-gradient">grow</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            A curated community where female founders commit to goals, stay accountable, and grow their businesses together.
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

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-4 mt-8 animate-slide-up" style={{ animationDelay: "0.15s" }}>
          {[
            { icon: Target, title: "Accountability Cohorts", desc: "Join a monthly cohort, set meaningful goals, and check in with peers who hold you to them." },
            { icon: Users, title: "Peer Community", desc: "Connect with founders at your stage—no noise, no feed, just real relationships that move your business forward." },
            { icon: Sparkles, title: "Curated Network", desc: "Every member is reviewed. Every connection is intentional. Quality over quantity, always." },
          ].map((feature, i) => (
            <Card key={i} className="border-border/50 animate-slide-up" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
              <CardContent className="py-6 space-y-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display text-base font-medium">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How It Works */}
        <div className="mt-16 space-y-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-semibold">How It Works</h2>
            <p className="text-muted-foreground text-sm">Structured accountability in three steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: "01", title: "Apply & Join a Cohort", desc: "Create your profile, share what you're building, and get matched with a cohort of founders at your stage." },
              { step: "02", title: "Set Goals & Show Up", desc: "Commit to monthly goals, check in weekly with your cohort, and celebrate progress together." },
              { step: "03", title: "Grow Your Business", desc: "With consistent accountability and peer support, turn your ambitions into measurable results." },
            ].map((item, i) => (
              <Card key={i} className="border-border/50 animate-slide-up" style={{ animationDelay: `${0.35 + i * 0.1}s` }}>
                <CardContent className="py-6 space-y-3">
                  <span className="text-3xl font-display font-bold text-primary/20">{item.step}</span>
                  <h3 className="font-display text-base font-medium">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Card className="mt-16 mb-8 border-primary/20 bg-primary/5 animate-slide-up" style={{ animationDelay: "0.5s" }}>
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
