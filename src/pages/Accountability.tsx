import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { MainNav } from "@/components/MainNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { AccountabilityGoalSetup } from "@/components/AccountabilityGoalSetup";
import { AccountabilityWeekEntry } from "@/components/AccountabilityWeekEntry";
import { AccountabilityGroupOverview } from "@/components/AccountabilityGroupOverview";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, getDaysInMonth } from "date-fns";
import {
  ArrowLeft, CheckCircle2, Circle, Clock, ChevronRight, Target, Sun, Calendar, Users,
} from "lucide-react";

// Find the first Monday of a given month
function firstMondayOf(year: number, month: number): Date {
  const d = new Date(year, month - 1, 1);
  const dow = d.getDay(); // 0=Sun … 6=Sat
  const offset = dow === 1 ? 0 : dow === 0 ? 1 : 8 - dow;
  return new Date(year, month - 1, 1 + offset);
}

function getWeekOfMonth(date: Date): number {
  const fm = firstMondayOf(date.getFullYear(), date.getMonth() + 1);
  const diff = Math.floor((date.getTime() - fm.getTime()) / (7 * 86400000));
  return Math.min(4, Math.max(1, diff + 1));
}

function weekDateRange(month: number, year: number, wk: number): string {
  const fm = firstMondayOf(year, month);
  const start = new Date(fm);
  start.setDate(fm.getDate() + (wk - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startStr = format(start, "MMM d");
  const endStr = end.getMonth() === start.getMonth() ? format(end, "d") : format(end, "MMM d");
  return `${startStr}–${endStr}`;
}

type WeekStatus = "future" | "not_started" | "committed" | "complete";

// Each week unlocks on the Sunday before it starts at 18:00
function weekUnlockTime(month: number, year: number, wk: number): Date {
  const fm = firstMondayOf(year, month);
  const monday = new Date(fm);
  monday.setDate(fm.getDate() + (wk - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() - 1);
  sunday.setHours(18, 0, 0, 0);
  return sunday;
}

function getWeekStatus(
  entry: any,
  reflection: any,
  wk: number,
  month: number,
  year: number
): WeekStatus {
  if (new Date() < weekUnlockTime(month, year, wk)) return "future";
  if (!entry) return "not_started";
  if (!reflection?.achieved) return "committed";
  return "complete";
}

const statusConfig: Record<WeekStatus, { label: string; color: string; icon: typeof Circle }> = {
  future:      { label: "Upcoming",    color: "text-muted-foreground bg-muted/40",           icon: Circle },
  not_started: { label: "Not started", color: "text-amber-600 bg-amber-50 border-amber-200", icon: Circle },
  committed:   { label: "Committed",   color: "text-blue-600 bg-blue-50 border-blue-200",    icon: Calendar },
  complete:    { label: "Complete",    color: "text-green-600 bg-green-50 border-green-200",  icon: CheckCircle2 },
};

function WeekCard({
  wk, month, year, entry, reflection, currentWeek, onClick,
}: {
  wk: number; month: number; year: number;
  entry: any; reflection: any; currentWeek: number;
  onClick: () => void;
}) {
  const status = getWeekStatus(entry, reflection, wk, month, year);
  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;
  const isFuture = status === "future";
  const achieved = reflection?.achieved as "yes" | "partial" | "no" | null;
  const opensOn = isFuture ? weekUnlockTime(month, year, wk) : null;

  return (
    <Card
      className={`transition-all ${isFuture ? "opacity-50 cursor-default" : "hover:shadow-elevated cursor-pointer"}`}
      onClick={isFuture ? undefined : onClick}
    >
      <CardContent className="py-4 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">Week {wk}</span>
              <span className="text-xs text-muted-foreground">{weekDateRange(month, year, wk)}</span>
              {wk === currentWeek && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-primary border-primary">
                  Current
                </Badge>
              )}
            </div>

            {entry?.specific_goal ? (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{entry.specific_goal}</p>
            ) : !isFuture ? (
              <p className="text-sm text-muted-foreground mb-2 italic">No commitment set yet</p>
            ) : null}

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.color}`}>
                <StatusIcon className="w-3 h-3" />
                {cfg.label}
              </span>
              {achieved && (
                <span className="text-xs">
                  {achieved === "yes" ? "✅ Achieved" : achieved === "partial" ? "⚠️ Partial" : "❌ Not achieved"}
                </span>
              )}
              {opensOn && (
                <span className="text-xs text-muted-foreground">
                  Opens Sun {format(opensOn, "MMM d")} at 6pm
                </span>
              )}
            </div>
          </div>

          {!isFuture && (
            <div className="flex items-center gap-1 flex-shrink-0 self-center">
              <span className="text-xs text-muted-foreground">
                {status === "not_started" ? "Set goal" : status === "committed" ? "Log reflection" : "View"}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Accountability() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentWeek = getWeekOfMonth(now);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["accountability", currentMonth, currentYear, user?.id],
    queryFn: async () => {
      if (!user) return null;

      let { data: cycle } = await supabase
        .from("accountability_cycles")
        .select("id, name, month, year")
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .maybeSingle();

      if (!cycle) {
        const { data: newCycle, error } = await supabase
          .from("accountability_cycles")
          .insert({ name: format(now, "MMMM yyyy"), month: currentMonth, year: currentYear, created_by: user.id })
          .select("id, name, month, year")
          .single();
        if (error && !error.message.includes("unique")) throw error;
        if (newCycle) cycle = newCycle;
        else {
          const { data: r } = await supabase.from("accountability_cycles")
            .select("id, name, month, year").eq("month", currentMonth).eq("year", currentYear).maybeSingle();
          cycle = r;
        }
      }

      if (!cycle) return null;
      const cycleId = cycle.id;

      const [{ data: goals }, { data: entries }, { data: reflections }] = await Promise.all([
        supabase.from("accountability_monthly_goals").select("id, user_id, monthly_goal, success_metric").eq("cycle_id", cycleId),
        supabase.from("accountability_weekly_entries").select("id, user_id, week_number, specific_goal, relevance, achievable, measurable").eq("cycle_id", cycleId),
        supabase.from("accountability_weekly_reflections").select("id, user_id, week_number, achieved, reflection, blocker, adjustments").eq("cycle_id", cycleId),
      ]);

      const allUserIds = Array.from(new Set([
        ...(goals ?? []).map((g) => g.user_id),
        ...(entries ?? []).map((e) => e.user_id),
        user.id,
      ]));
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", allUserIds);

      return { cycle, goals: goals ?? [], entries: entries ?? [], reflections: reflections ?? [], profiles: profiles ?? [] };
    },
    enabled: !!user,
  });

  if (authLoading || isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading…" />
      </div>
    );
  }

  const { cycle, goals, entries, reflections, profiles } = data;
  const getProfile = (uid: string) => profiles.find((p) => p.user_id === uid);

  // My data helpers
  const myGoal = goals.find((g) => g.user_id === user!.id) ?? null;
  const myEntryForWeek = (wk: number) => entries.find((e) => e.user_id === user!.id && e.week_number === wk) ?? null;
  const myReflectionForWeek = (wk: number) => reflections.find((r) => r.user_id === user!.id && r.week_number === wk) ?? null;

  // Other members
  const otherMemberIds = Array.from(new Set([
    ...goals.filter((g) => g.user_id !== user!.id).map((g) => g.user_id),
    ...entries.filter((e) => e.user_id !== user!.id).map((e) => e.user_id),
  ]));

  const otherGoals = goals.filter((g) => g.user_id !== user!.id).map((g) => ({
    user_id: g.user_id,
    full_name: getProfile(g.user_id)?.full_name ?? "Member",
    avatar_url: getProfile(g.user_id)?.avatar_url ?? null,
    monthly_goal: g.monthly_goal,
    success_metric: g.success_metric ?? null,
  }));

  const groupMembers = Array.from(new Set([...goals.map((g) => g.user_id), ...entries.map((e) => e.user_id)])).map((uid) => ({
    user_id: uid,
    full_name: getProfile(uid)?.full_name ?? "Member",
    avatar_url: getProfile(uid)?.avatar_url ?? null,
    monthlyGoal: goals.find((g) => g.user_id === uid)?.monthly_goal ?? null,
    weeks: [1, 2, 3, 4].map((wk) => {
      const entry = entries.find((e) => e.user_id === uid && e.week_number === wk);
      const ref = reflections.find((r) => r.user_id === uid && r.week_number === wk);
      return {
        week_number: wk,
        entry: entry ? { specific_goal: entry.specific_goal, relevance: entry.relevance, measurable: entry.measurable } : null,
        reflection: ref ? { achieved: ref.achieved as "yes" | "partial" | "no" | null, reflection: ref.reflection, adjustments: ref.adjustments } : null,
      };
    }),
  }));

  const monthName = format(new Date(cycle.year, cycle.month - 1), "MMMM yyyy");

  // ── Week detail view ──────────────────────────────────────────────────────
  if (selectedWeek !== null) {
    const wk = selectedWeek;
    const otherMembersForWeek = otherMemberIds.map((uid) => ({
      user_id: uid,
      full_name: getProfile(uid)?.full_name ?? "Member",
      entry: entries.find((e) => e.user_id === uid && e.week_number === wk) ?? null,
      reflection: reflections.find((r) => r.user_id === uid && r.week_number === wk) ?? null,
    }));

    return (
      <div className="min-h-screen gradient-hero">
        <MainNav />
        <main className="container py-8 px-4 max-w-2xl mx-auto">
          <Button
            variant="ghost" size="sm"
            className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => setSelectedWeek(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to program
          </Button>

          <div className="mb-6">
            <h1 className="font-display text-2xl font-semibold">Week {wk}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {monthName} · {weekDateRange(cycle.month, cycle.year, wk)}
            </p>
          </div>

          <AccountabilityWeekEntry
            cycleId={cycle.id}
            userId={user!.id}
            weekNumber={wk}
            myEntry={myEntryForWeek(wk)}
            myReflection={myReflectionForWeek(wk)}
            otherMembers={otherMembersForWeek}
          />
        </main>
      </div>
    );
  }

  // ── Dashboard view ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen gradient-hero">
      <MainNav />
      <main className="container py-8 px-4 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold">Monday Momentum</h1>
          <p className="text-muted-foreground text-sm mt-1">{monthName}</p>
        </div>

        <Tabs defaultValue="monthly-goal">
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="monthly-goal" className="flex-1">Goal</TabsTrigger>
            <TabsTrigger value="weeks" className="flex-1">Program</TabsTrigger>
            <TabsTrigger value="participants" className="flex-1">People</TabsTrigger>
          </TabsList>

          {/* 4-week dashboard */}
          <TabsContent value="weeks" className="space-y-3">
            {/* Monthly goal teaser */}
            {myGoal && (
              <Card className="border-primary/20 bg-primary/5 mb-4">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-primary mb-0.5">Monthly goal</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{myGoal.monthly_goal}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Week cards */}
            {[1, 2, 3, 4].map((wk) => (
              <WeekCard
                key={wk}
                wk={wk}
                month={cycle.month}
                year={cycle.year}
                entry={myEntryForWeek(wk)}
                reflection={myReflectionForWeek(wk)}
                currentWeek={currentWeek}
                onClick={() => setSelectedWeek(wk)}
              />
            ))}
          </TabsContent>

          <TabsContent value="monthly-goal">
            <AccountabilityGoalSetup
              cycleId={cycle.id}
              userId={user!.id}
              existing={myGoal}
              otherGoals={otherGoals}
            />
          </TabsContent>

          <TabsContent value="participants" className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              {groupMembers.length} participant{groupMembers.length !== 1 ? "s" : ""} in this cohort
            </p>
            {groupMembers.map((member) => {
              const completedWeeks = member.weeks.filter((w) => w.reflection?.achieved).length;
              const committedWeeks = member.weeks.filter((w) => w.entry).length;
              const initials = (member.full_name ?? "?")
                .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
              const isMe = member.user_id === user!.id;
              return (
                <Card key={member.user_id} className={isMe ? "border-primary/30 bg-primary/5" : ""}>
                  <CardContent className="py-4 px-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm">{member.full_name}</span>
                          {isMe && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-primary border-primary">
                              You
                            </Badge>
                          )}
                        </div>
                        {member.monthlyGoal && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {member.monthlyGoal}
                          </p>
                        )}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {committedWeeks}/4 committed
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            {completedWeeks} reflected
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {groupMembers.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No participants yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
