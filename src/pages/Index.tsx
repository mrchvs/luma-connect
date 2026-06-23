import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users, Link2, Gift, HelpCircle, CheckCircle2, ArrowRight, Zap,
} from "lucide-react";

// ── Monday Momentum facts (the optional, paid deeper step) ──────────
// Edit these to confirm the public-facing details in one place.
const COHORT_SIZE = 8;                  // women per cohort
const FORMAT = "Online";
const TIME_COMMITMENT = "~1 hr per week";
const PRICING_LABEL = "€50/month";
const COHORT = "2026 cohort";           // generic attribution for anonymous quotes
// ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Persists a lead's email before sending them into sign-up. Backed by the
// `capture-applicant` edge function, which inserts into the `applicants`
// table with the service role.
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
    // real sign-up), then continue to free sign-up with the email pre-filled.
    try {
      await persistApplicantEmail(value);
      // Notify admins of the new lead — fire-and-forget, never blocks the flow.
      supabase.functions
        .invoke("notify-admin-workshop-lead", {
          body: { email: value, source: "Join free (hero)" },
        })
        .catch((err) => console.error("[join] admin notification failed:", err));
    } catch (err) {
      console.error("[join] email capture failed, continuing anyway:", err);
    }
    setStatus("success");
    navigate(`/auth?email=${encodeURIComponent(value)}`);
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
            A free community for female solo founders
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight text-foreground">
            You're building solo.<br />
            You don't have to figure it out{" "}
            <span className="italic text-primary">alone.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Say what you need, share what you can offer, and get connected to other women building on their own. Real help — given and received.
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
                {status === "submitting" ? "Joining…" : <>Join free <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </form>
            <div aria-live="polite" className="min-h-[1.25rem]">
              {status === "error" && (
                <p className="text-xs text-destructive">{formError}</p>
              )}
              {status === "success" && (
                <p className="text-xs text-primary">Thanks — taking you to set up your profile…</p>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground/80">
              Free forever · No application · Set up your profile in 3 minutes
            </p>
          </div>

          {user && (
            <div className="flex justify-center">
              <Button variant="outline" size="lg" onClick={() => navigate("/dashboard")} className="w-full sm:w-auto">
                Go to Dashboard
              </Button>
            </div>
          )}
        </section>

        {/* NEED / OFFER CENTERPIECE */}
        <section className="py-12 space-y-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <div className="text-center space-y-2">
            <h2 className="font-display text-2xl md:text-3xl font-semibold">
              Connect by what you need — and what you can offer
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              The circle works both ways. Ask for what would move you forward, and give from what you already know.
            </p>
          </div>

          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
            {/* What you need */}
            <Card className="border-primary/20 bg-primary/5 h-full">
              <CardContent className="py-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-medium">What you need</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["A warm intro to a designer", "Eyes on my pricing", "An accountability buddy"].map((chip) => (
                    <span key={chip} className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary">{chip}</span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Connector */}
            <div className="flex justify-center py-1">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-soft">
                <Link2 className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* What you offer */}
            <Card className="border-secondary/40 bg-secondary/10 h-full">
              <CardContent className="py-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/30 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <h3 className="font-display text-lg font-medium">What you offer</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["10 yrs in brand strategy", "My Notion systems", "An intro to my network"].map((chip) => (
                    <span key={chip} className="text-xs font-medium px-3 py-1.5 rounded-full bg-secondary/30 text-secondary-foreground">{chip}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-12 space-y-8 animate-slide-up" style={{ animationDelay: "0.15s" }}>
          <div className="text-center space-y-2">
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">How it works</p>
            <h2 className="font-display text-2xl md:text-3xl font-semibold">Three steps to your circle</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { n: 1, title: "Join free", desc: "Create your profile in 3 minutes. No application, no fee." },
              { n: 2, title: "Share needs & offers", desc: "Say what you're looking for, and what you can give back." },
              { n: 3, title: "Get connected", desc: "Meet founders who fit — and start helping each other." },
            ].map(({ n, title, desc }) => (
              <Card key={n} className="border-border/50">
                <CardContent className="py-6 space-y-3">
                  <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display text-base font-semibold">{n}</div>
                  <h3 className="font-display text-base font-medium">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-12 space-y-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
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
        <section className="py-12 space-y-6 animate-slide-up" style={{ animationDelay: "0.25s" }}>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-center">This circle is for you if…</h2>
          <div className="max-w-lg mx-auto space-y-3">
            {[
              "You're a female solo founder building without a team",
              "You miss having peers who get the daily juggle",
              "You believe the best help is mutual — you give as much as you get",
              "You want to grow alongside other women, not in isolation",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MONDAY MOMENTUM — optional deeper step */}
        <section className="py-12 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <Card className="bg-foreground text-background border-transparent">
            <CardContent className="py-10 px-6 md:px-10 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                <Zap className="w-3.5 h-3.5" /> Want to go deeper?
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold">Monday Momentum</h2>
              <p className="text-background/80 max-w-lg text-sm leading-relaxed">
                When you're ready for structure, not just connection: four weeks, one goal, and a weekly live Monday session with a small group that holds you to it. Application-based.
              </p>
              <p className="text-xs text-background/60">
                {FORMAT} · {TIME_COMMITMENT} · {PRICING_LABEL} · {COHORT_SIZE} women per cohort · applications reviewed within 24 hours
              </p>
              <div className="pt-1">
                <Button variant="premium" size="lg" onClick={() => navigate("/auth?apply=1")} className="gap-2">
                  Apply to Monday Momentum <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* FINAL CTA */}
        <section className="py-12 pb-20 animate-slide-up" style={{ animationDelay: "0.35s" }}>
          <Card className="border-primary/20 bg-primary/5 text-center">
            <CardContent className="py-12 space-y-4">
              <h2 className="font-display text-2xl md:text-3xl font-semibold">Your circle is waiting.</h2>
              <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
                Join free, set up your profile, and start connecting with women who get it.
              </p>
              <div className="pt-2">
                <Button variant="premium" size="lg" onClick={() => navigate("/auth?signup=1")} className="gap-2">
                  Join free <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Free forever · No application · Set up your profile in 3 minutes
              </p>
            </CardContent>
          </Card>
        </section>

      </main>

      <footer className="border-t border-border/50 py-6 text-center space-y-2">
        <p className="text-sm text-muted-foreground">© 2026 Luma Circle. All rights reserved.</p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/privacy" className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline">
            Privacy &amp; Cookies Policy
          </Link>
          <Link to="/legal" className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline">
            Legal Notice
          </Link>
        </div>
      </footer>

    </div>
  );
}
