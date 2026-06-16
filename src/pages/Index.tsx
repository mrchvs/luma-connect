import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight, Zap, Target,
  RefreshCw, Heart, BarChart2,
  CheckCircle2, Users,
} from "lucide-react";

// ── Programme facts ─────────────────────────────────────────────
// Edit these to confirm the public-facing details in one place.
const COHORT_SIZE = 8;                  // placeholder — confirm real number
const FORMAT = "Online";
const TIME_COMMITMENT = "~1 hr per week";
const PRICING_LABEL = "Paid programme";
const COHORT = "2026 cohort";           // generic attribution for anonymous quotes
// ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Persists an applicant's email (lead capture) before sending them into the
// application flow. Backed by the `capture-applicant` edge function, which
// inserts into the `applicants` table with the service role.
async function persistApplicantEmail(email: string): Promise<void> {
  const { error } = await supabase.functions.invoke("capture-applicant", {
    body: { email, source: "landing_hero" },
  });
  if (error) throw error;
}

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (window.location.hash.includes("access_token") || window.location.hash.includes("error_description")) {
      navigate("/auth" + window.location.hash, { replace: true });
    }
  }, [navigate]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setStatus("error");
      setFormError("Please enter a valid email address.");
      return;
    }
    setStatus("submitting");
    setFormError("");
    // Persist immediately (best-effort — a capture failure must never block a
    // real applicant), then continue to the application with the email pre-filled.
    try {
      await persistApplicantEmail(value);
    } catch (err) {
      console.error("[apply] email capture failed, continuing anyway:", err);
    }
    setStatus("success");
    navigate(`/auth?apply=1&email=${encodeURIComponent(value)}`);
  };

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
            You built something real.<br />
            Now{" "}
            <span className="italic text-primary">build the momentum to keep going.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Four weeks. One goal. A small group of women who hold you to it.
          </p>

          {/* Inline email capture — side-by-side on desktop, stacked full-width on mobile */}
          <div className="max-w-md mx-auto space-y-2">
            <form onSubmit={handleApply} className="flex flex-col sm:flex-row items-stretch gap-3">
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@yourbusiness.com"
                aria-label="Email address"
                aria-invalid={status === "error"}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") { setStatus("idle"); setFormError(""); }
                }}
                className="h-12 rounded-full px-5 text-base bg-background sm:flex-1"
              />
              <Button
                type="submit"
                variant="premium"
                size="lg"
                disabled={status === "submitting"}
                className="w-full sm:w-auto gap-2 shrink-0"
              >
                {status === "submitting" ? "Submitting…" : <>Apply to join <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </form>
            <div aria-live="polite" className="min-h-[1.25rem]">
              {status === "error" && (
                <p className="text-xs text-destructive">{formError}</p>
              )}
              {status === "success" && (
                <p className="text-xs text-primary">Thanks — taking you to your application…</p>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground/80">
              Quick sign-up · 3-min application · We reply within 24 hours
            </p>
          </div>

          {user && (
            <div className="flex justify-center">
              <Button variant="outline" size="lg" onClick={() => navigate("/dashboard")} className="w-full sm:w-auto">
                Go to Dashboard
              </Button>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Applications reviewed within 24 hours · Next cohort starts soon
            </p>
            <p className="text-xs text-muted-foreground">
              {FORMAT} · {TIME_COMMITMENT} · {PRICING_LABEL} · Just {COHORT_SIZE} women per cohort
            </p>
          </div>
        </section>


        {/* PAIN POINTS */}
        <section className="py-12 space-y-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <div className="text-center space-y-2">
            <h2 className="font-display text-2xl md:text-3xl font-semibold">Sound familiar?</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              `"I have clients but I'm always reacting. I never feel like I'm building anything — just surviving week to week."`,
              `"I set goals every January. By February I'm already off track with no one to check in with."`,
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
              What actually changes in <span className="text-gradient">four weeks</span>
            </h2>
            <p className="text-muted-foreground max-w-sm mx-auto text-sm">
              A structured rhythm you can sustain — with a small group who shows up with you.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: RefreshCw, title: "Consistent momentum",  desc: "One goal, one rhythm, four weeks. Showing up becomes the default — not the exception." },
              { icon: Heart,      title: "Real peer connection", desc: "A curated cohort at your stage. People who get the juggle — and show up anyway." },
              { icon: BarChart2,  title: "Measurable progress",  desc: "Stop circling the same goals. Commit publicly, move forward honestly." },
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
              No complicated systems. Just a weekly rhythm that keeps building.
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
              { day: "Monday",   color: "text-primary",           title: "Live session", desc: "Review last week as a group. Name what moved, what didn't, and set one clear commitment for the week ahead." },
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

          {/* Featured testimonial — the lead, largest */}
          <Card className="border-l-4 border-l-primary border-border/50" style={{ borderRadius: "0 1.25rem 1.25rem 0" }}>
            <CardContent className="py-8 space-y-5">
              <p className="text-lg md:text-xl italic text-foreground leading-relaxed">
                "The moment that really sold it for me was a week I was sick. Normally that would've meant a slow, reluctant crawl back to my to-do list. Instead, the group gave me just enough pull to step right back in — without the usual resistance. That alone was worth it."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary flex-shrink-0">G</div>
                <div>
                  <p className="text-sm font-medium text-foreground">Gina</p>
                  <p className="text-xs text-muted-foreground">May cohort</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supporting quotes — smaller */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                quote: "The combination of accountability, support, and honest reflection helped me realize my goals weren't quite aligned with what I actually wanted to achieve. That insight alone was worth it. The structure kept me moving forward each week, and the consistency of the group made it much easier to stay committed.",
                author: "Ebba",
                cohort: "June cohort",
              },
              {
                quote: "It was incredibly helpful to meet other women in the same position, building their businesses — and to seek support together to achieve our goals.",
                author: "Member",
                cohort: COHORT,
              },
              {
                quote: "Monday Momentum helped me get clarity on my tasks and celebrate smaller wins — so I could build my business with confidence.",
                author: "Member",
                cohort: COHORT,
              },
            ].map(({ quote, author, cohort }, i) => (
              <Card key={i} className="border-primary/20 bg-primary/5">
                <CardContent className="py-6 space-y-3 flex flex-col h-full">
                  <p className="text-sm italic text-muted-foreground leading-relaxed flex-1">{quote}</p>
                  <p className="text-xs font-medium text-foreground">
                    {author} <span className="font-normal text-muted-foreground">· {cohort}</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* IS THIS FOR YOU */}
        <section className="py-12 space-y-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-center">This is for you if…</h2>
          <div className="max-w-lg mx-auto space-y-3">
            {[
              "You've been at it 1–5 years, have paying clients, and you're running it without a team",
              "You want more consistency and less chaos in how you run your weeks",
              "You miss having colleagues — people who actually understand what this life is like",
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
              <h2 className="font-display text-2xl md:text-3xl font-semibold">Ready to stop going in circles?</h2>
              <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
                The next cohort is small and curated. Apply now and we'll be in touch within 24 hours.
              </p>
              <div className="pt-2">
                <Button variant="premium" size="lg" onClick={() => navigate("/auth")} className="gap-2">
                  Apply to join <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Founded by Marie · Just {COHORT_SIZE} women per cohort · Applications reviewed within 24 hours
              </p>
            </CardContent>
          </Card>
        </section>

      </main>

      <footer className="border-t border-border/50 py-6 text-center">
        <p className="text-sm text-muted-foreground">© 2026 Luma Circle. All rights reserved.</p>
      </footer>

    </div>
  );
}
