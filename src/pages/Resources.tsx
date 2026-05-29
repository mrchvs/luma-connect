import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { MainNav } from "@/components/MainNav";

const CATEGORIES = ["All", "Getting started", "Monday Momentum"] as const;
type Category = typeof CATEGORIES[number];

interface Video {
  id: string;
  title: string;
  description: string;
  category: Exclude<Category, "All">;
  duration: string;
  loomId: string | null;
  gradient: string;
  iconBg: string;
  comingSoon?: boolean;
}

const FEATURED: Video[] = [
  {
    id: "platform-tour",
    title: "How to use the platform",
    description: "A guided tour of Monday Momentum, Asks and Members — everything you need to find your way around.",
    category: "Getting started",
    duration: "5 min",
    loomId: "44ba54c3cde446c9bd88b535e5893e7e",
    gradient: "linear-gradient(135deg, #FFCBA4 0%, #FF8C5A 100%)",
    iconBg: "#FF8C5A",
  },
  {
    id: "set-goal",
    title: "How to set your goal for the month",
    description: "The goal pyramid, and how to turn a big ambition into one clear monthly goal before your first Monday.",
    category: "Monday Momentum",
    duration: "4 min",
    loomId: "b7f4be02537740488fafab6411889e82",
    gradient: "linear-gradient(135deg, #C4B5F4 0%, #8B6FE8 100%)",
    iconBg: "#8B6FE8",
  },
];

const LIBRARY: Video[] = [
  {
    id: "weekly-commitments",
    title: "Setting weekly commitments",
    description: "How to write a commitment that's specific enough to actually move the needle this week.",
    category: "Monday Momentum",
    duration: "5 min",
    loomId: null,
    gradient: "linear-gradient(135deg, #C4B5F4 0%, #8B6FE8 100%)",
    iconBg: "#8B6FE8",
    comingSoon: false,
  },
  {
    id: "asks",
    title: "Making the most of Asks",
    description: "How to post an Ask that gets real responses, and how to show up for others in the community.",
    category: "Community",
    duration: "3 min",
    loomId: null,
    gradient: "linear-gradient(135deg, #A8E6D8 0%, #5DB8A4 100%)",
    iconBg: "#5DB8A4",
    comingSoon: true,
  },
  {
    id: "mentor-session",
    title: "Booking a mentor session",
    description: "Step-by-step guide to finding and booking your first mentor match through the platform.",
    category: "Members",
    duration: "3 min",
    loomId: null,
    gradient: "linear-gradient(135deg, #B8E8C8 0%, #72C490 100%)",
    iconBg: "#72C490",
    comingSoon: true,
  },
];

function PlayIcon() {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.95)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#1a1a1a">
        <path d="M8 5v14l11-7z"/>
      </svg>
    </div>
  );
}

function CategoryBadge({ category }: { category: Exclude<Category, "All"> }) {
  const colors: Record<string, string> = {
    "Getting started": "#D97706",
    "Monday Momentum": "#7C3AED",
    "Community": "#0891B2",
    "Members": "#059669",
  };
  const bgs: Record<string, string> = {
    "Getting started": "#FEF3C7",
    "Monday Momentum": "#EDE9FE",
    "Community": "#E0F2FE",
    "Members": "#D1FAE5",
  };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
      color: colors[category], background: bgs[category],
      padding: "3px 8px", borderRadius: 999,
    }}>
      {category}
    </span>
  );
}

function FeaturedCard({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EBE4", overflow: "hidden" }}>
      {/* Thumbnail */}
      <div
        style={{ position: "relative", paddingBottom: "52%", cursor: video.loomId ? "pointer" : "default", background: video.gradient }}
        onClick={() => video.loomId && setPlaying(true)}
      >
        {playing && video.loomId ? (
          <iframe
            src={`https://www.loom.com/embed/${video.loomId}?autoplay=1`}
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PlayIcon />
          </div>
        )}
        {/* Duration badge */}
        {!playing && (
          <div style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,0.75)", color: "#fff", fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 6 }}>
            {video.duration}
          </div>
        )}
      </div>
      {/* Info */}
      <div style={{ padding: "16px 20px 20px" }}>
        <CategoryBadge category={video.category} />
        <h3 style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 22, fontWeight: 500, color: "#1a1a1a", margin: "8px 0 6px", lineHeight: 1.3 }}>
          {video.title}
        </h3>
        <p style={{ fontSize: 14, color: "#6B6259", lineHeight: 1.5, margin: 0 }}>{video.description}</p>
      </div>
    </div>
  );
}

function LibraryCard({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EBE4", overflow: "hidden" }}>
      {/* Thumbnail */}
      <div
        style={{ position: "relative", paddingBottom: "56%", cursor: video.comingSoon ? "default" : "pointer", background: video.gradient }}
        onClick={() => !video.comingSoon && video.loomId && setPlaying(true)}
      >
        {playing && video.loomId ? (
          <iframe
            src={`https://www.loom.com/embed/${video.loomId}?autoplay=1`}
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {video.comingSoon ? (
              <div style={{ background: "rgba(255,255,255,0.85)", borderRadius: 999, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "#6B6259" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Coming soon
              </div>
            ) : (
              <PlayIcon />
            )}
          </div>
        )}
        {!playing && !video.comingSoon && (
          <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.75)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 5 }}>
            {video.duration}
          </div>
        )}
      </div>
      {/* Info */}
      <div style={{ padding: "14px 16px 16px" }}>
        <CategoryBadge category={video.category} />
        <h3 style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 17, fontWeight: 500, color: "#1a1a1a", margin: "8px 0 4px", lineHeight: 1.35 }}>
          {video.title}
        </h3>
        <p style={{ fontSize: 13, color: "#6B6259", lineHeight: 1.5, margin: 0 }}>{video.description}</p>
      </div>
    </div>
  );
}

export default function Resources() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>("All");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    if (!loading && user && !profile?.completed) navigate("/onboarding");
  }, [user, profile, loading, navigate]);

  const filteredFeatured = FEATURED.filter(v => activeCategory === "All" || v.category === activeCategory);

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F4" }}>
      <MainNav />
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#E5602B", marginBottom: 8 }}>Learn</div>
          <h1 style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 42, fontWeight: 500, color: "#1a1a1a", margin: "0 0 10px", lineHeight: 1.1 }}>Resources</h1>
          <p style={{ fontSize: 16, color: "#6B6259", margin: 0, maxWidth: 480, lineHeight: 1.55 }}>
            Short walkthroughs to help you set strong goals and get the most out of Luma Circle. New videos added as the platform grows.
          </p>
        </div>

        {/* Category filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "7px 16px", borderRadius: 999, fontSize: 14, fontWeight: 500,
                cursor: "pointer", border: "1px solid",
                background: activeCategory === cat ? "#1a1a1a" : "#fff",
                borderColor: activeCategory === cat ? "#1a1a1a" : "#E5DDD6",
                color: activeCategory === cat ? "#fff" : "#4A4440",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Featured videos */}
        {filteredFeatured.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
              {filteredFeatured.map(v => <FeaturedCard key={v.id} video={v} />)}
            </div>
          </div>
        )}

        {filteredFeatured.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9B8E84", fontSize: 15 }}>
            No videos in this category yet — check back soon.
          </div>
        )}

      </div>
    </div>
  );
}
