import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { WORKSHOPS, type Workshop } from "@/lib/workshops";

const BG = "#EDE4D3";

function Grid({ items, cta }: { items: Workshop[]; cta: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
      {items.map((w) => (
        <Link
          key={w.slug}
          to={`/workshops/${w.slug}`}
          style={{ display: "block", background: "#fff", borderRadius: 20, padding: "24px 24px 26px", textDecoration: "none", boxShadow: "0 18px 50px -28px rgba(40,30,20,0.18)" }}
        >
          <div
            style={{
              position: "relative", paddingBottom: "56.25%", borderRadius: 12, overflow: "hidden", marginBottom: 16,
              background: `url(https://i.ytimg.com/vi/${w.youtubeId}/hqdefault.jpg) center/cover no-repeat`,
            }}
          />
          <h3 style={{ fontFamily: "'Montreal Serial', Newsreader, Georgia, serif", fontSize: 22, fontWeight: 500, color: "#2A241F", margin: "0 0 8px", lineHeight: 1.25 }}>
            {w.titleBefore} <em style={{ fontStyle: "italic" }}>{w.titleEm}</em>{w.titleAfter ? ` ${w.titleAfter}` : ""}
          </h3>
          <span style={{ color: "#E5602B", fontSize: 15, fontWeight: 500 }}>{cta} →</span>
        </Link>
      ))}
    </div>
  );
}

export default function Workshops() {
  const workshops = WORKSHOPS.filter((w) => (w.type ?? "workshop") === "workshop");
  const talks = WORKSHOPS.filter((w) => w.type === "talk");

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <header style={{ padding: "20px 28px" }}>
        <Link to="/"><Logo size="sm" /></Link>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 28px 80px" }}>
        <h1 style={{ fontFamily: "'Montreal Serial', Newsreader, Georgia, serif", fontSize: 44, fontWeight: 500, color: "#2A241F", margin: "0 0 10px", lineHeight: 1.1 }}>
          Free workshops &amp; talks
        </h1>
        <p style={{ fontSize: 17, color: "#4A4440", margin: "0 0 40px", maxWidth: 540, lineHeight: 1.6 }}>
          Stand-alone sessions and recordings for early-stage founders. Pop in your details and watch instantly — no account needed.
        </p>

        {workshops.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#E5602B", margin: "0 0 18px" }}>Workshops</h2>
            <Grid items={workshops} cta="Watch the workshop" />
          </section>
        )}

        {talks.length > 0 && (
          <section>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#7C3AED", margin: "0 0 18px" }}>Talks &amp; dinners</h2>
            <Grid items={talks} cta="Watch the recording" />
          </section>
        )}
      </main>
    </div>
  );
}
