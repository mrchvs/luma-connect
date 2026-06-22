import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { getWorkshop, workshopTitle } from "@/lib/workshops";
import { Users, MessageCircle, Calendar } from "lucide-react";

const BG = "#EDE4D3";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputStyle: React.CSSProperties = {
  width: "100%", border: "none", outline: "none", background: "#EFE9DC",
  borderRadius: 999, padding: "14px 18px", fontSize: 15, color: "#2A241F",
};
const labelStyle: React.CSSProperties = { fontSize: 14, color: "#2A241F", fontWeight: 500 };

export default function Workshop() {
  const { slug } = useParams<{ slug: string }>();
  const workshop = getWorkshop(slug);
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  // Returning visitors who already registered skip the gate.
  useEffect(() => {
    if (slug && localStorage.getItem(`workshop_access_${slug}`)) setUnlocked(true);
  }, [slug]);

  if (!workshop) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
        <h1 style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 32, color: "#2A241F" }}>Workshop not found</h1>
        <Link to="/workshops" style={{ color: "#E5602B", fontSize: 15 }}>See all workshops →</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setStatus("error"); setError("Please enter your first and last name.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setStatus("error"); setError("Please enter a valid email address.");
      return;
    }
    setStatus("submitting"); setError("");
    const { error: insertError } = await (supabase as any).from("workshop_leads").insert({
      workshop_slug: workshop.slug,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
    });
    if (insertError) {
      setStatus("error"); setError("Something went wrong. Please try again.");
      return;
    }
    localStorage.setItem(`workshop_access_${workshop.slug}`, email.trim().toLowerCase());
    setUnlocked(true);

    // Notify admins of the new lead — fire-and-forget so it never blocks access.
    supabase.functions
      .invoke("notify-admin-workshop-lead", {
        body: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          source: workshopTitle(workshop),
        },
      })
      .catch((err) => console.error("[workshop] admin notification failed:", err));
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <header style={{ padding: "20px 28px" }}>
        <Link to="/"><Logo size="sm" /></Link>
      </header>

      {unlocked ? (
        /* ---- Unlocked: video + bridge into the community ---- */
        <main style={{ flex: 1, width: "100%", maxWidth: 1120, margin: "0 auto", padding: "16px 24px 64px" }}>
          <h1 style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 34, fontWeight: 500, color: "#2A241F", lineHeight: 1.15, margin: "0 0 20px" }}>
            {workshop.titleBefore}{" "}
            <em style={{ fontStyle: "italic" }}>{workshop.titleEm}</em>
            {workshop.titleAfter ? ` ${workshop.titleAfter}` : ""}
          </h1>

          <div className="workshop-unlocked-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 36, alignItems: "start" }}>
            {/* Left: video + description */}
            <div>
              <div style={{ position: "relative", paddingBottom: "56.25%", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 60px -24px rgba(40,30,20,0.25)", background: "#000" }}>
                <iframe
                  src={`https://www.youtube.com/embed/${workshop.youtubeId}?autoplay=1&rel=0`}
                  title={workshopTitle(workshop)}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                />
              </div>
              <p style={{ fontSize: 16, color: "#4A4440", lineHeight: 1.6, margin: "24px 0 0" }}>{workshop.description}</p>
            </div>

            {/* Right: your next step */}
            <aside style={{ background: "#fff", borderRadius: 24, padding: 34, boxShadow: "0 18px 50px -24px rgba(40,30,20,.22)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#E5602B", margin: 0 }}>Your next step</p>
              <h2 style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 30, fontWeight: 500, color: "#2A241F", lineHeight: 1.2, margin: "10px 0 0" }}>
                You've got the framework. Now you need the people.
              </h2>
              <p style={{ fontSize: 14.5, color: "#4A4440", lineHeight: 1.6, margin: "12px 0 0" }}>
                Knowing what to do is the easy part. Doing it consistently — with women who get the juggle of building solo — is what actually changes things.
              </p>

              <button
                onClick={() => navigate("/auth")}
                style={{ width: "100%", marginTop: 18, background: "#E5602B", color: "#fff", border: "none", borderRadius: 999, padding: "15px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                Create your free account →
              </button>
              <p style={{ fontSize: 13, color: "#9B8E84", margin: "10px 0 0", textAlign: "center" }}>Free · Connect with 180+ solo female founders</p>

              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".13em", textTransform: "uppercase", color: "#9B8E84", margin: "26px 0 14px" }}>Your free account also unlocks</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { icon: Users, bg: "#FFEDE5", color: "#E5602B", title: "A directory of solo founders", desc: "Find women building at your stage and reach out." },
                  { icon: MessageCircle, bg: "#EDE9FE", color: "#7C3AED", title: "Community asks", desc: "Post what's blocking you, get real answers." },
                  { icon: Calendar, bg: "#DDF3E6", color: "#2E9E6B", title: "Weekly live sessions", desc: "Coworking, hot seats and office hours." },
                ].map((perk) => (
                  <div key={perk.title} style={{ display: "flex", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: perk.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <perk.icon size={18} color={perk.color} />
                    </div>
                    <div>
                      <p style={{ fontSize: 14.5, fontWeight: 600, color: "#2A241F", margin: 0 }}>{perk.title}</p>
                      <p style={{ fontSize: 13, color: "#7A7167", lineHeight: 1.5, margin: "2px 0 0" }}>{perk.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderLeft: "3px solid #E5602B", background: "#FBF4ED", borderRadius: "0 14px 14px 0", padding: "18px 20px", marginTop: 24 }}>
                <p style={{ fontFamily: "Newsreader, Georgia, serif", fontStyle: "italic", fontSize: 16, color: "#2A241F", lineHeight: 1.5, margin: 0 }}>
                  "The week I was sick, the group gave me just enough pull to step right back in — without the usual resistance. That alone was worth it."
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#C8A8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#fff", flexShrink: 0 }}>G</div>
                  <span style={{ fontSize: 13, color: "#6B6259" }}>Gina · May cohort</span>
                </div>
              </div>
            </aside>
          </div>

          {/* Monday Momentum */}
          <div style={{ background: "#EDE9FE", border: "1px solid #DED2FB", borderRadius: 20, padding: "26px 28px", marginTop: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".13em", textTransform: "uppercase", color: "#7C3AED", margin: 0 }}>When you want structure, not just connection</p>
            <h3 style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 23, fontWeight: 500, color: "#2A241F", lineHeight: 1.25, margin: "8px 0 0" }}>
              Monday Momentum — 4 weeks, one goal, a group that holds you to it
            </h3>
            <p style={{ fontSize: 13.5, color: "#5A5260", margin: "10px 0 0" }}>8 women per cohort · €50/month · ~1 hr per week · applications reviewed within 24 hours</p>
            <button
              onClick={() => navigate("/auth?apply=1")}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#7C3AED", marginTop: 14 }}
            >
              Apply to the next cohort →
            </button>
          </div>

          <p style={{ marginTop: 24 }}>
            <Link to="/workshops" style={{ color: "#E5602B", fontSize: 15 }}>← More workshops</Link>
          </p>
        </main>
      ) : (
        /* ---- Locked: copy + lead-capture form ---- */
        <main style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr", gap: 48, alignItems: "center", width: "100%", maxWidth: 1120, margin: "0 auto", padding: "24px 28px 72px" }} className="workshop-grid">
          {/* Left: headline + description */}
          <div>
            <h1 style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 52, fontWeight: 500, color: "#2A241F", lineHeight: 1.08, margin: 0, letterSpacing: "-0.5px" }}>
              {workshop.titleBefore}{" "}
              <em style={{ fontStyle: "italic" }}>{workshop.titleEm}</em>
              {workshop.titleAfter ? <>{" "}{workshop.titleAfter}</> : null}
            </h1>
            <p style={{ fontSize: 17, color: "#4A4440", lineHeight: 1.65, margin: "24px 0 0", maxWidth: 520 }}>
              {workshop.description}
            </p>
          </div>

          {/* Right: form card */}
          <div style={{ background: "#fff", borderRadius: 28, padding: "36px 36px 40px", boxShadow: "0 28px 70px -30px rgba(40,30,20,0.20)" }}>
            <form onSubmit={handleSubmit}>
              <div style={{ fontSize: 17, color: "#2A241F", fontWeight: 500, marginBottom: 14 }}>Name</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                <div>
                  <label style={labelStyle}>First Name <span style={{ color: "#9B9085" }}>(required)</span></label>
                  <input style={{ ...inputStyle, marginTop: 8 }} value={firstName} onChange={(e) => setFirstName(e.target.value)} aria-label="First name" />
                </div>
                <div>
                  <label style={labelStyle}>Last Name <span style={{ color: "#9B9085" }}>(required)</span></label>
                  <input style={{ ...inputStyle, marginTop: 8 }} value={lastName} onChange={(e) => setLastName(e.target.value)} aria-label="Last name" />
                </div>
              </div>
              <label style={labelStyle}>Email <span style={{ color: "#9B9085" }}>(required)</span></label>
              <input type="email" inputMode="email" autoComplete="email" style={{ ...inputStyle, marginTop: 8 }} value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />

              {status === "error" && (
                <p style={{ color: "#C0392B", fontSize: 13, margin: "12px 0 0" }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                style={{
                  width: "100%", marginTop: 22, background: "#111", color: "#fff",
                  border: "none", borderRadius: 999, padding: "18px 24px", fontSize: 16,
                  fontWeight: 600, cursor: status === "submitting" ? "default" : "pointer",
                  opacity: status === "submitting" ? 0.7 : 1,
                }}
              >
                {status === "submitting" ? "Sending…" : "Send it over"}
              </button>
              <p style={{ fontSize: 12, color: "#9B9085", margin: "14px 0 0", lineHeight: 1.5 }}>
                We'll email you occasionally about Luma Circle. Unsubscribe anytime. See our{" "}
                <Link to="/privacy" style={{ color: "#9B9085", textDecoration: "underline" }}>Privacy Policy</Link>.
              </p>
            </form>
          </div>
        </main>
      )}

      {/* Two columns from the large breakpoint up */}
      <style>{`@media (min-width: 900px){
        .workshop-grid{ grid-template-columns: 1fr 1fr !important; }
        .workshop-unlocked-grid{ grid-template-columns: 1fr 472px !important; }
      }`}</style>
    </div>
  );
}
