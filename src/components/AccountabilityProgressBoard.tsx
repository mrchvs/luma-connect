import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

type Achieved = "yes" | "partial" | "no";

interface WeekResult {
  achieved: Achieved | null;
  hasEntry: boolean;
}

interface MemberProgress {
  user_id: string;
  full_name: string;
  weeks: [WeekResult, WeekResult, WeekResult, WeekResult];
}

interface Props {
  members: MemberProgress[];
  weekLabels: string[];
  currentWeek: number;
}

function scoreFromAchieved(a: Achieved | null) {
  if (a === "yes") return 1;
  if (a === "partial") return 0.5;
  return 0;
}

function WeekCell({ result, isFuture }: { result: WeekResult; isFuture: boolean }) {
  if (isFuture) {
    return <div className="w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center text-lg">·</div>;
  }
  if (!result.hasEntry) {
    return <div className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">—</div>;
  }
  if (!result.achieved) {
    return <div className="w-10 h-10 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">?</div>;
  }
  const emoji = result.achieved === "yes" ? "✅" : result.achieved === "partial" ? "⚠️" : "❌";
  const bg = result.achieved === "yes" ? "bg-green-50 border-green-200" : result.achieved === "partial" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
  return (
    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-base ${bg}`}>
      {emoji}
    </div>
  );
}

export function AccountabilityProgressBoard({ members, weekLabels, currentWeek }: Props) {
  const totalWeeks = 4;

  const totalCompleted = members.reduce((sum, m) => {
    return sum + m.weeks.reduce((s, w) => s + scoreFromAchieved(w.achieved), 0);
  }, 0);

  const possibleCompleted = members.reduce((sum, m) => {
    return sum + m.weeks.filter((_, i) => i < currentWeek).length;
  }, 0);

  const groupRate = possibleCompleted > 0 ? Math.round((totalCompleted / possibleCompleted) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Group summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <CardContent className="py-4">
            <p className="text-2xl font-bold text-primary">{members.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Members</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-4">
            <p className="text-2xl font-bold text-green-600">{groupRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Group rate</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-4">
            <p className="text-2xl font-bold">{totalCompleted}</p>
            <p className="text-xs text-muted-foreground mt-1">Goals hit</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Week-by-week progress
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[360px]">
            <thead>
              <tr>
                <th className="text-left text-xs text-muted-foreground font-medium pb-3 pr-4 w-32">Member</th>
                {weekLabels.map((label, i) => (
                  <th key={i} className="text-center text-xs text-muted-foreground font-medium pb-3 px-1">
                    <span className={i + 1 === currentWeek ? "text-primary font-semibold" : ""}>{label}</span>
                  </th>
                ))}
                <th className="text-center text-xs text-muted-foreground font-medium pb-3 pl-3">Rate</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const score = member.weeks.reduce((s, w) => s + scoreFromAchieved(w.achieved), 0);
                const possible = member.weeks.filter((_, i) => i < currentWeek).length;
                const rate = possible > 0 ? Math.round((score / possible) * 100) : 0;

                return (
                  <tr key={member.user_id} className="border-t border-border/40">
                    <td className="py-2 pr-4">
                      <span className="text-sm font-medium truncate block max-w-[120px]">
                        {member.full_name.split(" ")[0]}
                      </span>
                    </td>
                    {member.weeks.map((week, i) => (
                      <td key={i} className="py-2 px-1 text-center">
                        <div className="flex justify-center">
                          <WeekCell result={week} isFuture={i + 1 > currentWeek} />
                        </div>
                      </td>
                    ))}
                    <td className="py-2 pl-3 text-center">
                      <span className={`text-sm font-semibold ${rate >= 75 ? "text-green-600" : rate >= 50 ? "text-amber-500" : "text-muted-foreground"}`}>
                        {possible > 0 ? `${rate}%` : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span>✅ Achieved</span>
        <span>⚠️ Partial</span>
        <span>❌ Not achieved</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-muted/40 text-center leading-4 text-[10px]">—</span> No entry</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded border border-dashed border-border text-center leading-4 text-[10px]">?</span> Pending</span>
      </div>
    </div>
  );
}
