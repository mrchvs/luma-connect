import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  bg: "#FAF6F0",
  card: "#FEFCF8",
  ink: "#2A241F",
  muted: "#6B6259",
  faint: "#9A9087",
  border: "#E8E1D2",
  coral: "#FF5C2A",
  coralDk: "#E94A1C",
  coralWash: "#FFEDE5",
  lav: "#C8A8F0",
  lavDk: "#7C58B5",
  lavWash: "#F1E9FB",
  sage: "#7AAE92",
  sageWash: "#E6F1EA",
  amber: "#D88B2E",
  amberWash: "#FBEFD8",
  warm: "#FBF7F1",
} as const;

const serif = '"Cormorant Garamond", "TheSeasonsLT", Georgia, serif';
const sans = "Inter, system-ui, sans-serif";

// ── Shared atoms ──────────────────────────────────────────────────
function MomentumNav({ current, onCommitment, onDashboard }: { current: "commitment" | "dashboard"; onCommitment: () => void; onDashboard: () => void }) {
  const tabs = [
    { key: "commitment", label: "My commitment", action: onCommitment },
    { key: "dashboard",  label: "Dashboard",      action: onDashboard },
  ] as const;
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
    <div style={{ display: "flex", gap: 4, padding: "4px", background: "#fff", borderRadius: 14, border: `1px solid ${C.border}` }}>
      {tabs.map(t => (
        <button key={t.key} onClick={t.action} style={{
          padding: "7px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: sans, fontSize: 13, fontWeight: 600,
          background: current === t.key ? C.coralWash : "transparent",
          color: current === t.key ? C.coralDk : C.muted,
          transition: "all 0.15s",
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
function MMAvatar({ name, size = 36 }: { name: string | null; size?: number }) {
  const initials = (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const hues = [[C.coralWash, C.coralDk], [C.lavWash, C.lavDk], [C.sageWash, C.sage], [C.amberWash, C.amber]];
  const [bg, fg] = hues[Math.abs((name || "").charCodeAt(0) || 0) % hues.length];
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

// ── Main component ────────────────────────────────────────────────
type View = "dashboard" | "commit" | "reflect" | "wrap" | "week-review";

export default function Accountability() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const viewFromPath = (p: string): View => {
    if (p === "/accountability/dashboard" || p === "/accountability/recap") return "wrap";
    return "commit";
  };
  const [view, setView] = useState<View>(() => viewFromPath(pathname));

  // Keep view in sync with URL (back/forward, direct links)
  useEffect(() => {
    const v = viewFromPath(pathname);
    if (v === "wrap") setView("wrap");
    else if (v === "commit" && !["reflect", "wrap", "week-review"].includes(view)) setView("commit");
  }, [pathname]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [browseWeek, setBrowseWeek] = useState<number | null>(null); // null = current week
  const [editingCommit, setEditingCommit] = useState(false);
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

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentWeek = getWeekOfMonth(now);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

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

  // Main data query
  const { data, isLoading } = useQuery({
    queryKey: ["accountability", currentMonth, currentYear, user?.id],
    queryFn: async () => {
      if (!user) return null;
      let { data: cycle } = await supabase.from("accountability_cycles").select("id, name, month, year").eq("month", currentMonth).eq("year", currentYear).maybeSingle();
      if (!cycle) {
        const { data: newCycle, error } = await supabase.from("accountability_cycles").insert({ name: format(now, "MMMM yyyy"), month: currentMonth, year: currentYear, created_by: user.id }).select("id, name, month, year").single();
        if (error && !error.message.includes("unique")) throw error;
        if (newCycle) cycle = newCycle;
        else { const { data: r } = await supabase.from("accountability_cycles").select("id, name, month, year").eq("month", currentMonth).eq("year", currentYear).maybeSingle(); cycle = r; }
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
      const allUserIds = Array.from(new Set([...(goals ?? []).map((g) => g.user_id), ...(entries ?? []).map((e) => e.user_id), user.id]));
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", allUserIds);
      return { cycle, goals: goals ?? [], entries: entries ?? [], reflections: reflections ?? [], reactions: reactions ?? [], profiles: profiles ?? [] };
    },
    enabled: !!user && (!!membership || isAdmin),
  });

  // Pre-populate form fields when data loads
  useEffect(() => {
    if (!data) return;
    const goal = data.goals.find((g) => g.user_id === user?.id) ?? null;
    const entry = data.entries.find((e) => e.user_id === user?.id && e.week_number === currentWeek) ?? null;
    setGoalText(goal?.monthly_goal ?? "");
    setCommitText(entry?.specific_goal ?? "");
    setRelevance(entry?.relevance ?? "");
    setMeasurable(entry?.measurable ?? "");
    setAchievable(entry?.achievable ?? "");
  }, [data]);

  if (authLoading || isLoading || membershipLoading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}><LoadingSpinner size="lg" text="Loading…" /></div>;
  }

  // Not in cohort gate
  if (!membership) {
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

  // Week progress states
  const weekStates = [1, 2, 3, 4].map((wk): "done" | "current" | "partial" | "future" => {
    if (wk > currentWeek) return "future";
    if (wk < currentWeek) {
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
      navigate("/accountability/dashboard");
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
    navigate("/accountability");
  };

  // ── Open week review ──────────────────────────────────────────
  const openWeekReview = (wk: number) => {
    setSelectedWeek(wk);
    setView("week-review");
  };

  // ─────────────────────────────────────────────────────────────
  // 01 MY COMMITMENT (combined monthly goal + weekly commitment)
  // ─────────────────────────────────────────────────────────────
  if (view === "commit") {
    const taglines = ["Let's go.", "Keep going.", "You're moving.", "Final stretch."];
    const displayWeek = browseWeek ?? currentWeek;
    const tagline = taglines[displayWeek - 1] ?? "Let's go.";
    const bothSaved = !!(myGoal?.monthly_goal && myEntry(currentWeek)?.specific_goal);
    return (
      <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${C.bg} 0%, ${C.lavWash} 100%)`, fontFamily: sans }}>
        <MainNav />
        <Container max={720}>
          <MomentumNav current="commitment" onCommitment={() => setBrowseWeek(null)} onDashboard={() => navigate("/accountability/dashboard")} />

          <div style={{ marginBottom: 20 }}>
            <Eyebrow>Monday Momentum · {monthName}</Eyebrow>
            <div style={{ marginTop: 8 }}><H1 size={40}>Week {displayWeek} of 4. <SerifI>{tagline}</SerifI></H1></div>
          </div>

          {/* Week progress bar */}
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: "14px 18px", marginBottom: 24 }}>
            <WeekBar states={weekStates} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              {[1, 2, 3, 4].map((wk) => {
                const isCurrent = wk === currentWeek;
                const isPast = wk < currentWeek;
                const isSelected = browseWeek === wk;
                return (
                  <button key={wk} onClick={() => isPast ? setBrowseWeek(isSelected ? null : wk) : undefined}
                    style={{ fontFamily: sans, fontSize: 11, fontWeight: (isCurrent && !browseWeek) || isSelected ? 700 : 500,
                      color: isSelected ? C.coralDk : isCurrent && !browseWeek ? C.coralDk : isPast ? C.muted : C.faint,
                      background: isSelected ? C.coralWash : "none", border: isSelected ? `1px solid ${C.coral}55` : "none",
                      borderRadius: 999, padding: isSelected ? "2px 10px" : "2px 4px",
                      cursor: isPast ? "pointer" : "default", textDecoration: isPast && !isSelected ? "underline" : "none", textUnderlineOffset: 3,
                    }}>
                    Wk{wk}{isPast ? " ✓" : isCurrent ? " · now" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Past week inline summary */}
          {browseWeek !== null && (() => {
            const pw = browseWeek;
            const pe = myEntry(pw);
            const pr = myReflect(pw);
            const outcomeColor = pr?.achieved === "yes" ? C.sage : pr?.achieved === "partial" ? C.amber : C.muted;
            const outcomeLabel = pr?.achieved === "yes" ? "✓ Done" : pr?.achieved === "partial" ? "◐ Partly" : pr?.achieved === "no" ? "— Slipped" : null;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                {/* Goal card — same as current week */}
                <Card style={{ background: C.lavWash, borderColor: `${C.lav}55` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.lavDk, textTransform: "uppercase" as const, marginBottom: 6 }}>YOUR GOAL FOR {monthName.toUpperCase()}</div>
                  <div style={{ fontFamily: serif, fontSize: 18, lineHeight: 1.35, color: C.ink }}>{myGoal?.monthly_goal ?? <span style={{ color: C.faint, fontStyle: "italic" }}>No goal set</span>}</div>
                </Card>

                {/* Commitment card */}
                <Card accent={C.coral} style={{ padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.coralDk, textTransform: "uppercase" as const }}>WEEK {pw} COMMITMENT</div>
                    {outcomeLabel && <span style={{ fontSize: 12, fontWeight: 600, color: outcomeColor }}>{outcomeLabel}</span>}
                  </div>
                  {pe ? (
                    <>
                      <div style={{ fontFamily: serif, fontSize: 18, lineHeight: 1.4, color: C.ink }}>{pe.specific_goal}</div>
                      {(pe.measurable || pe.relevance || pe.achievable || pr) && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 12 }}>
                          {pe.measurable && <div style={{ fontSize: 13, color: C.muted }}><strong style={{ color: C.ink }}>🎯 Success criteria:</strong> {pe.measurable}</div>}
                          {pe.relevance  && <div style={{ fontSize: 13, color: C.muted }}><strong style={{ color: C.ink }}>💡 Why it matters:</strong> {pe.relevance}</div>}
                          {pe.achievable && <div style={{ fontSize: 13, color: C.muted }}><strong style={{ color: C.ink }}>⚡ Potential blockers:</strong> {pe.achievable}</div>}
                          {pr && <>
                            <div style={{ fontSize: 13, color: C.muted }}><strong style={{ color: C.ink }}>✏️ Your reflection:</strong> {pr.reflection}</div>
                            {pr.blocker    && <div style={{ fontSize: 13, color: C.muted }}><strong style={{ color: C.ink }}>🐢 What slowed you down:</strong> {pr.blocker}</div>}
                            {pr.adjustments && <div style={{ fontSize: 13, color: C.muted }}><strong style={{ color: C.ink }}>🔄 Next time:</strong> {pr.adjustments}</div>}
                          </>}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: C.faint, fontStyle: "italic" }}>No commitment was set for this week.</div>
                  )}
                  {!pr && pe && (
                    <div style={{ marginTop: 14 }}>
                      <GhostBtn onClick={() => { setSelectedWeek(pw); setReflectOutcome(""); setReflectText(""); setBlocker(""); setAdjustments(""); setView("reflect"); }} style={{ height: 36, fontSize: 13 }}>Add reflection →</GhostBtn>
                    </div>
                  )}
                </Card>

                <div style={{ textAlign: "center" as const }}>
                  <button onClick={() => setBrowseWeek(null)} style={{ fontSize: 13, color: C.muted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>Back to current week</button>
                </div>
              </div>
            );
          })()}

          {browseWeek === null && (bothSaved && !editingCommit ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Saved state — read view */}
              <Card style={{ background: C.lavWash, borderColor: `${C.lav}55` }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.lavDk, textTransform: "uppercase" as const, marginBottom: 6 }}>YOUR GOAL FOR {monthName.toUpperCase()}</div>
                <div style={{ fontFamily: serif, fontSize: 18, lineHeight: 1.35, color: C.ink }}>{goalText}</div>
              </Card>
              <Card accent={C.coral}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.coralDk, textTransform: "uppercase" as const, marginBottom: 8 }}>WEEK {currentWeek} COMMITMENT</div>
                <div style={{ fontFamily: serif, fontSize: 18, lineHeight: 1.35, color: C.ink, marginBottom: measurable || relevance || achievable ? 14 : 0 }}>{commitText}</div>
                {(measurable || relevance || achievable) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    {measurable && (
                      <div style={{ fontSize: 13, color: C.muted }}><strong style={{ color: C.ink }}>🎯 Success criteria:</strong> {measurable}</div>
                    )}
                    {relevance && (
                      <div style={{ fontSize: 13, color: C.muted }}><strong style={{ color: C.ink }}>💡 Why it matters:</strong> {relevance}</div>
                    )}
                    {achievable && (
                      <div style={{ fontSize: 13, color: C.muted }}><strong style={{ color: C.ink }}>⚡ Potential blockers:</strong> {achievable}</div>
                    )}
                  </div>
                )}
              </Card>
              <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginTop: 4 }}>
                <div style={{ fontSize: 14, color: C.sage, fontWeight: 600 }}>✓ Saved</div>
                <GhostBtn onClick={() => setEditingCommit(true)} style={{ height: 38, fontSize: 13 }}>Edit</GhostBtn>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Card 1 — Monthly goal */}
              <Card style={{ background: C.lavWash, borderColor: `${C.lav}55`, padding: 24 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.lavDk, textTransform: "uppercase" as const, display: "block", marginBottom: 10 }}>YOUR GOAL FOR {monthName.toUpperCase()}</label>
                <textarea
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  maxLength={240}
                  placeholder="Be specific. 'Get healthy' → 'Run 3× a week and track it.'"
                  rows={4}
                  style={{ width: "100%", borderRadius: 14, border: goalText ? `2px solid ${C.lav}` : `1.5px solid ${C.border}`, background: "#fff", padding: "14px 16px", fontSize: 15, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box", boxShadow: goalText ? `0 0 0 4px ${C.lav}30` : "none" }}
                />
                <div style={{ fontSize: 12, color: C.faint, marginTop: 6, textAlign: "right" as const }}>{goalText.length} / 240</div>
              </Card>

              {/* Card 2 — This week */}
              <Card accent={C.coral} style={{ padding: 24 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.coralDk, textTransform: "uppercase" as const, display: "block", marginBottom: 10 }}>WEEK {currentWeek} COMMITMENT</label>
                <textarea
                  value={commitText}
                  onChange={(e) => setCommitText(e.target.value)}
                  maxLength={200}
                  placeholder="Send offer page draft to designer + lock copy by Thursday EOD."
                  rows={3}
                  style={{ width: "100%", borderRadius: 14, border: commitText ? `2px solid ${C.coral}` : `1.5px solid ${C.border}`, background: "#fff", padding: "14px 16px", fontSize: 15, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box", boxShadow: commitText ? `0 0 0 4px ${C.coral}1a` : "none" }}
                />
                <div style={{ fontSize: 12, color: C.faint, marginTop: 6, textAlign: "right" as const, marginBottom: 16 }}>{commitText.length} / 200</div>

                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>🎯 How will you know you've done it? <span style={{ color: C.faint, fontWeight: 400 }}>(success criteria)</span></label>
                    <textarea value={measurable} onChange={(e) => setMeasurable(e.target.value)} rows={2} placeholder="Specific, observable outcome…" style={{ width: "100%", borderRadius: 12, border: `1.5px solid ${C.border}`, background: "#fff", padding: "10px 14px", fontSize: 14, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>💡 Why does this matter? <span style={{ color: C.faint, fontWeight: 400 }}>(relevance)</span></label>
                    <textarea value={relevance} onChange={(e) => setRelevance(e.target.value)} rows={2} placeholder="How does this move your monthly goal forward?" style={{ width: "100%", borderRadius: 12, border: `1.5px solid ${C.border}`, background: "#fff", padding: "10px 14px", fontSize: 14, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>⚡ Potential blockers? <span style={{ color: C.faint, fontWeight: 400 }}>(achievable)</span></label>
                    <textarea value={achievable} onChange={(e) => setAchievable(e.target.value)} rows={2} placeholder="What could get in the way, and how will you handle it?" style={{ width: "100%", borderRadius: 12, border: `1.5px solid ${C.border}`, background: "#fff", padding: "10px 14px", fontSize: 14, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" }} />
                  </div>
                </div>
              </Card>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                <PrimaryBtn style={{ width: 180 }} onClick={async () => {
                  setSaving(true);
                  try {
                    if (goalText.trim()) {
                      if (myGoal) {
                        await supabase.from("accountability_monthly_goals").update({ monthly_goal: goalText.trim(), success_metric: successMetric.trim() || null }).eq("id", myGoal.id);
                      } else {
                        await supabase.from("accountability_monthly_goals").insert({ cycle_id: cycle.id, user_id: user!.id, monthly_goal: goalText.trim(), success_metric: successMetric.trim() || null });
                      }
                    }
                    if (commitText.trim()) {
                      const existing = myEntry(currentWeek);
                      if (existing) {
                        await supabase.from("accountability_weekly_entries").update({ specific_goal: commitText.trim(), relevance: relevance.trim() || null, measurable: measurable.trim() || null, achievable: achievable.trim() || null }).eq("id", existing.id);
                      } else {
                        await supabase.from("accountability_weekly_entries").insert({ cycle_id: cycle.id, user_id: user!.id, week_number: currentWeek, specific_goal: commitText.trim(), relevance: relevance.trim() || null, measurable: measurable.trim() || null, achievable: achievable.trim() || null });
                      }
                    }
                    await queryClient.invalidateQueries({ queryKey: ["accountability"] });
                    toast.success("Saved!");
                    setEditingCommit(false);
                  } catch { toast.error("Failed to save"); }
                  finally { setSaving(false); }
                }} disabled={(!goalText.trim() && !commitText.trim()) || saving}>{saving ? "Saving…" : "Save →"}</PrimaryBtn>
              </div>
            </div>
          ))}

          {/* Past weeks list — shown when not browsing a past week */}
          {browseWeek === null && currentWeek > 1 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase" as const, color: C.ink, marginBottom: 12 }}>Past weeks</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1, 2, 3, 4].filter(wk => wk < currentWeek).map(wk => {
                  const e = myEntry(wk);
                  const r = myReflect(wk);
                  const outcomeColor = r?.achieved === "yes" ? C.sage : r?.achieved === "partial" ? C.amber : r?.achieved === "no" ? C.muted : C.faint;
                  const outcomeLabel = r?.achieved === "yes" ? "✓ Done" : r?.achieved === "partial" ? "◐ Partly" : r?.achieved === "no" ? "— Slipped" : "No reflection";
                  return (
                    <button key={wk} onClick={() => setBrowseWeek(wk)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, cursor: "pointer", textAlign: "left" as const, width: "100%" }}>
                      <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, color: C.coralDk, width: 20, flexShrink: 0 }}>{wk}</span>
                      <span style={{ flex: 1, fontSize: 14, color: e ? C.ink : C.faint, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, fontStyle: e ? "normal" : "italic" }}>
                        {e?.specific_goal ?? "No commitment set"}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: outcomeColor, flexShrink: 0 }}>{outcomeLabel}</span>
                      <span style={{ fontSize: 12, color: C.faint, flexShrink: 0 }}>View →</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Container>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 02 DASHBOARD
  // ─────────────────────────────────────────────────────────────
  if (view === "dashboard") {
    const wkStart = weekStart(cycle.month, cycle.year, currentWeek);
    const wkEnd = addDays(wkStart, 6);
    const weekRange = `${format(wkStart, "MMM d")} → ${format(wkEnd, "d")}`;
    const days = ["M", "T", "W", "T", "F", "S", "S"].map((d, i) => ({ label: d, date: addDays(wkStart, i) }));
    const todayIdx = days.findIndex((d) => format(d.date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd"));
    const myCurrentEntry = myEntry(currentWeek);
    const myCurrentReflect = myReflect(currentWeek);
    const reflectUnlocked = isWeekUnlocked(currentWeek);
    const cohortCurrentEntries = entries.filter((e) => e.user_id !== user!.id && e.week_number === currentWeek);

    return (
      <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${C.bg} 0%, ${C.lavWash} 100%)`, fontFamily: sans }}>
        <MainNav />
        <Container max={960}>
          <MomentumNav current="dashboard" onCommitment={() => navigate("/accountability")} onDashboard={() => navigate("/accountability/dashboard")} />
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <Eyebrow>Monday Momentum · {monthName}</Eyebrow>
              <div style={{ marginTop: 8 }}>
                <H1 size={34}>Week {currentWeek} of 4.{" "}
                  <SerifI>{currentWeek === 1 ? "Let's go." : currentWeek === 2 ? "Keep going." : currentWeek === 3 ? "You're moving." : "Final stretch."}</SerifI>
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
                <div style={{ fontSize: 12, color: C.muted }}>Day {Math.min(todayIdx >= 0 ? todayIdx + 1 + (currentWeek - 1) * 7 : (currentWeek - 1) * 7, 28)} of 28</div>
              </div>
            </div>
          </div>

          {/* Week progress bar */}
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: "14px 18px", marginBottom: 22 }}>
            <WeekBar states={weekStates} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              {[1, 2, 3, 4].map((wk) => {
                const isPast = wk < currentWeek;
                const isCurrent = wk === currentWeek;
                const isFuture = wk > currentWeek;
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.lavDk, textTransform: "uppercase", marginBottom: 6 }}>Your monthly goal</div>
                      <div style={{ fontFamily: serif, fontSize: 17, lineHeight: 1.35, color: C.ink }}>{myGoal.monthly_goal}</div>
                    </div>
                    <button onClick={openGoal} style={{ background: "transparent", border: "none", color: C.lavDk, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 4, whiteSpace: "nowrap" }}>Edit →</button>
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
                    {!myCurrentEntry ? (
                      <PrimaryBtn style={{ flex: 1 }} onClick={() => openCommit(currentWeek)}>Set commitment →</PrimaryBtn>
                    ) : myCurrentReflect ? (
                      <>
                        <GhostBtn style={{ flex: 1 }} onClick={() => openReflect(currentWeek)}>Edit reflection</GhostBtn>
                        <GhostBtn onClick={() => openCommit(currentWeek)}>Edit commitment</GhostBtn>
                      </>
                    ) : reflectUnlocked ? (
                      <>
                        <PrimaryBtn style={{ flex: 1 }} onClick={() => openReflect(currentWeek)}>Add reflection →</PrimaryBtn>
                        <GhostBtn onClick={() => openCommit(currentWeek)}>Edit commitment</GhostBtn>
                      </>
                    ) : (
                      <>
                        <div style={{ flex: 1, height: 46, display: "flex", alignItems: "center", justifyContent: "center", background: C.coralWash, borderRadius: 999, fontSize: 13, color: C.coralDk, fontWeight: 600 }}>✓ Committed</div>
                        <GhostBtn onClick={() => openCommit(currentWeek)}>Edit</GhostBtn>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              {/* Past weeks quick-nav */}
              {currentWeek > 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase" as const }}>Past weeks</div>
                  {[1, 2, 3, 4].filter(wk => wk < currentWeek).map(wk => {
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
                const r = reflections.find((r) => r.user_id === p.user_id && r.week_number === currentWeek);
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
          <MomentumNav current="dashboard" onCommitment={() => navigate("/accountability")} onDashboard={() => navigate("/accountability/dashboard")} />
          <button onClick={() => navigate("/accountability/dashboard")} style={{ fontSize: 13, color: C.muted, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 18, padding: 0 }}>
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
                placeholder="Got the draft to my designer Tuesday but copy isn't locked — I keep tweaking the headline…"
                style={{ width: "100%", borderRadius: 14, border: reflectText ? `1.5px solid ${C.amber}` : `1.5px solid ${C.border}`, background: "#fff", padding: "12px 16px", fontSize: 14, color: C.ink, lineHeight: 1.55, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box", boxShadow: reflectText ? `0 0 0 4px ${C.amber}15` : "none" }}
              />
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>What slowed you down?</label>
                <textarea value={blocker} onChange={(e) => setBlocker(e.target.value)} rows={2} placeholder="Blocker…" style={{ width: "100%", borderRadius: 12, border: `1.5px solid ${C.border}`, background: "#fff", padding: "10px 14px", fontSize: 14, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>What would you do differently?</label>
                <textarea value={adjustments} onChange={(e) => setAdjustments(e.target.value)} rows={2} placeholder="Adjustments for next week…" style={{ width: "100%", borderRadius: 12, border: `1.5px solid ${C.border}`, background: "#fff", padding: "10px 14px", fontSize: 14, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" }} />
              </div>
            </div>
          </Card>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
            <GhostBtn onClick={() => navigate("/accountability/dashboard")}>Cancel</GhostBtn>
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
          <MomentumNav current="dashboard" onCommitment={() => navigate("/accountability")} onDashboard={() => navigate("/accountability/dashboard")} />
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
                <button onClick={() => navigate("/accountability/dashboard")} style={{ fontSize: 12, color: C.muted, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
                  <ArrowLeft size={13} /> Dashboard
                </button>
                {selectedWeek > 1 && (
                  <button onClick={() => openWeekReview(selectedWeek - 1)} style={{ fontSize: 12, color: C.muted, background: "none", border: "none", cursor: "pointer", padding: 0 }}>← Wk{selectedWeek - 1}</button>
                )}
                {selectedWeek < currentWeek && (
                  <button onClick={() => selectedWeek + 1 < currentWeek ? openWeekReview(selectedWeek + 1) : navigate("/accountability/dashboard")} style={{ fontSize: 12, color: C.muted, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Wk{selectedWeek + 1} →</button>
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
                    else navigate("/accountability/dashboard");
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.lavDk, textTransform: "uppercase", marginBottom: 6 }}>Your monthly goal</div>
                      <div style={{ fontFamily: serif, fontSize: 17, lineHeight: 1.35, color: C.ink }}>{myGoal.monthly_goal}</div>
                    </div>
                    <button onClick={openGoal} style={{ background: "transparent", border: "none", color: C.lavDk, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 4, whiteSpace: "nowrap" }}>Edit →</button>
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
  // 06 WRAP / END OF COHORT
  // ─────────────────────────────────────────────────────────────
  if (view === "wrap") {
    const committed = [1, 2, 3, 4].filter((wk) => myEntry(wk)).length;
    const reflected = [1, 2, 3, 4].filter((wk) => myReflect(wk)).length;
    const achieved = [1, 2, 3, 4].filter((wk) => myReflect(wk)?.achieved === "yes").length;
    return (
      <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${C.bg} 0%, ${C.lavWash} 100%)`, fontFamily: sans }}>
        <MainNav />
        <Container max={960}>
          <MomentumNav current="dashboard" onCommitment={() => navigate("/accountability")} onDashboard={() => navigate("/accountability/dashboard")} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 28 }}>
            <Eyebrow>{monthName} cohort · complete</Eyebrow>
            <div style={{ marginTop: 12 }}><H1 size={52}>Four weeks <SerifI>down.</SerifI></H1></div>
            <div style={{ marginTop: 12, maxWidth: 480 }}><Sub size={16}>You committed {committed}/4 weeks and reflected {reflected}/4. Here's what you moved.</Sub></div>
          </div>

          {/* Monthly goal recap */}
          {myGoal && (
            <Card style={{ background: C.lavWash, borderColor: `${C.lav}55`, marginBottom: 18 }}>
              <Eyebrow color={C.lavDk}>Your {monthName} goal</Eyebrow>
              <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 500, marginTop: 6, lineHeight: 1.3 }}>{myGoal.monthly_goal}</div>
            </Card>
          )}

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { n: `${committed}/4`, l: "Committed", color: C.coral },
              { n: `${reflected}/4`, l: "Reflected", color: C.sage },
              { n: `${reflected > 0 ? Math.round((achieved / reflected) * 100) : 0}%`, l: "Achieved", color: C.amber },
              { n: `🔥 ${streak}`, l: "Streak best", color: C.lavDk },
            ].map((s) => (
              <Card key={s.l} style={{ textAlign: "center" as const }}>
                <div style={{ fontFamily: serif, fontSize: 32, fontWeight: 600, color: s.color }}>{s.n}</div>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 4 }}>{s.l}</div>
              </Card>
            ))}
          </div>

          {/* Week-by-week */}
          <div style={{ marginBottom: 18 }}>
            <H2 size={20}>Your four weeks</H2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {[1, 2, 3, 4].map((wk) => {
                const e = myEntry(wk);
                const r = myReflect(wk);
                const c = r?.achieved === "yes" ? { hue: "sage", label: "✓ Done" } : r?.achieved === "partial" ? { hue: "amber", label: "◐ Partly" } : r ? { hue: "muted", label: "— Slipped" } : { hue: "muted", label: "No reflection" };
                return (
                  <div key={wk} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12 }}>
                    <div style={{ width: 28, fontFamily: serif, fontSize: 18, fontWeight: 600, color: C.coralDk }}>{wk}</div>
                    <div style={{ flex: 1, fontSize: 13.5, color: e ? C.ink : C.muted, lineHeight: 1.45 }}>{e?.specific_goal ?? "No commitment set"}</div>
                    <Chip hue={c.hue}>{c.label}</Chip>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cohort send-off */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <GhostBtn onClick={() => navigate("/accountability/dashboard")}>← Back to dashboard</GhostBtn>
          </div>
        </Container>
      </div>
    );
  }

  return null;
}
