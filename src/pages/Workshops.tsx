import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { WORKSHOPS, workshopTitle } from "@/lib/workshops";

const BG = "#EDE4D3";

export default function Workshops() {
  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <header style={{ padding: "20px 28px" }}>
        <Link to="/"><Logo size="sm" /></Link>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 28px 80px" }}>
        <h1 style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 44, fontWeight: 500, color: "#2A241F", margin: "0 0 10px", lineHeight: 1.1 }}>
          Free workshops
        </h1>
        <p style={{ fontSize: 17, color: "#4A4440", margin: "0 0 36px", maxWidth: 540, lineHeight: 1.6 }}>
          Stand-alone sessions for early-stage founders. Pop in your details and watch instantly — no account needed.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {WORKSHOPS.map((w) => (
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
              <h3 style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 22, fontWeight: 500, color: "#2A241F", margin: "0 0 8px", lineHeight: 1.25 }}>
                {w.titleBefore} <em style={{ fontStyle: "italic" }}>{w.titleEm}</em>{w.titleAfter ? ` ${w.titleAfter}` : ""}
              </h3>
              <span style={{ color: "#E5602B", fontSize: 15, fontWeight: 500 }}>Watch the workshop →</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
