import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

// ── Main component ────────────────────────────────────────────────
type View = "welcome" | "goal" | "dashboard" | "commit" | "reflect" | "wrap";

export default function Accountability() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("dashboard");
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [commitText, setCommitText] = useState("");
  const [commitDetail, setCommitDetail] = useState(false);
  const [relevance, setRelevance] = useState("");
  const [measurable, setMeasurable] = useState("");
  const [reflectOutcome, setReflectOutcome] = useState<"yes" | "partial" | "no" | "">("");
  const [reflectText, setReflectText] = useState("");
  const [reflectDetail, setReflectDetail] = useState(false);
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
      // Admins always have access — treat as implicit member
      if (isAdmin) return { id: "admin", status: "joined" };
      const { data: byId } = await supabase.from("accountability_cycle_members").select("id, status").eq("user_id", user.id).maybeSingle();
      if (byId) return byId;
      const { data: byEmail } = await supabase.from("accountability_cycle_members").select("id, status").ilike("email", user.email ?? "").maybeSingle();
      return byEmail ?? null;
    },
    enabled: !!user,
  });

  // Link user_id on first visit
  useEffect(() => {
    if (!user) return;
    supabase.from("accountability_cycle_members").update({ status: "joined", user_id: user.id }).eq("status", "invited").ilike("email", user.email ?? "").then(() => {});
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

  // Show welcome on first visit per cycle
  useEffect(() => {
    if (!data?.cycle || !user) return;
    const key = `mm_welcome_${data.cycle.id}_${user.id}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, "1");
      setView("welcome");
    }
  }, [data?.cycle, user]);

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

  // ── Save goal ─────────────────────────────────────────────────
  const saveGoal = async () => {
    if (!goalText.trim()) return;
    setSaving(true);
    try {
      if (myGoal) {
        await supabase.from("accountability_monthly_goals").update({ monthly_goal: goalText.trim(), success_metric: successMetric.trim() || null }).eq("id", myGoal.id);
      } else {
        await supabase.from("accountability_monthly_goals").insert({ cycle_id: cycle.id, user_id: user!.id, monthly_goal: goalText.trim(), success_metric: successMetric.trim() || null });
      }
      await queryClient.invalidateQueries({ queryKey: ["accountability"] });
      toast.success("Goal saved!");
      setView("dashboard");
    } catch { toast.error("Failed to save goal"); }
    finally { setSaving(false); }
  };

  // ── Save commitment ───────────────────────────────────────────
  const saveCommit = async () => {
    if (!commitText.trim()) return;
    setSaving(true);
    try {
      const existing = myEntry(selectedWeek);
      if (existing) {
        await supabase.from("accountability_weekly_entries").update({ specific_goal: commitText.trim(), relevance: relevance.trim() || null, measurable: measurable.trim() || null }).eq("id", existing.id);
      } else {
        await supabase.from("accountability_weekly_entries").insert({ cycle_id: cycle.id, user_id: user!.id, week_number: selectedWeek, specific_goal: commitText.trim(), relevance: relevance.trim() || null, measurable: measurable.trim() || null });
      }
      await queryClient.invalidateQueries({ queryKey: ["accountability"] });
      toast.success("Commitment locked in!");
      setView("dashboard");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  // ── Save reflection ───────────────────────────────────────────
  const saveReflect = async () => {
    if (!reflectOutcome || !reflectText.trim()) return;
    setSaving(true);
    try {
      const existing = myReflect(selectedWeek);
      if (existing) {
        await supabase.from("accountability_weekly_reflections").update({ achieved: reflectOutcome, reflection: reflectText.trim(), blocker: blocker.trim() || null, adjustments: adjustments.trim() || null }).eq("id", existing.id);
      } else {
        await supabase.from("accountability_weekly_reflections").insert({ cycle_id: cycle.id, user_id: user!.id, week_number: selectedWeek, achieved: reflectOutcome, reflection: reflectText.trim(), blocker: blocker.trim() || null, adjustments: adjustments.trim() || null });
      }
      await queryClient.invalidateQueries({ queryKey: ["accountability"] });
      toast.success("Reflection saved!");
      setView("dashboard");
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
    setCommitDetail(false);
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
    setGoalText(myGoal?.monthly_goal ?? "");
    setSuccessMetric(myGoal?.success_metric ?? "");
    setView("goal");
  };

  // ─────────────────────────────────────────────────────────────
  // 01 WELCOME SCREEN
  // ─────────────────────────────────────────────────────────────
  if (view === "welcome") {
    return (
      <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${C.bg} 0%, ${C.lavWash} 100%)`, fontFamily: sans }}>
        <MainNav />
        <Container max={760}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, marginTop: 8, marginBottom: 28 }}>
            <Eyebrow>You're in · {monthName} cohort</Eyebrow>
            <div style={{ marginTop: 8 }}><H1 size={52}>Four weeks. One <SerifI>thing.</SerifI></H1></div>
            <div style={{ maxWidth: 480 }}>
              <Sub>Welcome to Momentum — a four-week rhythm to commit to one goal and move it forward, alongside {cohortOthers.length > 0 ? `${cohortOthers.length + 1} women` : "your cohort"} doing the same.</Sub>
            </div>
          </div>

          {/* Cohort card */}
          <Card padded={false as any} style={{ overflow: "hidden", padding: 0, marginBottom: 18 }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>Your cohort</div>
                <H2 size={22}>{monthName} · {cohortOthers.length + 1} members</H2>
              </div>
              <div style={{ display: "flex" }}>
                {[...cohortOthers.slice(0, 5), { user_id: user!.id, full_name: "You", avatar_url: null }].map((m, i) => (
                  <div key={m.user_id} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i, position: "relative", boxShadow: "0 0 0 2.5px #fff", borderRadius: "50%" }}>
                    <MMAvatar name={m.full_name} size={36} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: "12px 24px", display: "flex", gap: 16, color: C.muted, fontSize: 12.5 }}>
              <span>{monthName} · 4 weeks</span>
              <span>·</span>
              <span>Monday commit, Sunday reflect</span>
              <span>·</span>
              <span>Group is private to your cohort</span>
            </div>
          </Card>

          {/* 3-step rhythm */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 28 }}>
            {[
              { day: "MONDAY", label: "Commit", sub: "One thing you'll move this week.", color: C.coralDk },
              { day: "MID-WEEK", label: "Pulse", sub: "See your cohort, send a 🔥.", color: C.lavDk },
              { day: "SUNDAY", label: "Reflect", sub: "What happened? Adjust.", color: C.sage },
            ].map((s) => (
              <Card key={s.day}>
                <Eyebrow color={s.color}>{s.day}</Eyebrow>
                <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 500, marginTop: 6 }}>{s.label}</div>
                <div style={{ marginTop: 8, fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{s.sub}</div>
              </Card>
            ))}
          </div>

          {/* The one promise */}
          <Card style={{ background: C.coralWash, borderColor: `${C.coral}33`, marginBottom: 28 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.coral, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>1</div>
              <div>
                <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 500, marginBottom: 4 }}>The one promise</div>
                <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.55 }}>You'll show up for 5 minutes on Monday and 5 minutes on Sunday. That's the deal. Everything else is bonus.</div>
              </div>
            </div>
          </Card>

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <PrimaryBtn style={{ width: 260 }} onClick={openGoal}>Set my monthly goal <ArrowRight size={16} /></PrimaryBtn>
            <GhostBtn onClick={() => setView("dashboard")}>Go to dashboard</GhostBtn>
          </div>
        </Container>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 02 GOAL FORM
  // ─────────────────────────────────────────────────────────────
  if (view === "goal") {
    const cohortGoals = goals.filter((g) => g.user_id !== user!.id && g.monthly_goal).slice(0, 3);
    return (
      <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${C.bg} 0%, ${C.lavWash} 100%)`, fontFamily: sans }}>
        <MainNav />
        <Container max={680}>
          <button onClick={() => setView("dashboard")} style={{ fontSize: 13, color: C.muted, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 18, padding: 0 }}>
            <ArrowLeft size={14} /> Back to dashboard
          </button>
          <div style={{ marginBottom: 22 }}>
            <Eyebrow>{myGoal ? "Edit monthly goal" : "Step 1 · before week 1"}</Eyebrow>
            <div style={{ marginTop: 10 }}><H1 size={42}>Your <SerifI>one thing</SerifI> for {monthName}.</H1></div>
            <div style={{ marginTop: 10 }}><Sub>Big enough to matter. Small enough to move in four weeks. Pick one.</Sub></div>
          </div>

          <Card accent={C.coral} style={{ padding: 28 }}>
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.ink, display: "block", marginBottom: 8 }}>What's the one thing you want to move this month?</label>
              <textarea
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                maxLength={240}
                placeholder="Be specific. 'Get healthy' → 'Run 3× a week and track it.'"
                rows={4}
                style={{ width: "100%", borderRadius: 14, border: goalText ? `2px solid ${C.coral}` : `1.5px solid ${C.border}`, background: "#fff", padding: "14px 16px", fontSize: 16, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box", boxShadow: goalText ? `0 0 0 4px ${C.coral}1a` : "none" }}
              />
              <div style={{ fontSize: 12, color: C.faint, marginTop: 6, display: "flex", justifyContent: "space-between" }}>
                <span>Be specific. "Get healthy" → "Run 3× a week."</span>
                <span>{goalText.length} / 240</span>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.ink, display: "block", marginBottom: 8 }}>
                How will you know you've done it? <span style={{ color: C.faint, fontWeight: 400 }}>· optional</span>
              </label>
              <textarea
                value={successMetric}
                onChange={(e) => setSuccessMetric(e.target.value)}
                placeholder="Offer page is live AND three clients have paid by month end."
                rows={2}
                style={{ width: "100%", borderRadius: 14, border: `1.5px solid ${C.border}`, background: "#fff", padding: "12px 16px", fontSize: 14, color: C.ink, lineHeight: 1.55, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" }}
              />
            </div>
          </Card>

          {cohortGoals.length > 0 && (
            <div style={{ marginTop: 28, marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 12 }}>{cohortGoals.length} of your cohort have already set theirs</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cohortGoals.map((g) => {
                  const p = getProfile(g.user_id);
                  return (
                    <div key={g.user_id} style={{ display: "flex", gap: 14, alignItems: "center", padding: "12px 16px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14 }}>
                      <MMAvatar name={p?.full_name ?? "?"} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 2 }}>{p?.full_name ?? "Member"}</div>
                        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.4 }}>{g.monthly_goal}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
            <GhostBtn onClick={() => setView("dashboard")} style={{ height: 42 }}>Cancel</GhostBtn>
            <PrimaryBtn style={{ width: 220 }} onClick={saveGoal} disabled={!goalText.trim() || saving}>{saving ? "Saving…" : "Save goal & continue →"}</PrimaryBtn>
          </div>
        </Container>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 03 DASHBOARD
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
    const isWrapTime = currentWeek === 4 && myReflect(4);

    return (
      <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${C.bg} 0%, ${C.lavWash} 100%)`, fontFamily: sans }}>
        <MainNav />
        <Container max={960}>
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
              <div style={{ fontSize: 12, color: C.muted }}>Day {Math.min(todayIdx >= 0 ? todayIdx + 1 + (currentWeek - 1) * 7 : (currentWeek - 1) * 7, 28)} of 28</div>
            </div>
          </div>

          {/* Week progress bar */}
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: "14px 18px", marginBottom: 22 }}>
            <WeekBar states={weekStates} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: C.muted, fontWeight: 500 }}>
              {[1, 2, 3, 4].map((wk) => (
                <button key={wk} onClick={() => { if (isWeekUnlocked(wk)) { setSelectedWeek(wk); if (!myEntry(wk)) openCommit(wk); else openReflect(wk); } }}
                  style={{ background: "none", border: "none", cursor: isWeekUnlocked(wk) ? "pointer" : "default", padding: 0, fontFamily: sans, fontSize: 11, fontWeight: wk === currentWeek ? 700 : 500, color: wk === currentWeek ? C.coralDk : C.muted }}>
                  Wk{wk}{wk < currentWeek ? " ✓" : wk === currentWeek ? " · now" : ""}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 18, alignItems: "flex-start" }}>
            {/* LEFT */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                      <div style={{ fontFamily: serif, fontSize: 24, lineHeight: 1.25, fontWeight: 500, color: C.ink, marginBottom: 14 }}>{myCurrentEntry.specific_goal}</div>
                      {myCurrentEntry.measurable && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.warm, borderRadius: 12, marginBottom: 18 }}>
                          <span style={{ fontSize: 14 }}>🎯</span>
                          <span style={{ fontSize: 12.5, color: C.muted }}><span style={{ fontWeight: 600, color: C.ink }}>Success:</span> {myCurrentEntry.measurable}</span>
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
                        <GhostBtn onClick={() => openCommit(currentWeek)}>Edit</GhostBtn>
                      </>
                    ) : reflectUnlocked ? (
                      <>
                        <PrimaryBtn style={{ flex: 1 }} onClick={() => openReflect(currentWeek)}>Add reflection</PrimaryBtn>
                        <GhostBtn onClick={() => openCommit(currentWeek)}>Edit</GhostBtn>
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

              {/* Monthly goal teaser */}
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

              {/* Wrap CTA if cohort is done */}
              {isWrapTime && (
                <Card style={{ background: C.coralWash, borderColor: `${C.coral}33`, textAlign: "center" as const }}>
                  <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Four weeks <SerifI>done.</SerifI></div>
                  <Sub>You made it through the whole cohort.</Sub>
                  <div style={{ marginTop: 16 }}><PrimaryBtn style={{ width: 200 }} onClick={() => setView("wrap")}>See your recap →</PrimaryBtn></div>
                </Card>
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
                const entryReactions = e ? reactions.filter((r) => r.entry_id === e.id) : [];
                const reactionCounts = entryReactions.reduce<Record<string, { count: number; mine: boolean }>>((acc, r) => {
                  if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false };
                  acc[r.emoji].count++;
                  if (r.user_id === user!.id) acc[r.emoji].mine = true;
                  return acc;
                }, {});
                const QUICK_EMOJIS = ["🔥", "💪", "👀", "🤝"];
                return (
                  <div key={p.user_id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, opacity: e ? 1 : 0.6 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: e ? 8 : 0 }}>
                      <MMAvatar name={p.full_name} size={28} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, flex: 1 }}>{p.full_name ?? "Member"}</div>
                      {!e && <span style={{ fontSize: 11, color: C.faint }}>No commit yet</span>}
                    </div>
                    {e && (
                      <>
                        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.45, marginBottom: 10 }}>{e.specific_goal}</div>
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

              <div style={{ padding: "10px 14px", background: C.warm, borderRadius: 12, fontSize: 12, color: C.muted, lineHeight: 1.45, border: `1px dashed ${C.border}` }}>
                💡 Send a 🔥 when someone commits to something hard. It takes 2 seconds and changes everything.
              </div>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 04 COMMIT FORM
  // ─────────────────────────────────────────────────────────────
  if (view === "commit") {
    const wkStart2 = weekStart(cycle.month, cycle.year, selectedWeek);
    return (
      <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${C.bg} 0%, ${C.lavWash} 100%)`, fontFamily: sans }}>
        <MainNav />
        <Container max={640}>
          <button onClick={() => setView("dashboard")} style={{ fontSize: 13, color: C.muted, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 18, padding: 0 }}>
            <ArrowLeft size={14} /> Back to dashboard
          </button>
          <Eyebrow>Week {selectedWeek} · Monday · {format(wkStart2, "MMM d")}</Eyebrow>
          <div style={{ marginTop: 10, marginBottom: 8 }}><H1 size={40}>What's the <SerifI>one thing</SerifI> this week?</H1></div>
          <Sub>Move your monthly goal forward by one notch. Specific beats ambitious.</Sub>

          <Card accent={C.coral} style={{ marginTop: 22, padding: 26 }}>
            {myGoal && (
              <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", background: C.lavWash, borderRadius: 12, marginBottom: 20, fontSize: 12.5, color: C.lavDk }}>
                <span>🎯</span><span><strong>This month:</strong> {myGoal.monthly_goal}</span>
              </div>
            )}

            <label style={{ fontSize: 13, fontWeight: 600, color: C.ink, display: "block", marginBottom: 8 }}>My commitment for this week</label>
            <textarea
              value={commitText}
              onChange={(e) => setCommitText(e.target.value)}
              maxLength={200}
              placeholder="Send offer page draft to designer + lock copy by Thursday EOD."
              rows={3}
              autoFocus
              style={{ width: "100%", borderRadius: 14, border: commitText ? `2px solid ${C.coral}` : `1.5px solid ${C.border}`, background: "#fff", padding: "14px 16px", fontSize: 16, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box", boxShadow: commitText ? `0 0 0 4px ${C.coral}1a` : "none", marginBottom: 8 }}
            />
            <div style={{ fontSize: 12, color: C.faint, marginBottom: 22, display: "flex", justifyContent: "space-between" }}>
              <span>One sentence. Something you can hold yourself to.</span>
              <span>{commitText.length} / 200</span>
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <button onClick={() => setCommitDetail(!commitDetail)} style={{ background: "none", border: "none", color: C.muted, fontSize: 13, fontWeight: 500, padding: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "inline-block", transform: commitDetail ? "rotate(270deg)" : "rotate(90deg)", transition: "transform 0.2s" }}>›</span>
                {commitDetail ? "Hide detail" : "Add detail · success criteria, context"}
              </button>
              {commitDetail && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>How will you know you've done it?</label>
                    <textarea value={measurable} onChange={(e) => setMeasurable(e.target.value)} rows={2} placeholder="Success criteria…" style={{ width: "100%", borderRadius: 12, border: `1.5px solid ${C.border}`, background: "#fff", padding: "10px 14px", fontSize: 14, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>Why does this matter?</label>
                    <textarea value={relevance} onChange={(e) => setRelevance(e.target.value)} rows={2} placeholder="Why this matters right now…" style={{ width: "100%", borderRadius: 12, border: `1.5px solid ${C.border}`, background: "#fff", padding: "10px 14px", fontSize: 14, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" }} />
                  </div>
                </div>
              )}
            </div>
          </Card>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
            <GhostBtn onClick={() => setView("dashboard")}>Cancel</GhostBtn>
            <PrimaryBtn style={{ width: 200 }} onClick={saveCommit} disabled={!commitText.trim() || saving}>{saving ? "Saving…" : "Lock it in →"}</PrimaryBtn>
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
        <Container max={640}>
          <button onClick={() => setView("dashboard")} style={{ fontSize: 13, color: C.muted, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 18, padding: 0 }}>
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

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <button onClick={() => setReflectDetail(!reflectDetail)} style={{ background: "none", border: "none", color: C.muted, fontSize: 13, fontWeight: 500, padding: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "inline-block", transform: reflectDetail ? "rotate(270deg)" : "rotate(90deg)", transition: "transform 0.2s" }}>›</span>
                {reflectDetail ? "Hide detail" : "Add detail · what slowed me down, what I'll adjust"}
              </button>
              {reflectDetail && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>What slowed you down?</label>
                    <textarea value={blocker} onChange={(e) => setBlocker(e.target.value)} rows={2} placeholder="Blocker…" style={{ width: "100%", borderRadius: 12, border: `1.5px solid ${C.border}`, background: "#fff", padding: "10px 14px", fontSize: 14, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>What would you do differently?</label>
                    <textarea value={adjustments} onChange={(e) => setAdjustments(e.target.value)} rows={2} placeholder="Adjustments for next week…" style={{ width: "100%", borderRadius: 12, border: `1.5px solid ${C.border}`, background: "#fff", padding: "10px 14px", fontSize: 14, color: C.ink, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: sans, boxSizing: "border-box" }} />
                  </div>
                </div>
              )}
            </div>
          </Card>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
            <GhostBtn onClick={() => setView("dashboard")}>Cancel</GhostBtn>
            <PrimaryBtn style={{ width: 220 }} onClick={saveReflect} disabled={!reflectOutcome || !reflectText.trim() || saving}>{saving ? "Saving…" : "Save reflection →"}</PrimaryBtn>
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
        <Container max={840}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 28 }}>
            <Eyebrow>{monthName} cohort · complete</Eyebrow>
            <div style={{ marginTop: 12 }}><H1 size={52}>Four weeks <SerifI>down.</SerifI></H1></div>
            <div style={{ marginTop: 12, maxWidth: 480 }}><Sub size={16}>You committed {committed}/4 weeks and reflected {reflected}/4. Here's what you moved.</Sub></div>
          </div>

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

          {/* Monthly goal recap */}
          {myGoal && (
            <Card style={{ background: C.lavWash, borderColor: `${C.lav}55`, marginBottom: 18 }}>
              <Eyebrow color={C.lavDk}>Your {monthName} goal</Eyebrow>
              <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 500, marginTop: 6, lineHeight: 1.3 }}>{myGoal.monthly_goal}</div>
            </Card>
          )}

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
          {cohortOthers.length > 0 && (
            <Card accent={C.coral} style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ display: "flex" }}>
                  {cohortOthers.slice(0, 5).map((p, i) => (
                    <div key={p.user_id} style={{ marginLeft: i === 0 ? 0 : -10, boxShadow: "0 0 0 2.5px #fff", borderRadius: "50%" }}>
                      <MMAvatar name={p.full_name} size={32} />
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Stay in touch with your cohort</div>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.45 }}>Your group stays accessible. Most pairs we see exchange a message in the week after — a few become long-standing accountability partners.</div>
                </div>
              </div>
            </Card>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <GhostBtn onClick={() => setView("dashboard")}>← Back to dashboard</GhostBtn>
          </div>
        </Container>
      </div>
    );
  }

  return null;
}
