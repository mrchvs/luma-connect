import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight, Zap, Target,
  RefreshCw, Heart, BarChart2,
  CheckCircle2, Users,
} from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (window.location.hash.includes("access_token") || window.location.hash.includes("error_description")) {
      navigate("/auth" + window.location.hash, { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen gradient-hero">

      {/* NAV */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-4">
          <Link to="/"><Logo size="sm" /></Link>
          {!loading && (
            user
              ? <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
              : <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Sign in</Button>
          )}
        </div>
      </header>

      <main className="container px-4 max-w-4xl mx-auto">

        {/* HERO */}
        <section className="py-20 text-center space-y-6 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Users className="w-3.5 h-3.5" />
            For female founders, 1–5 years in
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight text-foreground">
            You have clients.<br />You have proof it works.<br />
            Now you need it to{" "}
            <span className="text-gradient italic">actually feel sustainable.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            You're doing it — but you're doing it alone. The juggling, the self-doubt, the weeks where everything feels urgent and nothing moves forward.
          </p>
          <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Monday Momentum is a four-week accountability cohort for solo female founders who are ready to grow with consistency — and stop feeling so isolated doing it.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button variant="premium" size="lg" onClick={() => navigate("/auth")} className="w-full sm:w-auto gap-2">
              Apply to join <ArrowRight className="w-4 h-4" />
            </Button>
            {user && (
              <Button variant="outline" size="lg" onClick={() => navigate("/dashboard")} className="w-full sm:w-auto">
                Go to Dashboard
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Applications reviewed within 48 hours · Next cohort starts soon
          </p>
        </section>

        {/* PAIN POINTS */}
        <section className="py-12 space-y-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <div className="text-center space-y-2">
            <h2 className="font-display text-2xl md:text-3xl font-semibold">Sound familiar?</h2>
            <p className="text-muted-foreground max-w-sm mx-auto text-sm">
              You're not struggling to start. You're struggling to <em>keep going</em> — with focus, stability, and people who get it.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              `"I have clients but I'm always reacting. I never feel like I'm building anything — just surviving week to week."`,
              `"I set goals every January. By February I'm already off track with no one to check in with."`,
              `"Being a solo founder is lonely. I miss having colleagues. People who actually understand what this life is like."`,
            ].map((quote, i) => (
              <Card key={i} className="border-primary/20 bg-primary/5">
                <CardContent className="py-5">
                  <p className="text-sm text-muted-foreground italic leading-relaxed">{quote}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* WHAT YOU GET */}
        <section className="py-12 space-y-8 animate-slide-up" style={{ animationDelay: "0.15s" }}>
          <div className="text-center space-y-2">
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">What Monday Momentum gives you</p>
            <h2 className="font-display text-2xl md:text-3xl font-semibold">
              Consistency. Connection. <span className="text-gradient">Progress.</span>
            </h2>
            <p className="text-muted-foreground max-w-sm mx-auto text-sm">
              A simple, structured rhythm you can actually sustain — with a group of women who hold you to what you said you'd do.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: RefreshCw, title: "Consistent momentum",  desc: "A four-week structure that makes showing up the default — not the exception. One goal, one rhythm, four weeks." },
              { icon: Heart,      title: "Real peer connection", desc: "A small, curated cohort of female founders at your stage. People who understand the juggle — and cheer you on anyway." },
              { icon: BarChart2,  title: "Measurable growth",   desc: "Stop circling the same goals. Commit publicly, reflect honestly, and actually move your business forward." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="py-6 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-display text-base font-medium">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* THE RHYTHM */}
        <section className="py-12 space-y-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Zap className="w-3.5 h-3.5" /> The Monday Momentum rhythm
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold">Four weeks. One goal. A group that holds you to it.</h2>
            <p className="text-muted-foreground max-w-sm mx-auto text-sm">
              No complicated systems. No endless content to catch up on. Just a weekly rhythm that keeps building.
            </p>
          </div>

          {/* North star */}
          <Card className="border-accent/60 bg-accent/30">
            <CardContent className="py-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-base font-medium">Before it starts — set your north star</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You choose one meaningful goal for the month. Not ten. One. Everything in the four weeks moves this forward. Your cohort knows what it is — and they'll ask about it.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Mon / Week / Sun */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { day: "Monday",   color: "text-primary",           title: "Live session", desc: "Review last week as a group — celebrate wins, learn from what didn't move, and set one clear commitment for the week ahead." },
              { day: "All week", color: "text-muted-foreground",   title: "Move",         desc: "Work your one commitment. Keep it visible, keep it honest. Cheer on your cohort when they share theirs." },
              { day: "Sunday",   color: "text-secondary-foreground", title: "Reflect",    desc: "Five minutes. What moved this week, what didn't, and why. Honest, private, and ready for Monday." },
            ].map(({ day, color, title, desc }, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="py-6 space-y-2">
                  <p className={`text-xs font-bold tracking-widest uppercase ${color}`}>{day}</p>
                  <h3 className="font-display text-xl font-medium">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section className="py-12 space-y-4 animate-slide-up" style={{ animationDelay: "0.25s" }}>
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground text-center">What members say</p>

          <Card className="border-l-4 border-l-primary border-border/50" style={{ borderRadius: "0 1.25rem 1.25rem 0" }}>
            <CardContent className="py-6 space-y-4">
              <p className="text-base italic text-foreground leading-relaxed">
                "That little bit of intentional pressure helps me cut through the noise and ask myself: what's really essential right now? By week three, I noticed a real shift in my productivity — simply because of the commitment to the group."
              </p>
              <div className="border-t border-border/50 pt-4">
                <p className="text-sm italic text-muted-foreground leading-relaxed">
                  The moment that really sold it for me was a week I was sick. Normally, that would've meant a slow, reluctant crawl back to my to-do list. Instead, the group gave me just enough pull to step right back in without the usual resistance. That alone was worth it.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary flex-shrink-0">M</div>
                <div>
                  <p className="text-sm font-medium text-foreground">Monday Momentum member</p>
                  <p className="text-xs text-muted-foreground">First-time accountability group · Joined May 2025</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5 text-center">
            <CardContent className="py-6">
              <p className="text-sm italic text-muted-foreground max-w-md mx-auto leading-relaxed">
                "Starting the week with the Monday morning session has become one of my favourite things — it sets the tone in the best way."
              </p>
            </CardContent>
          </Card>
        </section>

        {/* IS THIS FOR YOU */}
        <section className="py-12 space-y-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-center">This is for you if…</h2>
          <div className="max-w-lg mx-auto space-y-3">
            {[
              "You've been running your business for 1–5 years and have paying clients",
              "You're a solo founder — no team, no colleagues, no one checking in on you",
              "You want more consistency and less chaos in how you run your weeks",
              "You're craving real connection with women who actually get what this is like",
              "You're ready to commit to one goal and actually follow through on it",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 pb-20 animate-slide-up" style={{ animationDelay: "0.35s" }}>
          <Card className="border-primary/20 bg-primary/5 text-center">
            <CardContent className="py-12 space-y-4">
              <h2 className="font-display text-2xl md:text-3xl font-semibold">You don't have to grow alone.</h2>
              <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
                Join the next Monday Momentum cohort — a small group of female founders committed to showing up, moving forward, and supporting each other every week.
              </p>
              <div className="pt-2">
                <Button variant="premium" size="lg" onClick={() => navigate("/auth")} className="gap-2">
                  Apply to join <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Founded by Marie &amp; Jennifer · Cohorts are small and curated · Applications reviewed within 48 hours
              </p>
            </CardContent>
          </Card>
        </section>

      </main>

      <footer className="border-t border-border/50 py-6 text-center">
        <p className="text-sm text-muted-foreground">© 2025 Luma Circle. All rights reserved.</p>
      </footer>

    </div>
  );
}
