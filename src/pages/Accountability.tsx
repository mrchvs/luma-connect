import { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { MainNav } from "@/components/MainNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { ArrowLeft, ArrowRight, Target, Flame } from "lucide-react";

// ── Module-level constants ────────────────────────────────────────
const MONTHS_LC = ["january","february","march","april","may","june","july","august","september","october","november","december"];
// Slug format: "may26", "jun26", "jan27" — month name + 2-digit year
function monthSlugToNumber(slug: string): number {
  const monthPart = slug.replace(/\d+$/, ""); // strip trailing digits ("may26" → "may")
  return MONTHS_LC.indexOf(monthPart.toLowerCase()) + 1;
}
function monthSlugToYear(slug: string): number {
  const m = slug.match(/(\d{2})$/);
  return m ? 2000 + parseInt(m[1]) : new Date().getFullYear();
}
function monthNumberToSlug(month: number, year: number): string {
  const name = format(new Date(year, month - 1, 1), "MMMM").toLowerCase();
  return `${name}${year.toString().slice(-2)}`; // e.g. "may26"
}

// ── Date helpers ──────────────────────────────────────────────────
function firstMondayOf(year: number, month: number): Date {
  const d = new Date(year, month - 1, 1);
  const dow = d.getDay();
  const offset = dow === 1 ? 0 : dow === 0 ? 1 : 8 - dow;
  return new Date(year, month - 1, 1 + offset);
}
function getWeekOfMonth(date: Date): number {
  const fm = firstMondayOf(date.getFullYear(), date.getMonth() + 1);
  const diff = Math.floor((date.getTime() - fm.getTime()) / (7 * 86400000));
  return Math.min(4, Math.max(1, diff + 1));
}
function weekStart(month: number, year: number, wk: number): Date {
  const fm = firstMondayOf(year, month);
  const d = new Date(fm);
  d.setDate(fm.getDate() + (wk - 1) * 7);
  return d;
}
function weekUnlockTime(month: number, year: number, wk: number): Date {
  const monday = weekStart(month, year, wk);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() - 1);
  sunday.setHours(18, 0, 0, 0);
  return sunday;
}

// ── Design tokens ─────────────────────────────────────────────────
const C = {
  // Surfaces
  bg: "#F7F2E9",
  card: "#FFFFFF",
  bgSoft: "#FAF6EF",
  bgTint: "#FCF9F3",
  // Ink
  ink: "#1F1A14",
  ink2: "#3D362C",
  muted: "#6B6359",
  faint: "#948B7E",
  ink5: "#BFB7A8",
  // Borders
  border: "#EBE2D2",
  borderSoft: "#F2EBDD",
  borderStrong: "#DDD1BB",
  // Orange (primary)
  coral: "#E55A2B",
  coralDk: "#C84818",
  coralWash: "#FFE6D8",
  coralTint: "#FFF2E9",
  // Purple (goal / partner)
  lav: "#6F58D6",
  lavDk: "#4F39AE",
  lavWash: "#E8E1FF",
  lavTint: "#F2EEFF",
  // Status
  sage: "#5C8A6F",
  sageWash: "#DDEBDF",
  amber: "#B9851E",
  amberWash: "#F6E8C9",
  rose: "#C4525D",
  roseSoft: "#F5DCDE",
  warm: "#FCF9F3",
} as const;

const serif = "'TheSeasons', 'TheSeasonsLT', 'Newsreader', Georgia, serif";
const sans = "'Geist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

// ── Shared atoms ──────────────────────────────────────────────────
function MomentumNav({ current, onCommitment, onOverview }: { current: "commitment" | "dashboard" | "overview"; onCommitment: () => void; onOverview: () => void }) {
  const tabs = [
    { key: "commitment", label: "My commitments", action: onCommitment },
    { key: "overview",   label: "Overview",       action: onOverview },
  ] as const;
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 28, paddingBottom: 4, marginBottom: 4 }}>
      <div style={{ display: "inline-flex", padding: 5, background: C.card, borderRadius: 999, border: `1px solid ${C.borderSoft}`, boxShadow: "0 1px 2px rgba(31,26,20,.04)" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={t.action} style={{
            padding: "8px 18px", borderRadius: 999, border: "none", cursor: "pointer",
            fontFamily: sans, fontSize: 14, fontWeight: 500,
            background: current === t.key ? C.coralWash : "transparent",
            color: current === t.key ? C.coralDk : C.muted,
            transition: "all .15s",
          }}>{t.label}</button>
        ))}
      </div>
    </div>
  );
}

function Card({ children, accent, style = {} }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.card, borderRadius: 22,
      border: `1px solid ${C.border}`,
      borderTopColor: accent || C.border,
      borderTopWidth: accent ? 3 : 1,
      padding: 24,
      boxShadow: "0 1px 0 rgba(40,30,20,0.02), 0 8px 24px -16px rgba(40,30,20,0.12)",
      ...style,
    }}>{children}</div>
  );
}
function Eyebrow({ children, color = C.coralDk }: { children: React.ReactNode; color?: string }) {
  return <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase" as const, color }}>{children}</div>;
}
function H1({ children, size = 42 }: { children: React.ReactNode; size?: number }) {
  return <h1 style={{ fontFamily: serif, fontSize: size, lineHeight: 1.05, letterSpacing: -1, fontWeight: 500, color: C.ink, margin: 0 }}>{children}</h1>;
}
function H2({ children, size = 26 }: { children: React.ReactNode; size?: number }) {
  return <h2 style={{ fontFamily: serif, fontSize: size, lineHeight: 1.1, letterSpacing: -0.4, fontWeight: 500, color: C.ink, margin: 0 }}>{children}</h2>;
}
function SerifI({ children, color = C.coral }: { children: React.ReactNode; color?: string }) {
  return <em style={{ fontStyle: "italic", color, fontWeight: 500 }}>{children}</em>;
}
function Sub({ children }: { children: React.ReactNode }) {
  return <p style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.55, color: C.muted, margin: 0 }}>{children}</p>;
}
function Chip({ children, hue = "muted" }: { children: React.ReactNode; hue?: string }) {
  const p: Record<string, [string, string, string]> = {
    coral: [C.coralWash, C.coralDk, "#FFCFBA"],
    lav: [C.lavWash, C.lavDk, "#D9C5F2"],
    sage: [C.sageWash, C.sage, "#BFDDC9"],
    amber: [C.amberWash, C.amber, "#EBD0A1"],
    muted: ["#F2EEE6", C.muted, C.border],
  };
  const [bg, fg, bd] = p[hue] || p.muted;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 999, background: bg, color: fg, border: `1px solid ${bd}`, fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: -0.1, whiteSpace: "nowrap" as const }}>{children}</span>
  );
}
function WeekBar({ states }: { states: ("done" | "current" | "future" | "partial")[] }) {
  const colors: Record<string, string> = { done: C.coral, current: C.coral, partial: C.amber, future: C.border };
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {states.map((s, i) => <div key={i} style={{ flex: 1, height: 6, borderRadius: 999, background: colors[s], opacity: s === "current" ? 0.85 : 1 }} />)}
    </div>
  );
}
const AV_PALETTE: [string, string][] = [
  ["#FFE6D8", C.coralDk],
  ["#FFE5C9", "#8B4513"],
  ["#E8DAFF", C.lavDk],
  ["#DDEBE0", C.sage],
  ["#FFE0E5", C.rose],
  ["#FFF0C7", C.amber],
  ["#DCE5F4", "#3E5687"],
];

function MMAvatar({ name, size = 36, idx }: { name: string | null; size?: number; idx?: number }) {
  const initials = (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const i = idx !== undefined ? idx % 7 : Math.abs((name || "").charCodeAt(0) || 0) % AV_PALETTE.length;
  const [bg, fg] = AV_PALETTE[i];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, color: fg, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: sans, fontSize: size * 0.36, fontWeight: 600, flexShrink: 0 }}>{initials}</div>
  );
}
function PrimaryBtn({ children, onClick, disabled, style = {} }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ height: 46, padding: "0 22px", borderRadius: 999, border: "none", cursor: disabled ? "not-allowed" : "pointer", background: disabled ? C.border : `linear-gradient(135deg, ${C.coral}, ${C.coralDk})`, color: disabled ? C.muted : "#fff", fontFamily: sans, fontSize: 14, fontWeight: 600, letterSpacing: -0.1, boxShadow: disabled ? "none" : `0 6px 18px -6px ${C.coral}`, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: disabled ? 0.6 : 1, ...style }}>{children}</button>
  );
}
function GhostBtn({ children, onClick, style = {} }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} style={{ height: 46, padding: "0 22px", borderRadius: 999, border: `1.5px solid ${C.border}`, background: "#fff", color: C.ink, fontFamily: sans, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, ...style }}>{children}</button>
  );
}
function Container({ children, max = 720 }: { children: React.ReactNode; max?: number }) {
  return <div style={{ maxWidth: max, margin: "0 auto", padding: "32px 24px" }}>{children}</div>;
}
function EntryMeta({ entry }: { entry: { measurable?: string | null; relevance?: string | null; achievable?: string | null } }) {
  const fields = [
    { icon: "🎯", label: "Success criteria", value: entry.measurable },
    { icon: "💡", label: "Why it matters", value: entry.relevance },
    { icon: "⚡", label: "Potential blockers", value: entry.achievable },
  ].filter(f => f.value);
  if (!fields.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
      {fields.map(f => (
        <div key={f.label} style={{ display: "flex", gap: 10, padding: "9px 13px", background: C.warm, borderRadius: 11 }}>
          <span style={{ fontSize: 13, flexShrink: 0 }}>{f.icon}</span>
          <span style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
            <strong style={{ color: C.ink }}>{f.label}:</strong> {f.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── CohortStreakView ──────────────────────────────────────────────
type WeekStatus = "done" | "partial" | "incomplete" | "upcoming";

function CohortStreakView({
  profiles,
  reflections,
  currentUserId,
  cycleEffectiveWeek,
  isCycleCurrent,
  isCycleFuture,
}: {
  profiles: Array<{ user_id: string; full_name: string | null }>;
  reflections: Array<{ user_id: string; week_number: number; achieved: string | null }>;
  currentUserId: string;
  cycleEffectiveWeek: number;
  isCycleCurrent: boolean;
  isCycleFuture: boolean;
}) {
  const getWeekStatus = (userId: string, wk: number): WeekStatus => {
    if (isCycleFuture) return "upcoming";
    if (isCycleCurrent && wk > cycleEffectiveWeek) return "upcoming";
    const r = reflections.find(r => r.user_id === userId && r.week_number === wk);
    if (!r) return "incomplete";
    if (r.achieved === "yes") return "done";
    if (r.achieved === "partial") return "partial";
    return "incomplete";
  };

  const weekScore = (s: WeekStatus) => s === "done" ? 25 : s === "partial" ? 12.5 : 0;

  const participants = profiles
    .map((m, i) => {
      const weeks = [1, 2, 3, 4].map(wk => getWeekStatus(m.user_id, wk)) as [WeekStatus, WeekStatus, WeekStatus, WeekStatus];
      const [avBg, avFg] = AV_PALETTE[i % 7];
      const initials = (m.full_name || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
      return {
        id: m.user_id,
        name: m.full_name?.split(" ")[0] ?? "Member",
        initials,
        avBg,
        avFg,
        isCurrentUser: m.user_id === currentUserId,
        weeks,
        score: weeks.reduce((s, w) => s + weekScore(w), 0),
      };
    })
    .sort((a, b) => b.score - a.score);

  const statusLabel = (weeks: WeekStatus[]) => {
    const done = weeks.filter(w => w === "done").length;
    if (done >= 3) return { text: "On fire", trophy: true };
    if (done === 2) return { text: "Building", trophy: false };
    if (done === 1) return { text: "Getting started", trophy: false };
    return { text: "You've got this", trophy: false };
  };

  const flameColor = (s: WeekStatus): React.CSSProperties =>
    s === "done"    ? { color: "#f97316" } :
    s === "partial" ? { color: "#fbbf24", opacity: 0.6 } :
                      { color: "#d6d3d1" };

  if (participants.length === 0) {
    return (
      <div style={{ padding: "20px 16px", background: C.warm, borderRadius: 14, border: `1px dashed ${C.border}`, fontSize: 13, color: C.muted }}>
        Your cohort members will appear here once they join.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {participants.map(p => {
        const sl = statusLabel(p.weeks);
        return (
          <div key={p.id} style={{
            background: p.isCurrentUser ? C.coralTint : C.card,
            border: `1px solid ${p.isCurrentUser ? C.coralWash : C.borderSoft}`,
            borderRadius: 14,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            {/* Avatar */}
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: p.avBg, color: p.avFg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
              {p.initials}
            </div>
            {/* Name + flames stacked */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Row 1: name · status */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                  {p.name}{p.isCurrentUser && <span style={{ color: C.coral, fontWeight: 500 }}> · you</span>}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: sl.trophy ? C.coral : C.muted, whiteSpace: "nowrap" as const, flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                  {sl.text}{sl.trophy && <span>🏆</span>}
                </div>
              </div>
              {/* Row 2: flames */}
              <div style={{ display: "flex", gap: 4 }}>
                {p.weeks.map((s, i) => (
                  <Flame key={i} size={18} style={flameColor(s)} />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
type View = "dashboard" | "commit" | "reflect" | "wrap" | "week-review" | "apply" | "apply-pending" | "overview";

export default function Accountability() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { monthSlug, tab: tabParam } = useParams<{ monthSlug?: string; tab?: string }>();
  const queryClient = useQueryClient();
  const viewFromPath = (p: string): View => {
    if (p.endsWith("/dashboard") || p.endsWith("/recap")) return "wrap";
    if (p.endsWith("/overview")) return "overview";
    return "commit";
  };
  const weekFromTab = (t?: string): number | null => {
    if (!t) return null;
    const m = t.match(/^w([1-4])$/);
    return m ? parseInt(m[1]) : null;
  };
  const [view, setView] = useState<View>(() => tabParam === "dashboard" ? "wrap" : viewFromPath(pathname));
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [browseWeek, setBrowseWeek] = useState<number | null>(() => weekFromTab(tabParam)); // null = current week
  const [editingCommit, setEditingCommit] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [commitText, setCommitText] = useState("");
  const [relevance, setRelevance] = useState("");
  const [measurable, setMeasurable] = useState("");
  const [achievable, setAchievable] = useState("");
  const [reflectOutcome, setReflectOutcome] = useState<"yes" | "partial" | "no" | "">("");
  const [reflectText, setReflectText] = useState("");
  const [blocker, setBlocker] = useState("");
  const [adjustments, setAdjustments] = useState("");
  const [goalText, setGoalText] = useState("");
  const [successMetric, setSuccessMetric] = useState("");
  const [saving, setSaving] = useState(false);
  const [reflectDetail, setReflectDetail] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [selectedCycleMonth, setSelectedCycleMonth] = useState<{ month: number; year: number }>(() => {
    const n = new Date();
    if (monthSlug) {
      const m = monthSlugToNumber(monthSlug);
      const y = monthSlugToYear(monthSlug);
      if (m > 0) return { month: m, year: y };
    }
    return { month: n.getMonth() + 1, year: n.getFullYear() };
  });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentWeek = getWeekOfMonth(now);

  // ── URL helpers ───────────────────────────────────────────────
  const cycleMonthSlug = monthNumberToSlug(selectedCycleMonth.month, selectedCycleMonth.year);
  const commitUrl = `/momentum/${cycleMonthSlug}`;
  const dashboardUrl = commitUrl; // Dashboard merged into commitments view
  const overviewUrl = `/momentum/${cycleMonthSlug}/overview`;

  // Redirect /momentum (no slug) → current calendar month (fast path, no data needed)
  // The full "redirect to user's cohort" effect below runs once myMemberships loads.
  useEffect(() => {
    if (!monthSlug && isAdmin) {
      navigate(`/momentum/${monthNumberToSlug(currentMonth, currentYear)}`, { replace: true });
    }
  }, [monthSlug, isAdmin]); // eslint-disable-line

  // Keep view in sync with URL (back/forward, direct links)
  useEffect(() => {
    const v = viewFromPath(pathname);
    if (v === "wrap") setView("wrap");
    else if (v === "overview") setView("overview");
    else if (v === "commit" && !["reflect", "week-review"].includes(view)) setView("commit");
    const seg = pathname.split("/").pop();
    const wk = weekFromTab(seg);
    // If the URL week matches the current week, treat as current (browseWeek = null)
    // so the commitment form shows instead of the read-only past week summary.
    if (wk !== null) setBrowseWeek(wk === currentWeek ? null : wk);
  }, [pathname]);

  // Keep URL clean — remove any legacy /wN suffix on the commit view
  useEffect(() => {
    if (!cycleMonthSlug || view !== "commit") return;
    const desired = `/momentum/${cycleMonthSlug}`;
    if (pathname !== desired && !pathname.endsWith("/dashboard") && !pathname.endsWith("/overview")) {
      navigate(desired, { replace: true });
    }
  }, [cycleMonthSlug, view]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Redirect wrap/dashboard view → commit view (never call navigate during render).
  // If we're already at the commit URL, navigate() is a no-op and pathname never
  // changes, so the URL-sync effect never flips view back — handle that case by
  // directly setting view to "commit".
  useEffect(() => {
    if (view !== "wrap") return;
    if (pathname === commitUrl || pathname === commitUrl + "/") {
      setView("commit");
    } else {
      navigate(commitUrl, { replace: true });
    }
  }, [view, commitUrl, pathname]); // eslint-disable-line

  // Reset edit state when navigating between months
  useEffect(() => {
    setEditingCommit(false);
    setEditingGoal(false);
  }, [cycleMonthSlug]);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);


  // Cohort membership gate
  const { data: membership, isLoading: membershipLoading } = useQuery({
    queryKey: ["cohort-membership", user?.id, isAdmin],
    queryFn: async () => {
      if (!user) return null;
      // Admins always have access
      if (isAdmin) return { id: "admin", status: "joined" };

      // Try cycle_members table first (intended gate)
      const { data: byId } = await supabase
        .from("accountability_cycle_members")
        .select("id, status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (byId) return byId;

      const { data: byEmail } = await supabase
        .from("accountability_cycle_members")
        .select("id, status")
        .ilike("email", user.email ?? "")
        .maybeSingle();
      if (byEmail) return byEmail;

      // Fallback: if the cycle_members query returned nothing (could be a DB
      // permission issue or the user genuinely isn't added), grant access to
      // any approved member. The admin controls approval, so every approved
      // user is a vetted cohort participant.
      const { data: profile } = await supabase
        .from("profiles")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile?.status === "approved") {
        return { id: "approved-member", status: "joined" };
      }

      return null;
    },
    enabled: !!user,
  });

  // Link user_id on first visit — matches any row with this email where user_id
  // is not yet set (handles both "invited" and rows backfilled to "joined" without a user_id).
  useEffect(() => {
    if (!user?.email) return;
    supabase
      .from("accountability_cycle_members")
      .update({ status: "joined", user_id: user.id })
      .is("user_id", null)
      .ilike("email", user.email)
      .then(() => {});
  }, [user]);

  // All available cycles (for sidebar)
  const { data: allCycles } = useQuery({
    queryKey: ["all-accountability-cycles"],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("accountability_cycles")
        .select("id, name, month, year")
        .order("year", { ascending: true })
        .order("month", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });

  // Auto-select cycle from ?cycle=<id> URL param (e.g. from acceptance notification)
  useEffect(() => {
    const cycleId = searchParams.get("cycle");
    if (!cycleId || !allCycles?.length) return;
    const target = allCycles.find((c) => c.id === cycleId);
    if (target) setSelectedCycleMonth({ month: target.month, year: target.year });
  }, [searchParams, allCycles]);

  // Sync selected cycle from :monthSlug URL param
  useEffect(() => {
    if (!monthSlug || !allCycles?.length) return;
    const m = monthSlugToNumber(monthSlug);
    const y = monthSlugToYear(monthSlug);
    if (m <= 0) return;
    const match = allCycles.find((c) => c.month === m && c.year === y);
    if (match && (match.month !== selectedCycleMonth.month || match.year !== selectedCycleMonth.year)) {
      setSelectedCycleMonth({ month: match.month, year: match.year });
    }
  }, [monthSlug, allCycles]);


  // The user's membership rows across all cycles
  const { data: myMemberships } = useQuery({
    queryKey: ["my-cycle-memberships", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("accountability_cycle_members")
        .select("cycle_id, status")
        .eq("user_id", user.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Redirect /momentum (no slug) → user's most recent joined cohort.
  // Must live AFTER myMemberships and allCycles are declared so their values
  // are available in the dependency array (avoids temporal dead zone crash).
  useEffect(() => {
    if (monthSlug) return; // already have a slug in the URL
    if (isAdmin) return;   // handled by the admin-fast-path effect above
    if (myMemberships === undefined || allCycles === undefined) return; // wait for data
    const joinedIds = new Set(
      (myMemberships as Array<{ cycle_id: string; status: string }>)
        .filter(m => m.status === "joined" || m.status === "invited")
        .map(m => m.cycle_id)
    );
    const joinedCycles = (allCycles as Array<{ id: string; month: number; year: number }>)
      .filter(c => joinedIds.has(c.id))
      .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
    const target = joinedCycles[0];
    const slug = target
      ? monthNumberToSlug(target.month, target.year)
      : monthNumberToSlug(currentMonth, currentYear);
    navigate(`/momentum/${slug}`, { replace: true });
  }, [monthSlug, myMemberships, allCycles, isAdmin]); // eslint-disable-line

  // Main data query
  const { data, isLoading } = useQuery({
    queryKey: ["accountability", selectedCycleMonth.month, selectedCycleMonth.year, user?.id],
    queryFn: async () => {
      if (!user) return null;
      let { data: cycle } = await supabase.from("accountability_cycles").select("id, name, month, year").eq("month", selectedCycleMonth.month).eq("year", selectedCycleMonth.year).maybeSingle();
      if (!cycle) {
        const cycleName = format(new Date(selectedCycleMonth.year, selectedCycleMonth.month - 1, 1), "MMMM yyyy");
        const { data: newCycle, error } = await supabase.from("accountability_cycles").insert({ name: cycleName, month: selectedCycleMonth.month, year: selectedCycleMonth.year, created_by: user.id }).select("id, name, month, year").single();
        if (error && !error.message.includes("unique")) throw error;
        if (newCycle) cycle = newCycle;
        else { const { data: r } = await supabase.from("accountability_cycles").select("id, name, month, year").eq("month", selectedCycleMonth.month).eq("year", selectedCycleMonth.year).maybeSingle(); cycle = r; }
      }
      if (!cycle) return null;
      const cycleId = cycle.id;
      const [{ data: goals }, { data: entries }, { data: reflections }] = await Promise.all([
        supabase.from("accountability_monthly_goals").select("id, user_id, monthly_goal, success_metric").eq("cycle_id", cycleId),
        supabase.from("accountability_weekly_entries").select("id, user_id, week_number, specific_goal, relevance, achievable, measurable").eq("cycle_id", cycleId),
        supabase.from("accountability_weekly_reflections").select("id, user_id, week_number, achieved, reflection, blocker, adjustments").eq("cycle_id", cycleId),
      ]);
      const entryIds = (entries ?? []).map((e) => e.id);
      const { data: reactions } = entryIds.length
        ? await supabase.from("accountability_entry_reactions").select("id, entry_id, user_id, emoji").in("entry_id", entryIds)
        : { data: [] };
      // Build the cohort member list via a security-definer RPC that bypasses
      // the RLS policy on accountability_cycle_members (which restricts SELECT
      // to own rows, preventing members from seeing each other).
      // get_cycle_member_ids() returns all joined/invited user_ids for the cycle.
      const { data: cycleMembers } = await supabase.rpc("get_cycle_member_ids", { _cycle_id: cycleId });
      const memberUserIds = ((cycleMembers ?? []) as Array<{ user_id: string }>).map(m => m.user_id);

      // Only show members who are actually in the cohort (cycle_members is the
      // source of truth). No goals/entries fallback — that caused admin accounts
      // with test data to appear as participants.
      const allUserIds = memberUserIds;
      const { data: profiles } = allUserIds.length
        ? await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", allUserIds)
        : { data: [] };
      return { cycle, goals: goals ?? [], entries: entries ?? [], reflections: reflections ?? [], reactions: reactions ?? [], profiles: profiles ?? [] };
    },
    enabled: !!user && (!!membership || isAdmin),
  });

  // Pre-populate form fields when data loads
  useEffect(() => {
    if (!data) return;
    const isCurrent = data.cycle.month === currentMonth && data.cycle.year === currentYear;
    const effectiveWk = isCurrent ? currentWeek : 4;
    const goal = data.goals.find((g) => g.user_id === user?.id) ?? null;
    const entry = data.entries.find((e) => e.user_id === user?.id && e.week_number === effectiveWk) ?? null;
    setGoalText(goal?.monthly_goal ?? "");
    setCommitText(entry?.specific_goal ?? "");
    setRelevance(entry?.relevance ?? "");
    setMeasurable(entry?.measurable ?? "");
    setAchievable(entry?.achievable ?? "");
  }, [data]);

  // Membership gate — must be before any early returns (Rules of Hooks).
  // Inlines membership check using allCycles + myMemberships (both available here).
  useEffect(() => {
    if (isAdmin || !myMemberships || !allCycles?.length) return;
    if (view === "apply" || view === "apply-pending") return;
    const c = allCycles.find(
      (x) => x.month === selectedCycleMonth.month && x.year === selectedCycleMonth.year
    );
    if (!c) return;
    const row = (myMemberships as Array<{ cycle_id: string; status: string }>).find(m => m.cycle_id === c.id);
    const status = row?.status ?? null;
    if (status === "joined" || status === "invited") return; // ✓ has access

    // For past cycles the user isn't in: redirect to their most recent joined cohort
    // rather than showing a "Join this cohort" apply screen for a cycle that's already over.
    const isPast = c.year < currentYear || (c.year === currentYear && c.month < currentMonth);
    if (isPast) {
      const joinedIds = new Set(
        (myMemberships as Array<{ cycle_id: string; status: string }>)
          .filter(m => m.status === "joined" || m.status === "invited")
          .map(m => m.cycle_id)
      );
      const joinedCycles = (allCycles as Array<{ id: string; month: number; year: number }>)
        .filter(cyc => joinedIds.has(cyc.id))
        .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
      const target = joinedCycles[0];
      const slug = target
        ? monthNumberToSlug(target.month, target.year)
        : monthNumberToSlug(currentMonth, currentYear);
      navigate(`/momentum/${slug}`, { replace: true });
      return;
    }

    if (status === null) setView("apply");
    else if (status === "pending") setView("apply-pending");
  }, [selectedCycleMonth, myMemberships, allCycles, isAdmin]); // eslint-disable-line

  // Race-condition guard: isAdmin is resolved in a setTimeout after user is set,
  // so the membership gate can briefly fire with isAdmin=false and call setView("apply")
  // for the admin account. When isAdmin then becomes true the apply UI is guarded
  // with !isAdmin so it doesn't render — resulting in a blank page.
  // Fix: as soon as isAdmin is confirmed, reset any stale apply/apply-pending state.
  useEffect(() => {
    if (isAdmin && (view === "apply" || view === "apply-pending")) {
      setView("commit");
    }
  }, [isAdmin, view]);

  if (authLoading || isLoading || membershipLoading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}><LoadingSpinner size="lg" text="Loading…" /></div>;
  }

  // ── Apply view ────────────────────────────────────────────────
  if (view === "apply" && !isAdmin) {
    const selectedCycle = allCycles?.find(
      (c) => c.month === selectedCycleMonth.month && c.year === selectedCycleMonth.year
    );
    const monthLabel = format(new Date(selectedCycleMonth.year, selectedCycleMonth.month - 1, 1), "MMMM yyyy");
    return (
      <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${C.bg} 0%, ${C.lavWash} 100%)`, fontFamily: sans }}>
        <MainNav />
        <Container max={480}>
          <div style={{ textAlign: "center", paddingTop: 48 }}>
            <Eyebrow>{monthLabel} cohort</Eyebrow>
            <div style={{ marginTop: 12 }}><H1 size={36}>Join this cohort</H1></div>
            <div style={{ marginTop: 12 }}>
              <Sub>Apply to join the {format(new Date(selectedCycleMonth.year, selectedCycleMonth.month - 1, 1), "MMMM")} cohort alongside other members working towards their goals.</Sub>
            </div>
            <div style={{ marginTop: 28 }}>
              <PrimaryBtn onClick={async () => {
                if (!user || !selectedCycle) return;
                // Insert pending application
                const { error } = await supabase
                  .from("accountability_cycle_members")
                  .insert({ cycle_id: selectedCycle.id, user_id: user.id, email: user.email ?? "", status: "pending" });
                if (error && !error.message.includes("duplicate") && !error.message.includes("unique")) {
                  toast.error("Failed to submit application: " + error.message);
                  return;
                }
                // Notify all admins
                const { data: adminProfiles } = await supabase
                  .from("user_roles")
                  .select("user_id")
                  .or("role.eq.admin,role.eq.owner");
                if (adminProfiles?.length) {
                  const userName = user.email?.split("@")[0] ?? "Someone";
                  await supabase.from("notifications").insert(
                    adminProfiles.map((a: { user_id: string }) => ({
                      user_id: a.user_id,
                      title: "New cohort application",
                      body: `${userName} applied to join the ${selectedCycle.name} cohort`,
                      link: `/admin/momentum?cycle=${selectedCycle.id}`,
                    }))
                  );
                }
                toast.success("Application submitted! You'll be notified when it's reviewed.");
                queryClient.invalidateQueries({ queryKey: ["my-cycle-memberships", user.id] });
                setView("apply-pending");
              }}>
                Apply to join →
              </PrimaryBtn>
            </div>
            <div style={{ marginTop: 16 }}>
              <GhostBtn onClick={() => {
                // Navigate directly to user's most recent joined cohort to avoid loops
                type MRow = { cycle_id: string; status: string };
                type CRow = { id: string; month: number; year: number };
                const joinedIds = new Set(
                  ((myMemberships ?? []) as MRow[])
                    .filter(m => m.status === "joined" || m.status === "invited")
                    .map(m => m.cycle_id)
                );
                const joinedCycles = ((allCycles ?? []) as CRow[])
                  .filter(c => joinedIds.has(c.id))
                  .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
                const target = joinedCycles[0];
                const slug = target
                  ? monthNumberToSlug(target.month, target.year)
                  : monthNumberToSlug(currentMonth, currentYear);
                navigate(`/momentum/${slug}`, { replace: true });
              }}><ArrowLeft size={16} /> Back to home</GhostBtn>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // ── Apply pending view ────────────────────────────────────────
  if (view === "apply-pending" && !isAdmin) {
    const monthLabel = format(new Date(selectedCycleMonth.year, selectedCycleMonth.month - 1, 1), "MMMM yyyy");
    return (
      <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${C.bg} 0%, ${C.lavWash} 100%)`, fontFamily: sans }}>
        <MainNav />
        <Container max={480}>
          <div style={{ textAlign: "center", paddingTop: 48 }}>
            <Eyebrow>{monthLabel} cohort</Eyebrow>
            <div style={{ marginTop: 12 }}><H1 size={36}>Application pending</H1></div>
            <div style={{ marginTop: 12 }}>
              <Sub>Your application is being reviewed. You'll receive a notification once it's accepted.</Sub>
            </div>
            <div style={{ marginTop: 28 }}>
              <GhostBtn onClick={async () => {
                if (!user) return;
                const selectedCycle = allCycles?.find(
                  (c) => c.month === selectedCycleMonth.month && c.year === selectedCycleMonth.year
                );
                if (!selectedCycle) return;
                await supabase
                  .from("accountability_cycle_members")
                  .delete()
                  .eq("cycle_id", selectedCycle.id)
                  .eq("user_id", user.id)
                  .eq("status", "pending");
                toast.success("Application cancelled.");
                queryClient.invalidateQueries({ queryKey: ["my-cycle-memberships", user.id] });
                setView("apply");
              }}>
                Cancel application
              </GhostBtn>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // Not in cohort gate (for current month's cycle — the main feature gate)
  if (!membership) {
    // Check if there are any cycles available to apply to
    const hasCycles = allCycles && allCycles.length > 0;
    if (hasCycles) {
      // Redirect to apply view for the current month cycle if it exists
      const currentCycle = allCycles.find(
        (c) => c.month === currentMonth && c.year === currentYear
      );
      if (currentCycle) {
        const pendingMembership = myMemberships?.find((m) => m.cycle_id === currentCycle.id);
        if (pendingMembership?.status === "pending") {
          return (
            <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${C.bg} 0%, ${C.lavWash} 100%)`, fontFamily: sans }}>
              <MainNav />
              <Container max={480}>
                <div style={{ textAlign: "center", paddingTop: 48 }}>
                  <Eyebrow>{format(new Date(currentYear, currentMonth - 1, 1), "MMMM yyyy")} cohort</Eyebrow>
                  <div style={{ marginTop: 12 }}><H1 size={36}>Application pending</H1></div>
                  <div style={{ marginTop: 12 }}>
                    <Sub>Your application is being reviewed. You'll receive a notification once it's accepted.</Sub>
                  </div>
                  <div style={{ marginTop: 28 }}>
                    <GhostBtn onClick={async () => {
                      if (!user) return;
                      await supabase
                        .from("accountability_cycle_members")
                        .delete()
                        .eq("cycle_id", currentCycle.id)
                        .eq("user_id", user.id)
                        .eq("status", "pending");
                      toast.success("Application cancelled.");
                      queryClient.invalidateQueries({ queryKey: ["my-cycle-memberships", user.id] });
                      queryClient.invalidateQueries({ queryKey: ["cohort-membership", user.id, isAdmin] });
                    }}>
                      Cancel application
                    </GhostBtn>
                  </div>
                </div>
              </Container>
            </div>
          );
        }
        return (
          <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${C.bg} 0%, ${C.lavWash} 100%)`, fontFamily: sans }}>
            <MainNav />
            <Container max={480}>
              <div style={{ textAlign: "center", paddingTop: 48 }}>
                <Eyebrow>{format(new Date(currentYear, currentMonth - 1, 1), "MMMM yyyy")} cohort</Eyebrow>
                <div style={{ marginTop: 12 }}><H1 size={36}>Join this cohort</H1></div>
                <div style={{ marginTop: 12 }}>
                  <Sub>Apply to join the {format(new Date(currentYear, currentMonth - 1, 1), "MMMM")} cohort alongside other members working towards their goals.</Sub>
                </div>
                <div style={{ marginTop: 28 }}>
                  <PrimaryBtn onClick={async () => {
                    if (!user) return;
                    const { error } = await supabase
                      .from("accountability_cycle_members")
                      .insert({ cycle_id: currentCycle.id, user_id: user.id, email: user.email ?? "", status: "pending" });
                    if (error && !error.message.includes("duplicate") && !error.message.includes("unique")) {
                      toast.error("Failed to submit application: " + error.message);
                      return;
                    }
                    const { data: adminProfiles } = await supabase
                      .from("user_roles")
                      .select("user_id")
                      .or("role.eq.admin,role.eq.owner");
                    if (adminProfiles?.length) {
                      const userName = user.email?.split("@")[0] ?? "Someone";
                      await supabase.from("notifications").insert(
                        adminProfiles.map((a: { user_id: string }) => ({
                          user_id: a.user_id,
                          title: "New cohort application",
                          body: `${userName} applied to join the ${currentCycle.name} cohort`,
                          link: `/admin/momentum?cycle=${currentCycle.id}`,
                        }))
                      );
                    }
                    toast.success("Application submitted! You'll be notified when it's reviewed.");
                    queryClient.invalidateQueries({ queryKey: ["my-cycle-memberships", user.id] });
                    queryClient.invalidateQueries({ queryKey: ["cohort-membership", user.id, isAdmin] });
                  }}>
                    Apply to join →
                  </PrimaryBtn>
                </div>
                <div style={{ marginTop: 16 }}>
                  <GhostBtn onClick={() => navigate("/dashboard")}><ArrowLeft size={16} /> Back to home</GhostBtn>
                </div>
              </div>
            </Container>
          </div>
        );
      }
    }
    return (
      <div className="min-h-screen" style={{ background: C.bg }}>
        <MainNav />
        <Container max={480}>
          <div style={{ textAlign: "center", paddingTop: 48 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.coralWash, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Target style={{ color: C.coral, width: 24, height: 24 }} />
            </div>
            <H1 size={32}>Monday Momentum</H1>
            <div style={{ marginTop: 12 }}><Sub>You haven't been added to a cohort yet. Ask your admin to invite you to the next Momentum group.</Sub></div>
            <div style={{ marginTop: 24 }}><GhostBtn onClick={() => navigate("/dashboard")}><ArrowLeft size={16} /> Back to home</GhostBtn></div>
          </div>
        </Container>
      </div>
    );
  }

  if (!data) return <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}><LoadingSpinner size="lg" /></div>;

  const { cycle, goals, entries, reflections, reactions, profiles } = data;
  const getProfile = (uid: string) => profiles.find((p) => p.user_id === uid);
  const myGoal = goals.find((g) => g.user_id === user!.id) ?? null;
  const myEntry = (wk: number) => entries.find((e) => e.user_id === user!.id && e.week_number === wk) ?? null;
  const myReflect = (wk: number) => reflections.find((r) => r.user_id === user!.id && r.week_number === wk) ?? null;
  const monthName = format(new Date(cycle.year, cycle.month - 1), "MMMM");
  const cohortOthers = profiles.filter((p) => p.user_id !== user!.id);

  // Cycle-aware helpers
  const isCycleCurrent = cycle.month === currentMonth && cycle.year === currentYear;
  const isCycleFuture = cycle.year > currentYear || (cycle.year === currentYear && cycle.month > currentMonth);
  const isCycleEditable = isCycleCurrent || isCycleFuture;
  const cycleEffectiveWeek = isCycleCurrent ? currentWeek : isCycleFuture ? 1 : 4;

  // Helper: get membership status for a given cycle id
  const getMembershipStatus = (cycleId: string): "joined" | "invited" | "pending" | null => {
    if (isAdmin) return "joined";
    const row = myMemberships?.find((m) => m.cycle_id === cycleId);
    return (row?.status as "joined" | "invited" | "pending" | null) ?? null;
  };

  // Sidebar component
  function CycleSidebar({ cycles, selected, onSelect }: {
    cycles: Array<{ id: string; month: number; year: number; name: string }>;
    selected: { month: number; year: number };
    onSelect: (m: number, y: number, cycleId: string) => void;
  }) {
    const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (!cycles || cycles.length < 2) return null;
    return (
      <div style={{ width: 160, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4, paddingTop: 4 }}>
        {cycles.map((c) => {
          const isSelected = c.month === selected.month && c.year === selected.year;
          const label = `${MONTH_ABBR[c.month - 1]} ${c.year}`;
          const status = getMembershipStatus(c.id);
          const indicator = status === "pending" ? "⏳" : status === null ? "+" : null;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.month, c.year, c.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 12px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                background: isSelected ? C.coral : "transparent",
                color: isSelected ? "#fff" : C.muted,
                fontFamily: sans,
                fontSize: 13,
                fontWeight: isSelected ? 700 : 500,
                textAlign: "left" as const,
                transition: "all 0.15s",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: isSelected ? "#fff" : C.faint, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{label}</span>
              {indicator && !isSelected && (
                <span style={{ fontSize: 11, opacity: 0.8 }}>{indicator}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Week progress states
  const weekStates = [1, 2, 3, 4].map((wk): "done" | "current" | "partial" | "future" => {
    if (wk > cycleEffectiveWeek) return "future";
    if (wk < cycleEffectiveWeek) {
      const r = myReflect(wk);
      return r ? (r.achieved === "yes" ? "done" : "partial") : "done";
    }
    return "current";
  });

  // Streak (consecutive weeks with a reflection)
  let streak = 0;
  for (let wk = currentWeek - 1; wk >= 1; wk--) { if (myReflect(wk)) streak++; else break; }

  const isWeekUnlocked = (wk: number) => new Date() >= weekUnlockTime(cycle.month, cycle.year, wk);

  // ── Toggle reaction ───────────────────────────────────────────
  const toggleReaction = async (entryId: string, emoji: string) => {
    if (!user) return;
    const existing = reactions.find((r) => r.entry_id === entryId && r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      await supabase.from("accountability_entry_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("accountability_entry_reactions").insert({ entry_id: entryId, user_id: user.id, emoji });
    }
    queryClient.invalidateQueries({ queryKey: ["accountability"] });
  };


  // ── Save reflection ───────────────────────────────────────────
  const saveReflect = async () => {
    if (!reflectText.trim()) return;
    setSaving(true);
    try {
      const existing = myReflect(selectedWeek);
      const achievedVal = reflectOutcome || null;
      if (existing) {
        await supabase.from("accountability_weekly_reflections").update({ achieved: achievedVal, reflection: reflectText.trim(), blocker: blocker.trim() || null, adjustments: adjustments.trim() || null }).eq("id", existing.id);
      } else {
        await supabase.from("accountability_weekly_reflections").insert({ cycle_id: cycle.id, user_id: user!.id, week_number: selectedWeek, achieved: achievedVal, reflection: reflectText.trim(), blocker: blocker.trim() || null, adjustments: adjustments.trim() || null });
      }
      await queryClient.invalidateQueries({ queryKey: ["accountability"] });
      toast.success("Reflection saved!");
      navigate(dashboardUrl);
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  // ── Open commit form ──────────────────────────────────────────
  const openCommit = (wk: number) => {
    const e = myEntry(wk);
    setSelectedWeek(wk);
    setCommitText(e?.specific_goal ?? "");
    setRelevance(e?.relevance ?? "");
    setMeasurable(e?.measurable ?? "");
    setAchievable(e?.achievable ?? "");
    setView("commit");
  };

  // ── Open reflect form ─────────────────────────────────────────
  const openReflect = (wk: number) => {
    const r = myReflect(wk);
    setSelectedWeek(wk);
    setReflectOutcome((r?.achieved as any) ?? "");
    setReflectText(r?.reflection ?? "");
    setBlocker(r?.blocker ?? "");
    setAdjustments(r?.adjustments ?? "");
    setReflectDetail(false);
    setView("reflect");
  };

  // ── Open goal form ────────────────────────────────────────────
  const openGoal = () => {
    navigate(commitUrl);
  };

  // ── Open week review ──────────────────────────────────────────
  const openWeekReview = (wk: number) => {
    setSelectedWeek(wk);
    setView("week-review");
  };

  // ─────────────────────────────────────────────────────────────
  // 01 MY COMMITMENT — 4-week spread
  // ─────────────────────────────────────────────────────────────
  if (view === "commit") {
    const showSidebar = !!(allCycles && allCycles.length >= 2);
    const bothSaved = !!(myGoal?.monthly_goal && myEntry(cycleEffectiveWeek)?.specific_goal);
    // ── 4-week spread helpers ─────────────────────────────────────
    const spreadAchievedCount = [1,2,3,4].filter(wk => myReflect(wk)?.achieved === "yes").length;
    const spreadGoalPct = spreadAchievedCount > 0 ? Math.round((spreadAchievedCount / 4) * 100) : 0;
    const committed = [1,2,3,4].filter(wk => !!myEntry(wk)).length;
    const reflected = [1,2,3,4].filter(wk => !!myReflect(wk)).length;
    const achievedPct = Math.round([1,2,3,4].reduce((sum, wk) => {
      const r = myReflect(wk);
      if (r?.achieved === "yes") return sum + 25;
      if (r?.achieved === "partial") return sum + 12.5;
      return sum;
    }, 0));
    const openEditWeek = (wk: number) => {
      const e = myEntry(wk);
      const r = myReflect(wk);
      setSelectedWeek(wk);
      setCommitText(e?.specific_goal ?? "");
      setRelevance(e?.relevance ?? "");
      setMeasurable(e?.measurable ?? "");
      setAchievable(e?.achievable ?? "");
      setReflectOutcome((r?.achieved as any) ?? "");
      setReflectText(r?.reflection ?? "");
      setBlocker(r?.blocker ?? "");
      setAdjustments(r?.adjustments ?? "");
      setEditingCommit(true);
    };
    const isPastWeek = selectedWeek < cycleEffectiveWeek || !isCycleCurrent || isWeekUnlocked(selectedWeek);

    const SpreadWeekCard = ({ wk }: { wk: number }) => {
      const e = myEntry(wk);
      const r = myReflect(wk);
      const isCurr = isCycleCurrent && wk === cycleEffectiveWeek;
      const isFut = wk > cycleEffectiveWeek && isCycleCurrent;
      const isDone = wk < cycleEffectiveWeek || (!isCycleCurrent && wk <= 4);
      const isSlipped = isDone && r && r.achieved !== "yes";
      const isAchieved = isDone && r?.achieved === "yes";

      const statusLabel = isAchieved ? "✓ Done" : isSlipped ? "Slipped" : isCurr ? "This week" : "Upcoming";
      const statusStyle: React.CSSProperties = isAchieved
        ? { background: C.sageWash, color: C.sage }
        : isSlipped
        ? { background: C.amberWash, color: C.amber }
        : isCurr
        ? { background: C.coralWash, color: C.coralDk }
        : { background: "rgba(0,0,0,.05)", color: C.faint };

      const cardStyle: React.CSSProperties = {
        background: isFut ? "rgba(255,255,255,.6)" : C.card,
        borderRadius: 18,
        border: isCurr
          ? `1.5px solid ${C.coral}`
          : `1px solid ${isFut ? C.borderStrong : C.borderSoft}`,
        borderStyle: isFut ? "dashed" : "solid",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: isCurr
          ? `0 1px 0 ${C.coralWash}, 0 6px 24px rgba(229,90,43,.08)`
          : "0 1px 2px rgba(31,26,20,.04)",
        transition: "box-shadow .15s",
      };

      return (
        <div style={cardStyle}>
          {/* Head */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 12px", borderBottom: `1px solid ${C.borderSoft}` }}>
            <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 500, letterSpacing: -0.01, color: isCurr ? C.coral : C.ink }}>Week {wk}</div>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4, ...statusStyle }}>{statusLabel}</span>
          </div>

          {/* Body */}
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12, flex: "1 1 auto", fontSize: 13.5, lineHeight: 1.5 }}>
            {isFut ? (
              <div style={{ fontFamily: serif, fontSize: 16.5, color: C.faint, fontStyle: "normal", lineHeight: 1.4 }}>
                No commitment yet — set it on Monday.
              </div>
            ) : e ? (
              <>
                <div style={{ fontFamily: serif, fontSize: 16.5, color: C.ink, lineHeight: 1.4, letterSpacing: -0.005 }}>{e.specific_goal}</div>
                {e.measurable && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: C.faint, display: "flex", alignItems: "center", gap: 5 }}>🎯 Success criteria</div>
                    <div style={{ color: C.ink2 }}>{e.measurable}</div>
                  </div>
                )}
                {e.relevance && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: C.faint, display: "flex", alignItems: "center", gap: 5 }}>💡 Why it matters</div>
                    <div style={{ color: C.ink2 }}>{e.relevance}</div>
                  </div>
                )}
                {e.achievable && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: C.faint, display: "flex", alignItems: "center", gap: 5 }}>⚡ Blockers</div>
                    <div style={{ color: C.ink2 }}>{e.achievable}</div>
                  </div>
                )}
                {r?.reflection && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: C.sage, display: "flex", alignItems: "center", gap: 5 }}>✏️ Reflection</div>
                    <div style={{ color: C.ink2 }}>{r.reflection}</div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontFamily: serif, fontSize: 16.5, color: C.faint, fontStyle: "normal", lineHeight: 1.4 }}>
                No commitment yet — set it on Monday.
              </div>
            )}
          </div>

          {/* CTA footer */}
          {isCycleEditable && ((isCurr || isDone) && (
            <div style={{ padding: "8px 18px 14px", borderTop: `1px solid ${C.borderSoft}`, display: "flex", gap: 8 }}>
              {!e ? (
                // No commitment yet — single primary button
                <button
                  onClick={() => openEditWeek(wk)}
                  style={{
                    background: "none", border: `1px solid ${C.coral}`, borderRadius: 999,
                    padding: "6px 14px", cursor: "pointer", fontFamily: sans, fontSize: 12,
                    fontWeight: 500, color: C.coral, display: "inline-flex", alignItems: "center", gap: 6,
                  }}
                >
                  Set commitment →
                </button>
              ) : (
                <>
                  {/* Edit commitment — always shown once committed */}
                  <button
                    onClick={() => openEditWeek(wk)}
                    style={{
                      background: "none", border: `1px solid ${C.border}`, borderRadius: 999,
                      padding: "6px 14px", cursor: "pointer", fontFamily: sans, fontSize: 12,
                      fontWeight: 500, color: C.muted, display: "inline-flex", alignItems: "center", gap: 6,
                    }}
                  >
                    ✏️ Edit commitment
                  </button>
                  {/* Reflection button — only when week is unlocked */}
                  {isWeekUnlocked(wk) && (
                    r ? (
                      // Reflection done — ghost edit button
                      <button
                        onClick={() => openEditWeek(wk)}
                        style={{
                          background: "none", border: `1px solid ${C.border}`, borderRadius: 999,
                          padding: "6px 14px", cursor: "pointer", fontFamily: sans, fontSize: 12,
                          fontWeight: 500, color: C.muted, display: "inline-flex", alignItems: "center", gap: 6,
                        }}
                      >
                        ✏️ Edit reflection
                      </button>
                    ) : (
                      // No reflection yet — coral primary button
                      <button
                        onClick={() => openEditWeek(wk)}
                        style={{
                          border: "none", borderRadius: 999, padding: "6px 14px", cursor: "pointer",
                          background: C.coral, fontFamily: sans, fontSize: 12, fontWeight: 500,
                          color: "#fff", display: "inline-flex", alignItems: "center", gap: 6,
                          boxShadow: `0 1px 0 rgba(0,0,0,.1), 0 1px 8px rgba(229,90,43,.25)`,
                        }}
                      >
                        Complete reflection →
                      </button>
                    )
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      );
    };

    // Default: 4-week spread
    return (
      <div className="min-h-screen" style={{ background: C.bg, fontFamily: sans, overflowX: "hidden" }}>
        <MainNav />
        <MomentumNav current="commitment" onCommitment={() => setBrowseWeek(null)} onOverview={() => navigate(overviewUrl)} />

        {/* ── Goal edit popup ───────────────────────────────────── */}
        {editingGoal && !editingCommit && (
          <>
            {/* Transparent click-outside catcher — no visual dimming */}
            <div onClick={() => setEditingGoal(false)} style={{ position: "fixed", inset: 0, zIndex: 900 }} />
            <div style={{ position: "fixed", inset: 0, zIndex: 901, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, pointerEvents: "none" }}>
              <div style={{ background: C.card, borderRadius: 24, padding: isMobile ? "28px 24px" : "36px 40px", width: "100%", maxWidth: 500, boxShadow: "0 8px 40px rgba(31,26,20,.14), 0 1px 3px rgba(31,26,20,.06)", fontFamily: sans, pointerEvents: "auto" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.lavDk, marginBottom: 6 }}>
                  {monthName} {cycle.year}
                </div>
                <div style={{ fontFamily: serif, fontSize: isMobile ? 22 : 27, fontWeight: 500, color: C.ink, lineHeight: 1.2, marginBottom: 22 }}>
                  What's your goal<br />for this month?
                </div>
                <textarea
                  autoFocus
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  maxLength={240}
                  placeholder="Be specific — 'Run 3× a week' beats 'Get healthy'."
                  rows={4}
                  style={{ width: "100%", borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.bgSoft, padding: "14px 16px", fontSize: 15, color: C.ink, lineHeight: 1.55, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" as const }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = C.lav; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
                />
                <div style={{ fontSize: 12, color: C.faint, marginTop: 4, textAlign: "right" as const }}>{goalText.length} / 240</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22 }}>
                  <GhostBtn onClick={() => setEditingGoal(false)}>Cancel</GhostBtn>
                  <PrimaryBtn
                    disabled={!goalText.trim() || saving}
                    onClick={async () => {
                      setSaving(true);
                      try {
                        if (myGoal) {
                          await supabase.from("accountability_monthly_goals")
                            .update({ monthly_goal: goalText.trim() })
                            .eq("id", myGoal.id);
                        } else {
                          await supabase.from("accountability_monthly_goals")
                            .insert({ cycle_id: cycle.id, user_id: user!.id, monthly_goal: goalText.trim() });
                        }
                        await queryClient.invalidateQueries({ queryKey: ["accountability"] });
                        toast.success("Goal saved!");
                        setEditingGoal(false);
                      } catch { toast.error("Failed to save goal"); }
                      finally { setSaving(false); }
                    }}
                  >
                    {saving ? "Saving…" : "Save goal →"}
                  </PrimaryBtn>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Weekly commitment edit popup ─────────────────────── */}
        {editingCommit && (
          <>
            <div onClick={() => setEditingCommit(false)} style={{ position: "fixed", inset: 0, zIndex: 900 }} />
            <div style={{ position: "fixed", inset: 0, zIndex: 901, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 12 : 20, pointerEvents: "none" }}>
              <div style={{
                background: C.bg, borderRadius: 24, width: "100%", maxWidth: 600,
                maxHeight: `calc(100vh - ${isMobile ? "24px" : "40px"})`, overflowY: "auto",
                boxShadow: "0 8px 40px rgba(31,26,20,.14), 0 1px 3px rgba(31,26,20,.06)",
                pointerEvents: "auto", fontFamily: sans,
              }}>
                {/* Sticky header */}
                <div style={{ position: "sticky", top: 0, background: C.bg, zIndex: 1, padding: isMobile ? "20px 20px 16px" : "28px 32px 16px", borderBottom: `1px solid ${C.borderSoft}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.coral, marginBottom: 4 }}>
                    Monday Momentum · {monthName}
                  </div>
                  <div style={{ fontFamily: serif, fontSize: isMobile ? 24 : 30, fontWeight: 500, color: C.ink, lineHeight: 1.1 }}>
                    Week {selectedWeek} of 4. <em style={{ fontStyle: "italic", color: C.coral }}>Edit.</em>
                  </div>
                </div>

                {/* Form body */}
                <div style={{ padding: isMobile ? "20px 20px 28px" : "24px 32px 32px", display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* Commitment card */}
                  <div style={{ background: C.card, border: `1.5px solid ${C.coral}`, borderRadius: 18, padding: isMobile ? 18 : 24 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.coralDk, display: "block", marginBottom: 10 }}>Week {selectedWeek} Commitment</label>
                    <textarea autoFocus value={commitText} onChange={(e) => setCommitText(e.target.value)} maxLength={200} placeholder="What's the one thing you're committing to this week?" rows={3} style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, padding: "14px 16px", fontSize: 15, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" as const }} />
                    <div style={{ fontSize: 12, color: C.faint, marginTop: 6, textAlign: "right" as const, marginBottom: 16 }}>{commitText.length} / 200</div>
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div><label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>🎯 Success criteria</label><textarea value={measurable} onChange={(e) => setMeasurable(e.target.value)} rows={2} placeholder="How will you know you've achieved it?" style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, padding: "10px 14px", fontSize: 14, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" as const }} /></div>
                      <div><label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>💡 Why it matters</label><textarea value={relevance} onChange={(e) => setRelevance(e.target.value)} rows={2} placeholder="Why does it matter? How will it bring your business forward?" style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, padding: "10px 14px", fontSize: 14, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" as const }} /></div>
                      <div><label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>⚡ Potential blockers</label><textarea value={achievable} onChange={(e) => setAchievable(e.target.value)} rows={2} placeholder="What are the potential blockers? Do you have all the resources needed?" style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, padding: "10px 14px", fontSize: 14, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" as const }} /></div>
                    </div>
                  </div>

                  {/* Reflection card — past weeks only */}
                  {isPastWeek && (
                    <div style={{ background: C.card, border: `1.5px solid ${C.sage}`, borderRadius: 18, padding: isMobile ? 18 : 24 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.sage, display: "block", marginBottom: 14 }}>Week {selectedWeek} Reflection</label>
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 10 }}>Did you achieve what you set out to do?</label>
                        <div style={{ display: "flex", gap: 10 }}>
                          {([
                            { val: "yes", label: "Yes", color: C.sage, wash: C.sageWash },
                            { val: "partial", label: "Partly", color: C.amber, wash: C.amberWash },
                            { val: "no", label: "Not yet", color: C.muted, wash: "#F2EEE6" },
                          ] as const).map((o) => (
                            <div key={o.val} onClick={() => setReflectOutcome(o.val)}
                              style={{ flex: 1, padding: "12px 10px", borderRadius: 12, textAlign: "center" as const, cursor: "pointer",
                                background: reflectOutcome === o.val ? o.wash : C.card,
                                border: reflectOutcome === o.val ? `2px solid ${o.color}` : `1px solid ${C.border}`,
                              }}>
                              <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 500, color: reflectOutcome === o.val ? o.color : C.ink }}>{o.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div><label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>✏️ What actually happened?</label><textarea value={reflectText} onChange={(e) => setReflectText(e.target.value)} rows={3} placeholder="What actually happened?" style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, padding: "10px 14px", fontSize: 14, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" as const }} /></div>
                        <div><label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>🐢 What slowed you down?</label><textarea value={blocker} onChange={(e) => setBlocker(e.target.value)} rows={2} placeholder="What slowed you down?" style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, padding: "10px 14px", fontSize: 14, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" as const }} /></div>
                        <div><label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>🔄 What would you do differently next time?</label><textarea value={adjustments} onChange={(e) => setAdjustments(e.target.value)} rows={2} placeholder="What would you do differently next week?" style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, padding: "10px 14px", fontSize: 14, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" as const }} /></div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
                    <GhostBtn onClick={() => setEditingCommit(false)}>Cancel</GhostBtn>
                    <PrimaryBtn style={{ width: 180 }} disabled={!commitText.trim() || saving} onClick={async () => {
                      setSaving(true);
                      try {
                        if (commitText.trim()) {
                          const existing = myEntry(selectedWeek);
                          if (existing) { await supabase.from("accountability_weekly_entries").update({ specific_goal: commitText.trim(), relevance: relevance.trim() || null, measurable: measurable.trim() || null, achievable: achievable.trim() || null }).eq("id", existing.id); }
                          else { await supabase.from("accountability_weekly_entries").insert({ cycle_id: cycle.id, user_id: user!.id, week_number: selectedWeek, specific_goal: commitText.trim(), relevance: relevance.trim() || null, measurable: measurable.trim() || null, achievable: achievable.trim() || null }); }
                        }
                        if (isPastWeek && reflectText.trim()) {
                          const existingReflect = myReflect(selectedWeek);
                          const achievedVal = reflectOutcome || null;
                          if (existingReflect) { await supabase.from("accountability_weekly_reflections").update({ achieved: achievedVal, reflection: reflectText.trim(), blocker: blocker.trim() || null, adjustments: adjustments.trim() || null }).eq("id", existingReflect.id); }
                          else { await supabase.from("accountability_weekly_reflections").insert({ cycle_id: cycle.id, user_id: user!.id, week_number: selectedWeek, achieved: achievedVal, reflection: reflectText.trim(), blocker: blocker.trim() || null, adjustments: adjustments.trim() || null }); }
                        }
                        await queryClient.invalidateQueries({ queryKey: ["accountability"] });
                        toast.success("Saved!");
                        setEditingCommit(false);
                      } catch { toast.error("Failed to save"); }
                      finally { setSaving(false); }
                    }}>{saving ? "Saving…" : "Save →"}</PrimaryBtn>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div style={{ maxWidth: 1380, margin: "0 auto", padding: isMobile ? "20px 16px 80px" : "32px 36px 80px" }}>
          {/* Header row */}
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "flex-end", justifyContent: "space-between", gap: isMobile ? 12 : 24, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.coral, marginBottom: 8 }}>
                Monday Momentum · {monthName} {cycle.year}
              </div>
              <h1 style={{ fontFamily: serif, fontSize: isMobile ? 34 : 44, lineHeight: 1.05, letterSpacing: -0.02, fontWeight: 500, margin: 0, color: C.ink }}>
                Your four-week <em style={{ fontStyle: "italic", color: C.coral }}>spread.</em>
              </h1>
            </div>
            <div style={{ position: "relative" }}>
              {showMonthDropdown && (
                <div onClick={() => setShowMonthDropdown(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
              )}
              <button
                onClick={() => setShowMonthDropdown(d => !d)}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${showMonthDropdown ? C.borderStrong : C.border}`, padding: "7px 14px", borderRadius: 999, fontSize: 13, fontWeight: 500, color: C.ink2, cursor: "pointer", fontFamily: sans }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.coral, display: "inline-block", flexShrink: 0 }} />
                {monthName} {cycle.year}
                <span style={{ fontSize: 11, color: C.faint, marginLeft: 2 }}>▾</span>
              </button>
              {showMonthDropdown && allCycles && allCycles.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: C.card, border: `1px solid ${C.borderSoft}`, borderRadius: 14, boxShadow: "0 8px 24px rgba(31,26,20,.10)", minWidth: 160, zIndex: 200, overflow: "hidden", padding: 4 }}>
                  {(allCycles as Array<{ id: string; month: number; year: number; name: string }>).map((c) => {
                    const isSelected = c.month === selectedCycleMonth.month && c.year === selectedCycleMonth.year;
                    const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    const label = `${MONTH_ABBR[c.month - 1]} ${c.year}`;
                    return (
                      <button key={c.id} onClick={() => {
                        setShowMonthDropdown(false);
                        setSelectedCycleMonth({ month: c.month, year: c.year });
                        setBrowseWeek(null);
                        const slug = monthNumberToSlug(c.month, c.year);
                        const isPast = c.year < currentYear || (c.year === currentYear && c.month < currentMonth);
                        if (isPast) { setView("wrap"); navigate(`/momentum/${slug}/dashboard`); }
                        else { setView("commit"); navigate(`/momentum/${slug}`); }
                      }} style={{
                        display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px",
                        background: isSelected ? C.coralWash : "transparent", border: "none", borderRadius: 10,
                        cursor: "pointer", fontFamily: sans, fontSize: 13, fontWeight: isSelected ? 600 : 500,
                        color: isSelected ? C.coralDk : C.ink2, textAlign: "left" as const,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: isSelected ? C.coral : C.ink5, flexShrink: 0 }} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Compact goal card */}
          <div style={{ background: `linear-gradient(150deg, ${C.lavTint} 0%, ${C.lavWash} 100%)`, border: `1px solid ${C.lavWash}`, borderRadius: 18, padding: isMobile ? "18px 18px" : "20px 24px", marginBottom: 16 }}>
            {isMobile ? (
              /* Mobile: stacked layout */
              <>
                {/* Label row: MAY GOAL · 50% ACHIEVED on one line */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.lavDk }}>{monthName} Goal</span>
                </div>
                {/* Goal text */}
                <div style={{ fontFamily: serif, fontSize: 18, lineHeight: 1.35, color: myGoal?.monthly_goal ? C.ink : C.faint, marginBottom: 14 }}>
                  {myGoal?.monthly_goal ?? "No goal set yet."}
                </div>
                {/* Progress bar + weeks landed */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1, height: 5, borderRadius: 999, background: "rgba(111,88,214,.18)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${achievedPct}%`, background: C.lav, borderRadius: 999, transition: "width .4s" }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: C.lavDk, whiteSpace: "nowrap" as const }}>{spreadAchievedCount} of 4 weeks landed</div>
                </div>
                {/* Edit link */}
                <button onClick={() => { setGoalText(myGoal?.monthly_goal ?? ""); setEditingGoal(true); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.lavDk, padding: 0 }}>
                  Edit goal ↗
                </button>
              </>
            ) : (
              /* Desktop: 3-column grid */
              <>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 24, alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.lavDk }}>{monthName} Goal</div>
                  </div>
                  <div style={{ fontFamily: serif, fontSize: 20, lineHeight: 1.3, color: myGoal?.monthly_goal ? C.ink : C.faint }}>
                    {myGoal?.monthly_goal ?? "No goal set — click Edit to add one."}
                  </div>
                  <button onClick={() => { setGoalText(myGoal?.monthly_goal ?? ""); setEditingGoal(true); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.lavDk, whiteSpace: "nowrap" as const, padding: 0 }}>
                    Edit goal →
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, height: 5, borderRadius: 999, background: "rgba(111,88,214,.18)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${achievedPct}%`, background: C.lav, borderRadius: 999, transition: "width .4s" }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: C.lavDk, whiteSpace: "nowrap" as const }}>{spreadAchievedCount} of 4 weeks landed</div>
                </div>
              </>
            )}
          </div>

          {/* Section header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.coral }}>The four weeks</div>
            <div style={{ fontSize: 12, color: C.faint }}>Click a week to edit it.</div>
          </div>

          {/* 4-week grid */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)", gap: 14, alignItems: "stretch" }}>
            {[1, 2, 3, 4].map(wk => <SpreadWeekCard key={wk} wk={wk} />)}
          </div>

          {/* YOUR COHORT THIS MONTH */}
          <div style={{ marginTop: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.coral, marginBottom: 4 }}>Your cohort this month</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>How everyone's moving toward their {monthName} goal.</div>
            <CohortStreakView
              profiles={profiles}
              reflections={reflections}
              currentUserId={user!.id}
              cycleEffectiveWeek={cycleEffectiveWeek}
              isCycleCurrent={isCycleCurrent}
              isCycleFuture={isCycleFuture}
            />
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 02 DASHBOARD (dead code — redirects to commit view)
  // ─────────────────────────────────────────────────────────────
  if (view === "dashboard") {
    const wkStart = weekStart(cycle.month, cycle.year, cycleEffectiveWeek);
    const wkEnd = addDays(wkStart, 6);
    const weekRange = `${format(wkStart, "MMM d")} → ${format(wkEnd, "d")}`;
    const days = ["M", "T", "W", "T", "F", "S", "S"].map((d, i) => ({ label: d, date: addDays(wkStart, i) }));
    const todayIdx = days.findIndex((d) => format(d.date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd"));
    const myCurrentEntry = myEntry(cycleEffectiveWeek);
    const myCurrentReflect = myReflect(cycleEffectiveWeek);
    const reflectUnlocked = isWeekUnlocked(cycleEffectiveWeek);
    const cohortCurrentEntries = entries.filter((e) => e.user_id !== user!.id && e.week_number === cycleEffectiveWeek);
    const showSidebar = !!(allCycles && allCycles.length >= 2);

    return (
      <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${C.bg} 0%, ${C.lavWash} 100%)`, fontFamily: sans }}>
        <MainNav />
        <Container max={showSidebar ? 1120 : 960}>
          <MomentumNav current="dashboard" onCommitment={() => navigate(commitUrl)} onOverview={() => navigate(overviewUrl)} />
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {showSidebar && (
            <CycleSidebar
              cycles={allCycles as Array<{ id: string; month: number; year: number; name: string }>}
              selected={selectedCycleMonth}
              onSelect={(m, y, cycleId) => {
                const status = getMembershipStatus(cycleId);
                setSelectedCycleMonth({ month: m, year: y });
                if (!isAdmin && status === null) {
                  setView("apply");
                } else if (!isAdmin && status === "pending") {
                  setView("apply-pending");
                }
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <Eyebrow>Monday Momentum · {monthName}</Eyebrow>
              <div style={{ marginTop: 8 }}>
                <H1 size={34}>Week {cycleEffectiveWeek} of 4.{" "}
                  <SerifI>{cycleEffectiveWeek === 1 ? "Let's go." : cycleEffectiveWeek === 2 ? "Keep going." : cycleEffectiveWeek === 3 ? "You're moving." : "Final stretch."}</SerifI>
                </H1>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              {streak > 0 && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 14px 7px 10px", borderRadius: 999, background: `linear-gradient(135deg, ${C.coralWash}, ${C.amberWash})`, border: `1px solid ${C.coral}33` }}>
                  <span style={{ fontSize: 16 }}>🔥</span>
                  <span style={{ fontFamily: sans, fontWeight: 700, fontSize: 13.5, color: C.coralDk }}>{streak}</span>
                  <span style={{ fontFamily: sans, fontWeight: 500, fontSize: 12, color: C.muted }}>week streak</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 12, color: C.muted }}>Day {Math.min(todayIdx >= 0 ? todayIdx + 1 + (cycleEffectiveWeek - 1) * 7 : (cycleEffectiveWeek - 1) * 7, 28)} of 28</div>
              </div>
            </div>
          </div>

          {/* Week progress bar */}
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: "14px 18px", marginBottom: 22 }}>
            <WeekBar states={weekStates} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              {[1, 2, 3, 4].map((wk) => {
                const isPast = wk < cycleEffectiveWeek;
                const isCurrent = isCycleCurrent && wk === cycleEffectiveWeek;
                const isFuture = wk > cycleEffectiveWeek;
                const reflectUnlockedForWk = isWeekUnlocked(wk);
                return (
                  <button key={wk} onClick={() => {
                    if (isFuture) return; // future weeks are never accessible
                    if (isPast) { openWeekReview(wk); }
                    else if (isCurrent) { if (!myEntry(wk)) openCommit(wk); else if (!myReflect(wk) && reflectUnlockedForWk) openReflect(wk); else openWeekReview(wk); }
                  }} style={{
                    background: isCurrent ? C.coralWash : "none",
                    border: isCurrent ? `1px solid ${C.coral}55` : "none",
                    borderRadius: 999,
                    cursor: isFuture ? "default" : (isPast || isCurrent) ? "pointer" : "default",
                    padding: isCurrent ? "3px 10px" : "0 4px",
                    fontFamily: sans,
                    fontSize: 11,
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? C.coralDk : isPast ? C.muted : C.faint,
                    textDecoration: isPast ? "underline" : "none",
                    textUnderlineOffset: 3,
                  }}>
                    Wk{wk}{isPast ? " ✓" : isCurrent ? " · now" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 18, alignItems: "flex-start" }}>
            {/* LEFT */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Monthly goal — sits above the weekly commitment */}
              {myGoal ? (
                <Card style={{ background: C.lavWash, borderColor: `${C.lav}55` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.lavDk, textTransform: "uppercase", marginBottom: 6 }}>Your monthly goal</div>
                  <div style={{ fontFamily: serif, fontSize: 17, lineHeight: 1.35, color: C.ink }}>{myGoal.monthly_goal}</div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                    <button onClick={openGoal} style={{ background: "transparent", border: "none", color: C.lavDk, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 4 }}>Edit →</button>
                  </div>
                </Card>
              ) : (
                <Card style={{ background: C.lavWash, borderColor: `${C.lav}55`, textAlign: "center" as const }}>
                  <div style={{ fontSize: 13, color: C.lavDk, fontWeight: 600, marginBottom: 8 }}>No monthly goal set yet</div>
                  <PrimaryBtn onClick={openGoal} style={{ height: 38, fontSize: 13 }}>Set monthly goal</PrimaryBtn>
                </Card>
              )}

              {/* Current week hero card */}
              <Card padded={false as any} style={{ padding: 0, overflow: "hidden", borderColor: `${C.coral}33`, boxShadow: `0 1px 0 rgba(40,30,20,0.02), 0 14px 30px -18px ${C.coral}` }}>
                <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.coral}22`, background: `linear-gradient(135deg, ${C.coralWash} 0%, #fff 70%)`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Chip hue="coral">This week</Chip>
                    <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>{weekRange}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>
                    Reflection unlocks <strong style={{ color: C.ink }}>Sun 6pm</strong>
                  </div>
                </div>
                <div style={{ padding: "24px 24px 20px" }}>
                  {myCurrentEntry ? (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.coralDk, textTransform: "uppercase", marginBottom: 8 }}>Your commitment</div>
                      <div style={{ fontFamily: serif, fontSize: 22, lineHeight: 1.3, fontWeight: 500, color: C.ink, marginBottom: 14 }}>{myCurrentEntry.specific_goal}</div>
                      <EntryMeta entry={myCurrentEntry} />
                      {myCurrentReflect && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.sage, textTransform: "uppercase" as const, marginBottom: 6 }}>
                            Your reflection · {myCurrentReflect.achieved === "yes" ? "✓ Done" : myCurrentReflect.achieved === "partial" ? "◐ Partly" : "— Slipped"}
                          </div>
                          <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.6, padding: "10px 14px", background: C.warm, borderRadius: 12, borderLeft: `3px solid ${myCurrentReflect.achieved === "yes" ? C.sage : myCurrentReflect.achieved === "partial" ? C.amber : C.muted}` }}>
                            {myCurrentReflect.reflection}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
                      <div style={{ fontFamily: serif, fontSize: 20, color: C.muted, marginBottom: 8 }}>No commitment set yet</div>
                      <Sub>What's the one thing you'll move this week?</Sub>
                    </div>
                  )}

                  {/* Day strip */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
                    {days.map((d, i) => {
                      const isToday = i === todayIdx;
                      const isPast = i < (todayIdx >= 0 ? todayIdx : 8);
                      return (
                        <div key={i} style={{ flex: 1, padding: "8px 0", borderRadius: 10, background: isToday ? C.coral : isPast ? C.coralWash : "#fff", border: `1px solid ${isToday ? C.coral : isPast ? `${C.coral}33` : C.border}`, textAlign: "center", fontFamily: sans, fontSize: 11, color: isToday ? "#fff" : isPast ? C.coralDk : C.faint, fontWeight: isToday ? 700 : 500 }}>
                          <div>{d.label}</div>
                          <div style={{ marginTop: 3, fontSize: 13, fontWeight: isToday ? 700 : 600 }}>{format(d.date, "d")}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    {!isCycleEditable ? (
                      <div style={{ flex: 1, height: 46, display: "flex", alignItems: "center", justifyContent: "center", background: C.warm, borderRadius: 999, fontSize: 13, color: C.muted, fontWeight: 500, border: `1px solid ${C.border}` }}>Past cycle — read only</div>
                    ) : !myCurrentEntry ? (
                      <PrimaryBtn style={{ flex: 1 }} onClick={() => openCommit(cycleEffectiveWeek)}>Set commitment →</PrimaryBtn>
                    ) : myCurrentReflect ? (
                      <>
                        <GhostBtn style={{ flex: 1 }} onClick={() => openReflect(cycleEffectiveWeek)}>Edit reflection</GhostBtn>
                        <GhostBtn onClick={() => openCommit(cycleEffectiveWeek)}>Edit commitment</GhostBtn>
                      </>
                    ) : reflectUnlocked ? (
                      <>
                        <PrimaryBtn style={{ flex: 1 }} onClick={() => openReflect(cycleEffectiveWeek)}>Add reflection →</PrimaryBtn>
                        <GhostBtn onClick={() => openCommit(cycleEffectiveWeek)}>Edit commitment</GhostBtn>
                      </>
                    ) : (
                      <>
                        <div style={{ flex: 1, height: 46, display: "flex", alignItems: "center", justifyContent: "center", background: C.coralWash, borderRadius: 999, fontSize: 13, color: C.coralDk, fontWeight: 600 }}>✓ Committed</div>
                        <GhostBtn onClick={() => openCommit(cycleEffectiveWeek)}>Edit</GhostBtn>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              {/* Past weeks quick-nav */}
              {cycleEffectiveWeek > 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase" as const }}>Past weeks</div>
                  {[1, 2, 3, 4].filter(wk => wk < cycleEffectiveWeek || !isCycleCurrent).map(wk => {
                    const e = myEntry(wk); const r = myReflect(wk);
                    const color = r?.achieved === "yes" ? C.sage : r?.achieved === "partial" ? C.amber : r?.achieved === "no" ? C.muted : C.faint;
                    const label = r?.achieved === "yes" ? "✓ Done" : r?.achieved === "partial" ? "◐ Partly" : r?.achieved === "no" ? "— Slipped" : "No reflection";
                    return (
                      <button key={wk} onClick={() => openWeekReview(wk)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, cursor: "pointer", textAlign: "left" as const }}>
                        <span style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: C.coralDk, width: 20 }}>{wk}</span>
                        <span style={{ flex: 1, fontSize: 12.5, color: C.muted, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{e?.specific_goal ?? "No commitment"}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color, flexShrink: 0 }}>{label}</span>
                        <span style={{ fontSize: 11, color: C.faint }}>View →</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT — cohort pulse */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
                <H2 size={18}>Cohort this week</H2>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{cohortCurrentEntries.length} of {cohortOthers.length} committed</span>
              </div>

              {cohortOthers.map((p) => {
                const e = cohortCurrentEntries.find((e) => e.user_id === p.user_id);
                const r = reflections.find((r) => r.user_id === p.user_id && r.week_number === cycleEffectiveWeek);
                const entryReactions = e ? reactions.filter((rx) => rx.entry_id === e.id) : [];
                const reactionCounts = entryReactions.reduce<Record<string, { count: number; mine: boolean }>>((acc, rx) => {
                  if (!acc[rx.emoji]) acc[rx.emoji] = { count: 0, mine: false };
                  acc[rx.emoji].count++;
                  if (rx.user_id === user!.id) acc[rx.emoji].mine = true;
                  return acc;
                }, {});
                const QUICK_EMOJIS = ["🔥", "💪", "👀", "🤝"];
                const outcomeColor = r?.achieved === "yes" ? C.sage : r?.achieved === "partial" ? C.amber : C.muted;
                const outcomeLabel = r?.achieved === "yes" ? "✓ Done" : r?.achieved === "partial" ? "◐ Partly" : r?.achieved === "no" ? "— Slipped" : null;
                return (
                  <div key={p.user_id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, opacity: e ? 1 : 0.6 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: e ? 8 : 0 }}>
                      <MMAvatar name={p.full_name} size={28} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, flex: 1 }}>{p.full_name ?? "Member"}</div>
                      {!e && <span style={{ fontSize: 11, color: C.faint }}>No commit yet</span>}
                      {outcomeLabel && <span style={{ fontSize: 11, fontWeight: 600, color: outcomeColor }}>{outcomeLabel}</span>}
                    </div>
                    {e && (
                      <>
                        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.45, marginBottom: 8 }}>{e.specific_goal}</div>
                        {r?.reflection && (
                          <div style={{ padding: "8px 12px", background: C.warm, borderRadius: 10, marginBottom: 10, fontSize: 12.5, color: C.ink, lineHeight: 1.5, borderLeft: `3px solid ${outcomeColor}` }}>
                            {r.reflection}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const, alignItems: "center" }}>
                          {Object.entries(reactionCounts).map(([emoji, { count, mine }]) => (
                            <button key={emoji} onClick={() => toggleReaction(e.id, emoji)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999, background: mine ? C.coralWash : "#fff", border: `1px solid ${mine ? C.coral + "55" : C.border}`, fontFamily: sans, fontSize: 12, fontWeight: 600, color: mine ? C.coralDk : C.muted, cursor: "pointer" }}>
                              <span style={{ fontSize: 13 }}>{emoji}</span>
                              <span>{count}</span>
                            </button>
                          ))}
                          {QUICK_EMOJIS.filter((em) => !reactionCounts[em]).map((emoji) => (
                            <button key={emoji} onClick={() => toggleReaction(e.id, emoji)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "50%", border: `1px dashed ${C.border}`, background: "none", cursor: "pointer", fontSize: 13, opacity: 0.5 }} title={`React with ${emoji}`}>
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {cohortOthers.length === 0 && (
                <div style={{ padding: "20px 16px", background: C.warm, borderRadius: 14, border: `1px dashed ${C.border}`, fontSize: 13, color: C.muted, textAlign: "center" as const }}>
                  Your cohort members will appear here once they join.
                </div>
              )}

            </div>
          </div>
          </div>{/* end flex-1 main content */}
          </div>{/* end flex row */}
        </Container>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 05 REFLECT FORM
  // ─────────────────────────────────────────────────────────────
  if (view === "reflect") {
    const existingEntry = myEntry(selectedWeek);
    const wkEnd2 = addDays(weekStart(cycle.month, cycle.year, selectedWeek), 6);
    const outcomes: { val: "yes" | "partial" | "no"; label: string; sub: string; hue: string; wash: string }[] = [
      { val: "yes", label: "Yes", sub: "Done", hue: C.sage, wash: C.sageWash },
      { val: "partial", label: "Partly", sub: "Some movement", hue: C.amber, wash: C.amberWash },
      { val: "no", label: "Not yet", sub: "It slipped", hue: C.muted, wash: "#F2EEE6" },
    ];
    return (
      <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${C.bg} 0%, ${C.lavWash} 100%)`, fontFamily: sans }}>
        <MainNav />
        <Container max={760}>
          <MomentumNav current="dashboard" onCommitment={() => navigate(commitUrl)} onOverview={() => navigate(overviewUrl)} />
          <button onClick={() => navigate(dashboardUrl)} style={{ fontSize: 13, color: C.muted, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 18, padding: 0 }}>
            <ArrowLeft size={14} /> Back to dashboard
          </button>
          <Eyebrow>Week {selectedWeek} · Sunday · {format(wkEnd2, "MMM d")}</Eyebrow>
          <div style={{ marginTop: 10, marginBottom: 8 }}><H1 size={40}>How did it <SerifI>actually</SerifI> go?</H1></div>
          <Sub>Honest beats heroic. The point isn't to look good — it's to learn faster.</Sub>

          <Card accent={C.sage} style={{ marginTop: 22, padding: 26 }}>
            {existingEntry && (
              <div style={{ padding: "12px 14px", background: C.warm, borderRadius: 12, marginBottom: 22, fontSize: 13, color: C.muted }}>
                <span style={{ fontWeight: 600, color: C.ink }}>You committed to:</span> {existingEntry.specific_goal}
              </div>
            )}

            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.ink, display: "block", marginBottom: 10 }}>Did you do it?</label>
              <div style={{ display: "flex", gap: 10 }}>
                {outcomes.map((o) => (
                  <div key={o.val} onClick={() => setReflectOutcome(o.val)} style={{ flex: 1, padding: "14px 12px", borderRadius: 14, background: reflectOutcome === o.val ? o.wash : "#fff", border: reflectOutcome === o.val ? `2px solid ${o.hue}` : `1.5px solid ${C.border}`, textAlign: "center", cursor: "pointer", boxShadow: reflectOutcome === o.val ? `0 0 0 4px ${o.hue}1a` : "none" }}>
                    <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, color: reflectOutcome === o.val ? o.hue : C.ink }}>{o.label}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{o.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.ink, display: "block", marginBottom: 8 }}>What happened?</label>
              <textarea
                value={reflectText}
                onChange={(e) => setReflectText(e.target.value)}
                rows={4}
                placeholder="What actually happened?"
                style={{ width: "100%", borderRadius: 14, border: reflectText ? `1.5px solid ${C.amber}` : `1.5px solid ${C.border}`, background: "#fff", padding: "12px 16px", fontSize: 14, color: C.ink, lineHeight: 1.55, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box", boxShadow: reflectText ? `0 0 0 4px ${C.amber}15` : "none" }}
              />
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>What slowed you down?</label>
                <textarea value={blocker} onChange={(e) => setBlocker(e.target.value)} rows={2} placeholder="What slowed you down?" style={{ width: "100%", borderRadius: 12, border: `1.5px solid ${C.border}`, background: "#fff", padding: "10px 14px", fontSize: 14, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>What would you do differently?</label>
                <textarea value={adjustments} onChange={(e) => setAdjustments(e.target.value)} rows={2} placeholder="What would you do differently next week?" style={{ width: "100%", borderRadius: 12, border: `1.5px solid ${C.border}`, background: "#fff", padding: "10px 14px", fontSize: 14, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" }} />
              </div>
            </div>
          </Card>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
            <GhostBtn onClick={() => navigate(dashboardUrl)}>Cancel</GhostBtn>
            <PrimaryBtn style={{ width: 220 }} onClick={saveReflect} disabled={!reflectText.trim() || saving}>{saving ? "Saving…" : "Save reflection →"}</PrimaryBtn>
          </div>
        </Container>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // WEEK REVIEW — past week detail with cohort reports
  // ─────────────────────────────────────────────────────────────
  if (view === "week-review") {
    const wkS = weekStart(cycle.month, cycle.year, selectedWeek);
    const wkE = addDays(wkS, 6);
    const weekRange = `${format(wkS, "MMM d")} → ${format(wkE, "MMM d")}`;
    const myE = myEntry(selectedWeek);
    const myR = myReflect(selectedWeek);
    const outcomeStyle = (achieved: string | null | undefined) =>
      achieved === "yes" ? { color: C.sage, label: "✓ Done" } :
      achieved === "partial" ? { color: C.amber, label: "◐ Partly" } :
      achieved === "no" ? { color: C.muted, label: "— Slipped" } :
      { color: C.faint, label: "No reflection" };

    return (
      <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${C.bg} 0%, ${C.lavWash} 100%)`, fontFamily: sans }}>
        <MainNav />
        <Container max={960}>
          <MomentumNav current="dashboard" onCommitment={() => navigate(commitUrl)} onOverview={() => navigate(overviewUrl)} />
          {/* Header — same structure as dashboard */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <Eyebrow>Monday Momentum · {monthName}</Eyebrow>
              <div style={{ marginTop: 8 }}>
                <H1 size={34}>Week {selectedWeek} of 4.{" "}
                  <SerifI>{selectedWeek === 1 ? "Week one." : selectedWeek === 2 ? "Week two." : selectedWeek === 3 ? "Week three." : "Week four."}</SerifI>
                </H1>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, paddingTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => navigate(dashboardUrl)} style={{ fontSize: 12, color: C.muted, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
                  <ArrowLeft size={13} /> Dashboard
                </button>
                {selectedWeek > 1 && (
                  <button onClick={() => openWeekReview(selectedWeek - 1)} style={{ fontSize: 12, color: C.muted, background: "none", border: "none", cursor: "pointer", padding: 0 }}>← Wk{selectedWeek - 1}</button>
                )}
                {selectedWeek < currentWeek && (
                  <button onClick={() => selectedWeek + 1 < currentWeek ? openWeekReview(selectedWeek + 1) : navigate(dashboardUrl)} style={{ fontSize: 12, color: C.muted, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Wk{selectedWeek + 1} →</button>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar — same as dashboard */}
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: "14px 18px", marginBottom: 22 }}>
            <WeekBar states={weekStates} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              {[1, 2, 3, 4].map((wk) => {
                const isPast = wk < currentWeek;
                const isCurrent = wk === currentWeek;
                const isSelected = wk === selectedWeek;
                return (
                  <button key={wk} onClick={() => {
                    if (wk < currentWeek) openWeekReview(wk);
                    else navigate(dashboardUrl);
                  }} style={{
                    background: isSelected ? C.coralWash : "none",
                    border: isSelected ? `1px solid ${C.coral}55` : "none",
                    borderRadius: 999,
                    cursor: "pointer",
                    padding: isSelected ? "3px 10px" : "0 4px",
                    fontFamily: sans,
                    fontSize: 11,
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? C.coralDk : isPast ? C.muted : C.faint,
                    textDecoration: isPast && !isSelected ? "underline" : "none",
                    textUnderlineOffset: 3,
                  }}>
                    Wk{wk}{isCurrent ? " · now" : isPast ? " ✓" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 18, alignItems: "flex-start" }}>
            {/* LEFT — same structure as dashboard left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Monthly goal card */}
              {myGoal ? (
                <Card style={{ background: C.lavWash, borderColor: `${C.lav}55` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.lavDk, textTransform: "uppercase", marginBottom: 6 }}>Your monthly goal</div>
                  <div style={{ fontFamily: serif, fontSize: 17, lineHeight: 1.35, color: C.ink }}>{myGoal.monthly_goal}</div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                    <button onClick={openGoal} style={{ background: "transparent", border: "none", color: C.lavDk, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 4 }}>Edit →</button>
                  </div>
                </Card>
              ) : (
                <Card style={{ background: C.lavWash, borderColor: `${C.lav}55`, textAlign: "center" as const }}>
                  <div style={{ fontSize: 13, color: C.lavDk, fontWeight: 600, marginBottom: 8 }}>No monthly goal set yet</div>
                  <PrimaryBtn onClick={openGoal} style={{ height: 38, fontSize: 13 }}>Set monthly goal</PrimaryBtn>
                </Card>
              )}

              <Card style={{ padding: 0, overflow: "hidden", borderColor: `${C.coral}33`, boxShadow: `0 1px 0 rgba(40,30,20,0.02), 0 14px 30px -18px ${C.coral}` }}>
                {/* Card header */}
                <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.coral}22`, background: `linear-gradient(135deg, ${C.coralWash} 0%, #fff 70%)`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Chip hue="coral">Week {selectedWeek}</Chip>
                    <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>{weekRange}</span>
                  </div>
                  {myR && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: outcomeStyle(myR.achieved).color }}>
                      {outcomeStyle(myR.achieved).label}
                    </span>
                  )}
                </div>

                {/* Card body */}
                <div style={{ padding: "24px 24px 20px" }}>
                  {/* Commitment section */}
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.coralDk, textTransform: "uppercase" as const, marginBottom: 8 }}>Your commitment</div>
                  {myE ? (
                    <>
                      <div style={{ fontFamily: serif, fontSize: 22, lineHeight: 1.3, fontWeight: 500, color: C.ink, marginBottom: 14 }}>{myE.specific_goal}</div>
                      <EntryMeta entry={myE} />
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: C.faint, fontStyle: "italic", marginBottom: 14 }}>No commitment was set for this week.</div>
                  )}

                  {/* Reflection section */}
                  {myR ? (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.sage, textTransform: "uppercase" as const, marginBottom: 6 }}>
                        Your reflection · {outcomeStyle(myR.achieved).label}
                      </div>
                      <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.6, padding: "10px 14px", background: C.warm, borderRadius: 12, borderLeft: `3px solid ${outcomeStyle(myR.achieved).color}`, marginBottom: myR.blocker || myR.adjustments ? 10 : 0 }}>
                        {myR.reflection}
                      </div>
                      {myR.blocker && <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6 }}><strong>Blocker:</strong> {myR.blocker}</div>}
                      {myR.adjustments && <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}><strong>Next week:</strong> {myR.adjustments}</div>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: C.faint, fontStyle: "italic", marginBottom: 18 }}>No reflection added yet.</div>
                  )}

                  {/* Action buttons — commitment is read-only for past weeks */}
                  <div style={{ display: "flex", gap: 10 }}>
                    {myR ? (
                      <GhostBtn onClick={() => openReflect(selectedWeek)} style={{ flex: 1, height: 38, fontSize: 13 }}>Edit reflection</GhostBtn>
                    ) : (
                      <PrimaryBtn onClick={() => openReflect(selectedWeek)} style={{ flex: 1, height: 38, fontSize: 13 }}>Add reflection →</PrimaryBtn>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* RIGHT — cohort pulse (same as dashboard) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
                <H2 size={18}>Cohort this week</H2>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>
                  {entries.filter(e => e.week_number === selectedWeek && e.user_id !== user!.id).length} of {cohortOthers.length} committed
                </span>
              </div>
              {cohortOthers.map((p) => {
                const e = entries.find((e) => e.user_id === p.user_id && e.week_number === selectedWeek);
                const r = reflections.find((r) => r.user_id === p.user_id && r.week_number === selectedWeek);
                const os = outcomeStyle(r?.achieved);
                const entryReactions = e ? reactions.filter((rx) => rx.entry_id === e.id) : [];
                const reactionCounts = entryReactions.reduce<Record<string, { count: number; mine: boolean }>>((acc, rx) => {
                  if (!acc[rx.emoji]) acc[rx.emoji] = { count: 0, mine: false };
                  acc[rx.emoji].count++;
                  if (rx.user_id === user!.id) acc[rx.emoji].mine = true;
                  return acc;
                }, {});
                const QUICK_EMOJIS = ["🔥", "💪", "👀", "🤝"];
                return (
                  <div key={p.user_id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, opacity: e ? 1 : 0.6 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: e ? 8 : 0 }}>
                      <MMAvatar name={p.full_name} size={28} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, flex: 1 }}>{p.full_name ?? "Member"}</div>
                      {!e && <span style={{ fontSize: 11, color: C.faint }}>No commit yet</span>}
                      {r && <span style={{ fontSize: 11, fontWeight: 600, color: os.color }}>{os.label}</span>}
                    </div>
                    {e && (
                      <>
                        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.45, marginBottom: 8 }}>{e.specific_goal}</div>
                        {r?.reflection && (
                          <div style={{ padding: "8px 12px", background: C.warm, borderRadius: 10, marginBottom: 10, fontSize: 12.5, color: C.ink, lineHeight: 1.5, borderLeft: `3px solid ${os.color}` }}>
                            {r.reflection}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const, alignItems: "center" }}>
                          {Object.entries(reactionCounts).map(([emoji, { count, mine }]) => (
                            <button key={emoji} onClick={() => toggleReaction(e.id, emoji)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999, background: mine ? C.coralWash : "#fff", border: `1px solid ${mine ? C.coral + "55" : C.border}`, fontFamily: sans, fontSize: 12, fontWeight: 600, color: mine ? C.coralDk : C.muted, cursor: "pointer" }}>
                              <span style={{ fontSize: 13 }}>{emoji}</span>
                              <span>{count}</span>
                            </button>
                          ))}
                          {QUICK_EMOJIS.filter((em) => !reactionCounts[em]).map((emoji) => (
                            <button key={emoji} onClick={() => toggleReaction(e.id, emoji)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "50%", border: `1px dashed ${C.border}`, background: "none", cursor: "pointer", fontSize: 13, opacity: 0.5 }} title={`React with ${emoji}`}>
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {cohortOthers.length === 0 && (
                <div style={{ padding: "20px 16px", background: C.warm, borderRadius: 14, border: `1px dashed ${C.border}`, fontSize: 13, color: C.muted, textAlign: "center" as const }}>
                  No other cohort members yet.
                </div>
              )}
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 06 DASHBOARD (end-of-month review)
  // ─────────────────────────────────────────────────────────────
  if (view === "wrap") {
    // useEffect handles the redirect to commitUrl — show spinner while it fires
    return <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}><LoadingSpinner size="lg" /></div>;
    const committed = [1, 2, 3, 4].filter((wk) => myEntry(wk)).length;
    const reflected = [1, 2, 3, 4].filter((wk) => myReflect(wk)).length;
    const achievedCount = [1, 2, 3, 4].filter((wk) => myReflect(wk)?.achieved === "yes").length;
    const achievedPct = Math.round([1, 2, 3, 4].reduce((sum, wk) => {
      const r = myReflect(wk);
      if (r?.achieved === "yes") return sum + 25;
      if (r?.achieved === "partial") return sum + 12.5;
      return sum;
    }, 0));
    const firstName = getProfile(user!.id)?.full_name?.split(" ")[0] ?? "there";
    const allMembers = profiles;

    return (
      <div className="min-h-screen" style={{ background: C.bg, fontFamily: sans }}>
        <MainNav />
        <MomentumNav current="dashboard" onCommitment={() => navigate(commitUrl)} onOverview={() => navigate(overviewUrl)} />

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 32px 96px" }}>
          {/* Centered headline */}
          <div style={{ textAlign: "center", margin: "14px 0 32px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.coral, marginBottom: 0 }}>
              {monthName} cohort · complete
            </div>
            <h1 style={{ fontFamily: serif, fontSize: 46, fontWeight: 500, letterSpacing: -0.02, margin: "12px 0 8px", color: C.ink }}>
              You moved this month, <em style={{ fontStyle: "italic", color: C.coral }}>{firstName}.</em>
            </h1>
            <p style={{ color: C.muted, fontSize: 15, margin: "0 auto", maxWidth: 480 }}>
              {committed} of 4 commitments landed. Your streak peaked at {streak}. Here's what stuck.
            </p>
          </div>

          {/* Goal recap card */}
          {myGoal && (
            <div style={{ background: `linear-gradient(180deg, ${C.lavTint}, ${C.lavWash})`, border: `1px solid ${C.lavWash}`, borderRadius: 18, padding: "22px 28px", marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.lav, marginBottom: 6 }}>Your {monthName} goal</div>
              <div style={{ fontFamily: serif, fontSize: 22, lineHeight: 1.32, color: C.ink }}>{myGoal.monthly_goal}</div>
            </div>
          )}

          {/* Stats + cohort pulse */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, marginBottom: 22 }}>
            {/* Stats 2×2 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {[
                { label: "Committed", value: `${committed}/4`, color: C.coral, meta: committed === 4 ? "Every Monday, on time." : `${committed} of 4 weeks.` },
                { label: "Reflected", value: `${reflected}/4`, color: C.sage, meta: reflected === 4 ? "Full reflection record." : `${reflected} of 4 weeks.` },
                { label: "Achieved", value: `${achievedPct}%`, color: C.amber, meta: achievedCount >= 3 ? "Strong month." : achievedCount >= 2 ? "Two big wins." : "Keep building." },
                { label: "Streak best", value: null, streak: streak, color: C.lav, meta: streak >= 3 ? `Wk1–Wk${streak} unbroken.` : `Best run: ${streak} week${streak !== 1 ? "s" : ""}.` },
              ].map((s) => (
                <div key={s.label} style={{ background: C.card, border: `1px solid ${C.borderSoft}`, borderRadius: 18, padding: "22px 24px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.muted, marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontFamily: serif, fontSize: 36, fontWeight: 500, lineHeight: 1, letterSpacing: -0.02, color: s.color }}>
                    {s.streak !== undefined ? <><span style={{ fontSize: 28, marginRight: 4 }}>🔥</span>{s.streak}</> : s.value}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{s.meta}</div>
                </div>
              ))}
            </div>

            {/* Cohort pulse */}
            <div style={{ background: `linear-gradient(160deg, ${C.coralTint}, ${C.card})`, border: `1px solid ${C.coralWash}`, borderRadius: 18, padding: "22px 24px" }}>
              <h4 style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, margin: "0 0 14px", letterSpacing: -0.005, color: C.ink }}>Your cohort this month</h4>
              {allMembers.length === 0 && (
                <div style={{ fontSize: 13, color: C.faint, fontStyle: "italic" }}>No cohort members yet.</div>
              )}
              {allMembers.map((m, i) => {
                const isMe = m.user_id === user!.id;
                const memberReflections = reflections.filter(r => r.user_id === m.user_id);
                const pct = Math.round(memberReflections.reduce((sum, r) => {
                  if (r.achieved === "yes") return sum + 25;
                  if (r.achieved === "partial") return sum + 12.5;
                  return sum;
                }, 0));
                const [avBg, avFg] = AV_PALETTE[i % 7];
                const initials = (m.full_name || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <div key={m.user_id} style={{ display: "grid", gridTemplateColumns: "24px 1fr 60px", gap: 10, alignItems: "center", padding: "7px 0", fontSize: 13 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: avBg, color: avFg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600 }}>{initials}</div>
                    <div>
                      <div style={{ color: C.ink2, fontWeight: 500 }}>
                        {m.full_name?.split(" ")[0] ?? "Member"}{isMe && <span style={{ color: C.coral, fontWeight: 500 }}> · you</span>}
                      </div>
                      <div style={{ width: "100%", height: 6, borderRadius: 999, background: "rgba(0,0,0,.06)", marginTop: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: isMe ? C.coral : C.lav, borderRadius: 999, transition: "width .3s" }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right" as const, fontWeight: 500, color: C.ink2 }}>{pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Week recap */}
          <div style={{ background: C.card, border: `1px solid ${C.borderSoft}`, borderRadius: 18, padding: "24px 28px" }}>
            <h4 style={{ fontFamily: serif, fontSize: 20, fontWeight: 500, margin: "0 0 14px", letterSpacing: -0.005, color: C.ink }}>Your four weeks</h4>
            {[1, 2, 3, 4].map((wk) => {
              const e = myEntry(wk);
              const r = myReflect(wk);
              const isCurr = isCycleCurrent && wk === cycleEffectiveWeek;
              const pillStyle: React.CSSProperties = r?.achieved === "yes"
                ? { background: C.sageWash, color: C.sage }
                : r?.achieved === "partial" || r?.achieved === "no"
                ? { background: C.amberWash, color: C.amber }
                : isCurr
                ? { background: C.coralWash, color: C.coralDk }
                : { background: "rgba(0,0,0,.05)", color: C.faint };
              const pillLabel = r?.achieved === "yes" ? "✓ Done" : r?.achieved === "no" ? "— Slipped" : r?.achieved === "partial" ? "◐ Partly" : isCurr ? "In progress" : "—";
              return (
                <div key={wk} style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 16, padding: "14px 0", alignItems: "center", borderTop: wk === 1 ? "none" : `1px solid ${C.borderSoft}`, fontSize: 14 }}>
                  <div style={{ fontFamily: serif, fontSize: 22, color: C.coral, fontWeight: 500 }}>{wk}</div>
                  <div style={{ color: C.ink2, lineHeight: 1.45 }}>{e?.specific_goal ?? <em style={{ color: C.faint }}>No commitment set</em>}</div>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap" as const, ...pillStyle }}>{pillLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // OVERVIEW — full-width row cards per member
  // ─────────────────────────────────────────────────────────────
  if (view === "overview") {
    const selectedWk = browseWeek ?? cycleEffectiveWeek;
    const allMembers = profiles;

    const colGrid = "180px 1fr 1fr 130px";

    return (
      <div className="min-h-screen" style={{ background: C.bg, fontFamily: sans, overflowX: "hidden" }}>
        <MainNav />
        <MomentumNav current="overview" onCommitment={() => navigate(commitUrl)} onOverview={() => navigate(overviewUrl)} />

        <div style={{ maxWidth: 1320, margin: "0 auto", padding: isMobile ? "20px 16px 80px" : "28px 32px 96px" }}>
          {/* Header row */}
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 12 : 0, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.coral }}>
                Cohort Overview · {monthName}
              </div>
              {isMobile && (
                <h1 style={{ fontFamily: serif, fontSize: 32, lineHeight: 1.05, letterSpacing: -0.02, fontWeight: 500, margin: "8px 0 0", color: C.ink }}>
                  Monday board, <em style={{ fontStyle: "italic", color: C.coral }}>week {selectedWk}.</em>
                </h1>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, background: C.card, border: `1px solid ${C.border}`, padding: 4, borderRadius: 999 }}>
              {[1, 2, 3, 4].map(n => {
                const isPast = n < cycleEffectiveWeek;
                const isNow = n === cycleEffectiveWeek && isCycleCurrent;
                const isActive = selectedWk === n;
                const isFuture = n > cycleEffectiveWeek && isCycleCurrent;
                return (
                  <button key={n} onClick={() => !isFuture && setBrowseWeek(n)} style={{
                    background: isActive ? C.coral : "transparent",
                    border: "none", padding: "6px 14px", borderRadius: 999,
                    fontSize: 13, fontWeight: 500, fontFamily: sans, cursor: isFuture ? "default" : "pointer",
                    color: isActive ? "#fff" : isPast ? C.sage : isNow ? C.muted : C.faint,
                  }}>
                    Wk{n}{isPast ? " ✓" : isNow ? " · now" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column headers — desktop only */}
          {!isMobile && (
            <div style={{ display: "grid", gridTemplateColumns: colGrid, gap: 24, padding: "0 24px", marginBottom: 10 }}>
              {["Member", "This week's commitment", "Reflection", "Status"].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: C.muted }}>{h}</div>
              ))}
            </div>
          )}

          {/* Member rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {allMembers.length === 0 && (
              <div style={{ padding: 40, textAlign: "center" as const, color: C.faint, fontSize: 14 }}>
                No cohort members yet.
              </div>
            )}
            {allMembers.map((member, i) => {
              const isMe = member.user_id === user!.id;
              const entry = entries.find(e => e.user_id === member.user_id && e.week_number === selectedWk);
              const prevReflect = reflections.find(r => r.user_id === member.user_id && r.week_number === selectedWk) ?? null;
              const [avBg, avFg] = AV_PALETTE[i % 7];
              const initials = (member.full_name || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

              const hasCommitment = !!entry?.specific_goal;
              const statusLabel = hasCommitment ? "Committed" : "Not set";
              const statusStyle: React.CSSProperties = hasCommitment
                ? { background: C.coralWash, color: C.coralDk }
                : { background: "rgba(0,0,0,.05)", color: C.faint };

              const prevOutcomeLabel = prevReflect?.achieved === "yes"
                ? { text: "✓ Done", color: C.sage }
                : prevReflect?.achieved === "partial"
                ? { text: "◐ Partly done", color: C.amber }
                : prevReflect?.achieved === "no"
                ? { text: "— Slipped", color: C.amber }
                : null;

              return (
                <div key={member.user_id} style={{
                  background: C.card,
                  border: `1px solid ${C.borderSoft}`,
                  borderLeft: isMe ? `4px solid ${C.coral}` : `4px solid ${C.borderSoft}`,
                  borderRadius: 16,
                  padding: isMobile ? "16px 18px" : "20px 24px",
                  ...(isMobile ? { display: "flex", flexDirection: "column" as const, gap: 14 } : { display: "grid", gridTemplateColumns: colGrid, gap: 24, alignItems: "start" }),
                }}>
                  {isMobile ? (
                    <>
                      {/* Mobile: top row — avatar + name + badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: avBg, color: avFg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, flexShrink: 0 }}>{initials}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: C.ink, lineHeight: 1.3 }}>{member.full_name ?? "Member"}</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>Week {selectedWk}</div>
                        </div>
                        {isMe && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "3px 10px", borderRadius: 999, background: C.coralWash, color: C.coralDk, flexShrink: 0 }}>You</span>}
                      </div>
                      {/* Mobile: commitment */}
                      {hasCommitment ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ fontFamily: serif, fontSize: 16, lineHeight: 1.4, color: C.ink }}>{entry!.specific_goal}</div>
                          {(entry!.measurable || entry!.achievable) && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>
                              {entry!.measurable && <div style={{ fontSize: 12.5, color: C.muted }}>🎯 {entry!.measurable}</div>}
                              {entry!.achievable && <div style={{ fontSize: 12.5, color: C.muted }}>⚡ {entry!.achievable}</div>}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: 14, color: C.faint, fontStyle: "italic" }}>No commitment set yet</div>
                      )}
                      {/* Mobile: reflection */}
                      {prevReflect && (
                        <div style={{ padding: "10px 12px", background: C.warm, borderRadius: 10, borderLeft: `3px solid ${prevOutcomeLabel?.color ?? C.muted}` }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: prevOutcomeLabel?.color ?? C.muted, marginBottom: 4 }}>{prevOutcomeLabel?.text ?? "Reflected"}</div>
                          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>"{prevReflect.reflection}"</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Desktop: 4-col grid */}
                      {/* Member */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 2 }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: avBg, color: avFg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600 }}>{initials}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: C.ink, lineHeight: 1.3 }}>{member.full_name ?? "Member"}</div>
                          {isMe && <span style={{ display: "inline-block", marginTop: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "2px 8px", borderRadius: 999, background: C.coralWash, color: C.coralDk }}>You</span>}
                        </div>
                      </div>
                      {/* Commitment */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {hasCommitment ? (
                          <>
                            <div style={{ fontFamily: serif, fontSize: 17, lineHeight: 1.4, color: C.ink }}>{entry!.specific_goal}</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                              {entry!.measurable && <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}><span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: C.faint, whiteSpace: "nowrap" as const }}>🎯 Success</span><span style={{ fontSize: 13, color: C.muted, lineHeight: 1.4 }}>{entry!.measurable}</span></div>}
                              {entry!.relevance && <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}><span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: C.faint, whiteSpace: "nowrap" as const }}>💡 Why</span><span style={{ fontSize: 13, color: C.muted, lineHeight: 1.4 }}>{entry!.relevance}</span></div>}
                              {entry!.achievable && <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}><span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: C.faint, whiteSpace: "nowrap" as const }}>⚡ Blockers</span><span style={{ fontSize: 13, color: C.muted, lineHeight: 1.4 }}>{entry!.achievable}</span></div>}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: 14, color: C.faint, fontStyle: "italic" }}>No commitment set yet</div>
                        )}
                      </div>
                      {/* Reflection */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {prevReflect ? (
                          <>
                            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: prevOutcomeLabel?.color ?? C.muted }}>{prevOutcomeLabel?.text ?? "Reflected"}</div>
                            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55 }}>"{prevReflect.reflection}"</div>
                          </>
                        ) : (
                          <div style={{ fontSize: 13, color: C.faint, fontStyle: "italic" }}>No reflection yet</div>
                        )}
                      </div>
                      {/* Status */}
                      <div style={{ paddingTop: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 999, whiteSpace: "nowrap" as const, ...statusStyle }}>{statusLabel}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Safety net — should never reach here in normal operation, but prevents
  // a blank page if view somehow ends up in an unhandled state.
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
      <LoadingSpinner size="lg" />
    </div>
  );
}
