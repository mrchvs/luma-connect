import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import {
  Users, ArrowRight, Zap, Target,
  RefreshCw, Heart, BarChart2, CheckCircle2,
} from "lucide-react";

const C = {
  orange:        "#D85A30",
  orangeDark:    "#993C1D",
  orangeDeeper:  "#712B13",
  orangeLight:   "#FAECE7",
  orangeMid:     "#F5C4B3",
  orangePale:    "#F0997B",
  purpleLight:   "#F5F0FE",
  purpleBorder:  "#DDD6FA",
  text:          "#1a1a1a",
  muted:         "#555",
  faint:         "#888",
  border:        "#e5e5e5",
  bg:            "#fff",
};

const s = {
  section:   { padding: "3.5rem 2rem" } as React.CSSProperties,
  center:    { textAlign: "center" as const },
  card:      { background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1.25rem" } as React.CSSProperties,
  divider:   { border: "none", borderTop: `0.5px solid ${C.border}`, margin: 0 } as React.CSSProperties,
  overline:  { fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: C.faint, marginBottom: "0.5rem" },
  p:         { color: C.muted, lineHeight: 1.7, fontSize: 15 } as React.CSSProperties,
};

function Btn({ href, outline, children }: { href: string; outline?: boolean; children: React.ReactNode }) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "13px 28px", borderRadius: 999, fontSize: 15, fontWeight: 500,
    cursor: "pointer", textDecoration: "none", border: outline ? `1.5px solid ${C.orange}` : "none",
    background: outline ? "transparent" : C.orange,
    color: outline ? C.orange : "#fff",
  };
  return <Link to={href} style={base}>{children}</Link>;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: C.orangeDeeper, background: C.orangeLight, padding: "5px 14px", borderRadius: 999, marginBottom: "1.25rem" }}>
      {children}
    </div>
  );
}

function DayTag({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: C.orange, marginBottom: 6 }}>{children}</div>;
}

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (window.location.hash.includes("access_token") || window.location.hash.includes("error_description")) {
      navigate("/auth" + window.location.hash, { replace: true });
    }
  }, [navigate]);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: C.text, background: C.bg, fontSize: 15, lineHeight: 1.7, WebkitFontSmoothing: "antialiased" }}>

      {/* NAV */}
      <nav style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `0.5px solid ${C.border}`, position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", zIndex: 50 }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <Logo size="sm" />
        </Link>
        {!loading && (
          user
            ? <Link to="/dashboard" style={{ fontSize: 14, color: C.muted, textDecoration: "none" }}>Go to Dashboard</Link>
            : <Link to="/auth"     style={{ fontSize: 14, color: C.muted, textDecoration: "none" }}>Sign in</Link>
        )}
      </nav>

      {/* HERO */}
      <section style={{ ...s.section, ...s.center, background: C.orangeLight, paddingTop: "4.5rem", paddingBottom: "4rem" }}>
        <Pill><Users size={13} /> For female founders, 1–5 years in</Pill>
        <h1 style={{ fontSize: 36, fontWeight: 500, lineHeight: 1.18, marginBottom: "1.25rem", fontFamily: "inherit" }}>
          You have clients.<br />You have proof it works.<br />
          Now you need it to <em style={{ fontStyle: "italic", color: C.orange }}>actually feel sustainable.</em>
        </h1>
        <p style={{ ...s.p, maxWidth: 500, margin: "0 auto 1rem", fontSize: 16 }}>
          You're doing it — but you're doing it alone. The juggling, the self-doubt, the weeks where everything feels urgent and nothing moves forward.
        </p>
        <p style={{ ...s.p, maxWidth: 480, margin: "0 auto 2rem", fontSize: 16 }}>
          Monday Momentum is a four-week accountability cohort for solo female founders who are ready to grow with consistency — and stop feeling so isolated doing it.
        </p>
        <Btn href="/auth">Apply to join <ArrowRight size={16} /></Btn>
        <p style={{ fontSize: 13, color: C.orangeDark, marginTop: "1rem" }}>
          Applications reviewed within 48 hours · Next cohort starts soon
        </p>
      </section>

      <hr style={s.divider} />

      {/* PAIN POINTS */}
      <section style={s.section}>
        <div style={{ ...s.center, marginBottom: "2rem" }}>
          <h2 style={{ fontSize: 26, fontWeight: 500, marginBottom: "0.6rem", fontFamily: "inherit" }}>Sound familiar?</h2>
          <p style={{ ...s.p, maxWidth: 420, margin: "0 auto" }}>
            You're not struggling to start. You're struggling to <em>keep going</em> — with focus, stability, and people who get it.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {[
            `"I have clients but I'm always reacting. I never feel like I'm building anything — just surviving week to week."`,
            `"I set goals every January. By February I'm already off track with no one to check in with."`,
            `"Being a solo founder is lonely. I miss having colleagues. People who actually understand what this life is like."`,
          ].map((quote, i) => (
            <div key={i} style={{ ...s.card, background: C.orangeLight, borderColor: C.orangeMid }}>
              <p style={{ color: C.orangeDeeper }}>{quote}</p>
            </div>
          ))}
        </div>
      </section>

      <hr style={s.divider} />

      {/* WHAT YOU GET */}
      <section style={{ ...s.section, ...s.center, paddingBottom: "2rem" }}>
        <p style={s.overline}>What Monday Momentum gives you</p>
        <h2 style={{ fontSize: 26, fontWeight: 500, marginBottom: "0.75rem", fontFamily: "inherit" }}>
          Consistency. Connection. <span style={{ color: C.orange }}>Progress.</span>
        </h2>
        <p style={{ ...s.p, maxWidth: 460, margin: "0 auto 2.5rem" }}>
          A simple, structured rhythm you can actually sustain — with a group of women who hold you to what you said you'd do.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, textAlign: "left" }}>
          {[
            { icon: RefreshCw, title: "Consistent momentum", desc: "A four-week structure that makes showing up the default — not the exception. One goal, one rhythm, four weeks." },
            { icon: Heart,      title: "Real peer connection", desc: "A small, curated cohort of female founders at your stage. People who understand the juggle — and cheer you on anyway." },
            { icon: BarChart2,  title: "Measurable growth",   desc: "Stop circling the same goals. Commit publicly, reflect honestly, and actually move your business forward." },
          ].map(({ icon: Icon, title, desc }, i) => (
            <div key={i} style={s.card}>
              <Icon size={22} color={C.orange} style={{ marginBottom: 10, display: "block" }} />
              <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6, fontFamily: "inherit" }}>{title}</h3>
              <p style={{ ...s.p, fontSize: 14 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr style={s.divider} />

      {/* THE RHYTHM */}
      <section style={s.section}>
        <div style={{ ...s.center, marginBottom: "2.5rem" }}>
          <Pill><Zap size={13} /> The Monday Momentum rhythm</Pill>
          <h2 style={{ fontSize: 26, fontWeight: 500, marginBottom: "0.75rem", fontFamily: "inherit" }}>Four weeks. One goal. A group that holds you to it.</h2>
          <p style={{ ...s.p, maxWidth: 460, margin: "0 auto" }}>
            No complicated systems. No endless content to catch up on. Just a weekly rhythm that keeps building.
          </p>
        </div>

        {/* North star card */}
        <div style={{ ...s.card, background: C.purpleLight, borderColor: C.purpleBorder, marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ background: C.orange, borderRadius: "50%", width: 36, height: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Target size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 5, fontFamily: "inherit" }}>Before it starts — set your north star</h3>
              <p style={{ ...s.p, fontSize: 14 }}>You choose one meaningful goal for the month. Not ten. One. Everything in the four weeks moves this forward. Your cohort knows what it is — and they'll ask about it.</p>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {[
            { day: "Monday",  title: "Live session", desc: "Review last week as a group — celebrate wins, learn from what didn't move, and set one clear commitment for the week ahead." },
            { day: "All week", title: "Move",         desc: "Work your one commitment. Keep it visible, keep it honest. Cheer on your cohort when they share theirs." },
            { day: "Sunday",  title: "Reflect",       desc: "Five minutes. What moved this week, what didn't, and why. Honest, private, and ready for Monday." },
          ].map(({ day, title, desc }, i) => (
            <div key={i} style={s.card}>
              <DayTag>{day}</DayTag>
              <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 8, fontFamily: "inherit" }}>{title}</h3>
              <p style={{ ...s.p, fontSize: 14 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr style={s.divider} />

      {/* TESTIMONIAL */}
      <section style={{ ...s.section, paddingBottom: "2rem" }}>
        <p style={{ ...s.overline, ...s.center, marginBottom: "1.5rem" }}>What members say</p>

        <div style={{ ...s.card, borderLeft: `3px solid ${C.orange}`, borderRadius: "0 12px 12px 0", marginBottom: 12 }}>
          <p style={{ fontSize: 16, fontStyle: "italic", marginBottom: 6, color: C.text, lineHeight: 1.6 }}>
            "That little bit of intentional pressure helps me cut through the noise and ask myself: what's really essential right now? By week three, I noticed a real shift in my productivity — simply because of the commitment to the group."
          </p>
          <div style={{ borderTop: `0.5px solid ${C.border}`, paddingTop: 12, marginTop: 12, marginBottom: 16 }}>
            <p style={{ ...s.p, fontSize: 14, fontStyle: "italic" }}>
              The moment that really sold it for me was a week I was sick. Normally, that would've meant a slow, reluctant crawl back to my to-do list. Instead, the group gave me just enough pull to step right back in without the usual resistance. That alone was worth it.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.orangeLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: C.orangeDeeper, flexShrink: 0 }}>M</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: C.text, margin: 0 }}>Monday Momentum member</p>
              <p style={{ fontSize: 12, margin: 0, color: C.muted }}>First-time accountability group · Joined May 2025</p>
            </div>
          </div>
        </div>

        <div style={{ ...s.card, background: C.orangeLight, borderColor: C.orangeMid, textAlign: "center" }}>
          <p style={{ ...s.p, maxWidth: 460, margin: "0 auto", fontStyle: "italic", color: C.orangeDeeper }}>
            "Starting the week with the Monday morning session has become one of my favourite things — it sets the tone in the best way."
          </p>
        </div>
      </section>

      <hr style={s.divider} />

      {/* IS THIS FOR YOU */}
      <section style={{ ...s.section, paddingBottom: "2rem" }}>
        <div style={{ ...s.center, marginBottom: "2rem" }}>
          <h2 style={{ fontSize: 26, fontWeight: 500, fontFamily: "inherit" }}>This is for you if…</h2>
        </div>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          {[
            "You've been running your business for 1–5 years and have paying clients",
            "You're a solo founder — no team, no colleagues, no one checking in on you",
            "You want more consistency and less chaos in how you run your weeks",
            "You're craving real connection with women who actually get what this is like",
            "You're ready to commit to one goal and actually follow through on it",
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
              <CheckCircle2 size={17} color={C.orange} style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ ...s.p, fontSize: 15, margin: 0 }}>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <hr style={s.divider} />

      {/* CTA */}
      <section style={{ ...s.section, ...s.center, background: C.orangeLight, padding: "3.5rem 2rem" }}>
        <h2 style={{ fontSize: 26, fontWeight: 500, marginBottom: "0.75rem", fontFamily: "inherit" }}>You don't have to grow alone.</h2>
        <p style={{ ...s.p, maxWidth: 420, margin: "0 auto 2rem" }}>
          Join the next Monday Momentum cohort — a small group of female founders committed to showing up, moving forward, and supporting each other every week.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Btn href="/auth">Apply to join <ArrowRight size={16} /></Btn>
        </div>
        <p style={{ fontSize: 13, color: C.orangeDark, marginTop: "1.25rem" }}>
          Founded by Marie &amp; Jennifer · Cohorts are small and curated · Applications reviewed within 48 hours
        </p>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "1.25rem 2rem", textAlign: "center", borderTop: `0.5px solid ${C.border}` }}>
        <p style={{ fontSize: 13, color: C.faint }}>© 2025 Luma Circle. All rights reserved.</p>
      </footer>

    </div>
  );
}
