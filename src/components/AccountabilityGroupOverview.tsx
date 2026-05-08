import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Target, Calendar } from "lucide-react";
import { format, getDaysInMonth } from "date-fns";

type Achieved = "yes" | "partial" | "no";

interface MemberWeekData {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  monthlyGoal: string | null;
  weeks: Array<{
    week_number: number;
    entry: {
      specific_goal: string | null;
      relevance: string | null;
      measurable: string | null;
    } | null;
    reflection: {
      achieved: Achieved | null;
      reflection: string | null;
      adjustments: string | null;
    } | null;
  }>;
}

interface Props {
  members: MemberWeekData[];
  currentWeek: number;
  cycleMonth: number;
  cycleYear: number;
}

const achievedLabel: Record<Achieved, { emoji: string; label: string; color: string }> = {
  yes:     { emoji: "✅", label: "Achieved",         color: "bg-green-100 text-green-800 border-green-200" },
  partial: { emoji: "⚠️", label: "Partial",          color: "bg-amber-100 text-amber-800 border-amber-200" },
  no:      { emoji: "❌", label: "Not achieved",     color: "bg-red-100 text-red-800 border-red-200" },
};

function firstMondayOf(year: number, month: number): Date {
  const d = new Date(year, month - 1, 1);
  const dow = d.getDay();
  const offset = dow === 1 ? 0 : dow === 0 ? 1 : 8 - dow;
  return new Date(year, month - 1, 1 + offset);
}

function weekLabel(month: number, year: number, wk: number) {
  const fm = firstMondayOf(year, month);
  const start = new Date(fm);
  start.setDate(fm.getDate() + (wk - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startStr = format(start, "MMM d");
  const endStr = end.getMonth() === start.getMonth() ? format(end, "d") : format(end, "MMM d");
  return `Week ${wk} · ${startStr}–${endStr}`;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function MemberCard({ member, weekIndex }: { member: MemberWeekData; weekIndex: number }) {
  const week = member.weeks[weekIndex];
  const hasEntry = !!week?.entry?.specific_goal;
  const hasReflection = !!week?.reflection?.achieved;

  return (
    <Card className="border-border/60">
      <Collapsible>
        <CollapsibleTrigger asChild>
          <div className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/20 transition-colors rounded-t-lg">
            <Avatar className="w-9 h-9 flex-shrink-0 mt-0.5">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {getInitials(member.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="text-sm font-semibold">{member.full_name}</p>
                {hasReflection && week.reflection?.achieved && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${achievedLabel[week.reflection.achieved].color}`}>
                    {achievedLabel[week.reflection.achieved].emoji} {achievedLabel[week.reflection.achieved].label}
                  </span>
                )}
                {!hasEntry && (
                  <span className="text-xs text-muted-foreground">No commitment yet</span>
                )}
              </div>
              {hasEntry && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {week.entry!.specific_goal}
                </p>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-3">
            {hasEntry ? (
              <>
                {/* Monday commitment */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Monday commitment
                  </p>
                  <p className="text-sm">{week.entry!.specific_goal}</p>
                  {week.entry!.relevance && (
                    <p className="text-xs text-muted-foreground italic">{week.entry!.relevance}</p>
                  )}
                  {week.entry!.measurable && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Success looks like: </span>
                      {week.entry!.measurable}
                    </p>
                  )}
                </div>

                {/* Sunday reflection */}
                {hasReflection ? (
                  <div className="space-y-2 border-t border-border/40 pt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sunday reflection</p>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${achievedLabel[week.reflection!.achieved!].color}`}>
                      {achievedLabel[week.reflection!.achieved!].emoji} {achievedLabel[week.reflection!.achieved!].label}
                    </span>
                    {week.reflection!.reflection && (
                      <p className="text-sm text-muted-foreground">{week.reflection!.reflection}</p>
                    )}
                    {week.reflection!.adjustments && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Next week: </span>
                        {week.reflection!.adjustments}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground border-t border-border/40 pt-3">Reflection not yet submitted.</p>
                )}
              </>
            ) : (
              <>
                {/* Fall back to monthly goal */}
                {member.monthlyGoal && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Target className="w-3 h-3" /> Monthly goal
                    </p>
                    <p className="text-sm text-muted-foreground">{member.monthlyGoal}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function AccountabilityGroupOverview({ members, currentWeek, cycleMonth, cycleYear }: Props) {
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);

  const weekIndex = selectedWeek - 1;

  const submitted = members.filter((m) => m.weeks[weekIndex]?.entry?.specific_goal).length;
  const reflected = members.filter((m) => m.weeks[weekIndex]?.reflection?.achieved).length;
  const achieved = members.filter((m) => m.weeks[weekIndex]?.reflection?.achieved === "yes").length;

  return (
    <div className="space-y-5">
      {/* Week selector */}
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4].map((wk) => (
          <button
            key={wk}
            onClick={() => setSelectedWeek(wk)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              selectedWeek === wk
                ? "bg-primary text-primary-foreground border-primary"
                : wk > currentWeek
                ? "text-muted-foreground border-border/40 bg-muted/20 cursor-default"
                : "text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
            }`}
            disabled={wk > currentWeek}
          >
            {weekLabel(cycleMonth, cycleYear, wk)}
          </button>
        ))}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <CardContent className="py-3">
            <p className="text-xl font-bold text-primary">{submitted}/{members.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Committed</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-3">
            <p className="text-xl font-bold">{reflected}/{members.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Reflected</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-3">
            <p className="text-xl font-bold text-green-600">{reflected > 0 ? Math.round((achieved / reflected) * 100) : 0}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">Achieved</p>
          </CardContent>
        </Card>
      </div>

      {/* Member cards */}
      <div className="space-y-2">
        {members.map((member) => (
          <MemberCard key={member.user_id} member={member} weekIndex={weekIndex} />
        ))}
      </div>
    </div>
  );
}
