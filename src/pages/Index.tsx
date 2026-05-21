import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen gradient-hero overflow-hidden">
      <header className="container flex items-center justify-between py-6 px-4">
        <Logo size="md" />
        {!loading && (
          user ? (
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          )
        )}
      </header>

      <main className="container px-4 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-luma-rose-light text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            For female founders ready to grow
          </div>

          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-semibold leading-tight text-foreground">
            The accountability cohort built for female{" "}
            <span className="text-gradient">founders</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A curated community where female founders commit to goals, stay accountable, and grow their businesses together—with structured support every step of the way.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              variant="premium"
              size="xl"
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto"
            >
              Apply to Join
              <ArrowRight className="w-5 h-5" />
            </Button>
            {user && (
              <Button
                variant="outline"
                size="xl"
                onClick={() => navigate("/dashboard")}
                className="w-full sm:w-auto"
              >
                Go to Dashboard
              </Button>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-8 pt-16">
            {[
              { icon: Target, title: "Accountability Cohorts", desc: "Join a monthly cohort, set meaningful goals, and check in with peers who hold you to them." },
              { icon: Users, title: "Peer Community", desc: "Connect with founders at your stage—no noise, no feed, just real relationships that move your business forward." },
              { icon: Sparkles, title: "Curated Network", desc: "Every member is reviewed. Every connection is intentional. Quality over quantity, always." },
            ].map((feature, i) => (
              <div key={i} className="text-center space-y-3 animate-slide-up" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
                <div className="w-14 h-14 rounded-full bg-luma-rose-light mx-auto flex items-center justify-center">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-xl font-medium">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* How It Works Section */}
          <div className="pt-24 space-y-12">
            <div className="text-center space-y-4">
              <h2 className="font-display text-3xl md:text-4xl font-semibold">How It Works</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Structured accountability in three simple steps</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "01", title: "Apply & Join a Cohort", desc: "Create your profile, share what you're building, and get matched with a cohort of founders at your stage." },
                { step: "02", title: "Set Goals & Show Up", desc: "Commit to monthly goals, check in weekly with your cohort, and celebrate progress together." },
                { step: "03", title: "Grow Your Business", desc: "With consistent accountability and peer support, turn your ambitions into measurable results." },
              ].map((item, i) => (
                <div key={i} className="relative p-6 rounded-2xl bg-card border border-border/50 space-y-4 animate-slide-up" style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
                  <span className="text-5xl font-display font-bold text-primary/20">{item.step}</span>
                  <h3 className="font-display text-xl font-medium">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="pt-24 pb-8">
            <div className="relative rounded-3xl bg-gradient-to-br from-primary/10 via-luma-rose-light to-luma-lavender-light p-12 md:p-16 text-center space-y-6 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
              <div className="relative z-10 space-y-6">
                <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold">
                  Ready to grow with support?
                </h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                  Join a cohort of ambitious female founders committed to holding each other accountable and building businesses that last.
                </p>
                <Button
                  variant="premium"
                  size="xl"
                  onClick={() => navigate("/auth")}
                  className="mt-4"
                >
                  Apply to Join
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="container py-8 px-4 text-center text-sm text-muted-foreground">
        © 2025 Luma Circle. All rights reserved.
      </footer>
    </div>
  );
}
