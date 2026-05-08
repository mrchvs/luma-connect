import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Pencil,
  Calendar,
  Sun,
  ChevronDown,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type Achieved = "yes" | "partial" | "no";

interface WeekEntry {
  id: string;
  specific_goal: string | null;
  relevance: string | null;
  achievable: string | null;
  measurable: string | null;
}

interface WeekReflection {
  id: string;
  achieved: Achieved | null;
  reflection: string | null;
  blocker: string | null;
  adjustments: string | null;
}

interface OtherMemberWeek {
  user_id: string;
  full_name: string;
  entry: WeekEntry | null;
  reflection: WeekReflection | null;
}

interface Props {
  cycleId: string;
  userId: string;
  weekNumber: number;
  myEntry: WeekEntry | null;
  myReflection: WeekReflection | null;
  otherMembers: OtherMemberWeek[];
}

const achievedOptions: Array<{ value: Achieved; label: string; icon: typeof CheckCircle2; color: string }> = [
  { value: "yes", label: "✅ Yes", icon: CheckCircle2, color: "text-green-600" },
  { value: "partial", label: "⚠️ Partial", icon: AlertCircle, color: "text-amber-500" },
  { value: "no", label: "❌ No", icon: XCircle, color: "text-destructive" },
];

function scoreFromAchieved(a: Achieved | null) {
  if (a === "yes") return 1;
  if (a === "partial") return 0.5;
  return 0;
}

function AchievedBadge({ achieved }: { achieved: Achieved | null }) {
  if (!achieved) return <span className="text-xs text-muted-foreground">—</span>;
  const opt = achievedOptions.find((o) => o.value === achieved);
  return <span className="text-sm">{opt?.label}</span>;
}

export function AccountabilityWeekEntry({
  cycleId,
  userId,
  weekNumber,
  myEntry,
  myReflection,
  otherMembers,
}: Props) {
  const queryClient = useQueryClient();

  const [editingEntry, setEditingEntry] = useState(!myEntry);
  const [editingReflection, setEditingReflection] = useState(!myReflection && !!myEntry);

  const [goal, setGoal] = useState(myEntry?.specific_goal ?? "");
  const [relevance, setRelevance] = useState(myEntry?.relevance ?? "");
  const [achievable, setAchievable] = useState(myEntry?.achievable ?? "");
  const [measurable, setMeasurable] = useState(myEntry?.measurable ?? "");

  const [achieved, setAchieved] = useState<Achieved | null>(myReflection?.achieved ?? null);
  const [reflection, setReflection] = useState(myReflection?.reflection ?? "");
  const [blocker, setBlocker] = useState(myReflection?.blocker ?? "");
  const [adjustments, setAdjustments] = useState(myReflection?.adjustments ?? "");

  const saveEntry = useMutation({
    mutationFn: async () => {
      const payload = { specific_goal: goal, relevance, achievable, measurable, updated_at: new Date().toISOString() };
      if (myEntry) {
        const { error } = await supabase.from("accountability_weekly_entries").update(payload).eq("id", myEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("accountability_weekly_entries").insert({ cycle_id: cycleId, user_id: userId, week_number: weekNumber, ...payload });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Monday commitment saved!");
      setEditingEntry(false);
      queryClient.invalidateQueries({ queryKey: ["accountability"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  const saveReflection = useMutation({
    mutationFn: async () => {
      const payload = { achieved, reflection, blocker, adjustments, updated_at: new Date().toISOString() };
      if (myReflection) {
        const { error } = await supabase.from("accountability_weekly_reflections").update(payload).eq("id", myReflection.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("accountability_weekly_reflections").insert({ cycle_id: cycleId, user_id: userId, week_number: weekNumber, ...payload });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Sunday reflection saved!");
      setEditingReflection(false);
      queryClient.invalidateQueries({ queryKey: ["accountability"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Monday Setup */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Monday commitment
            </CardTitle>
            {myEntry && !editingEntry && (
              <Button variant="ghost" size="sm" onClick={() => setEditingEntry(true)}>
                <Pencil className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingEntry ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>What's the one thing you're committing to this week?</Label>
                <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Be specific and concrete…" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Why does it matter? <span className="text-muted-foreground font-normal">(relevance)</span></Label>
                <Textarea value={relevance} onChange={(e) => setRelevance(e.target.value)} placeholder="How does this move your monthly goal forward?" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Potential blockers? <span className="text-muted-foreground font-normal">(achievable)</span></Label>
                <Textarea value={achievable} onChange={(e) => setAchievable(e.target.value)} placeholder="What could get in the way, and how will you handle it?" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>How will you know you've done it? <span className="text-muted-foreground font-normal">(measurable)</span></Label>
                <Textarea value={measurable} onChange={(e) => setMeasurable(e.target.value)} placeholder="Specific, observable outcome…" rows={2} />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => saveEntry.mutate()} disabled={!goal.trim() || saveEntry.isPending} size="sm">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Save commitment
                </Button>
                {myEntry && (
                  <Button variant="ghost" size="sm" onClick={() => { setEditingEntry(false); setGoal(myEntry.specific_goal ?? ""); }}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ) : myEntry ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">{myEntry.specific_goal}</p>
              {myEntry.relevance && <p className="text-sm text-muted-foreground">{myEntry.relevance}</p>}
              {myEntry.measurable && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Success looks like</p>
                  <p className="text-sm text-muted-foreground italic">{myEntry.measurable}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Fill in your Monday commitment to get started.</p>
          )}
        </CardContent>
      </Card>

      {/* Sunday Reflection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              Sunday reflection
            </CardTitle>
            {myReflection && !editingReflection && (
              <Button variant="ghost" size="sm" onClick={() => setEditingReflection(true)}>
                <Pencil className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!myEntry ? (
            <p className="text-sm text-muted-foreground">Fill in your Monday commitment first.</p>
          ) : editingReflection ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Did you achieve what you committed to?</Label>
                <div className="flex gap-2 flex-wrap">
                  {achievedOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setAchieved(opt.value)}
                      className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                        achieved === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>What actually happened? <span className="text-muted-foreground font-normal">(reflection)</span></Label>
                <Textarea value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Be honest — wins, surprises, challenges…" rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label>What slowed you down? <span className="text-muted-foreground font-normal">(blocker)</span></Label>
                <Textarea value={blocker} onChange={(e) => setBlocker(e.target.value)} placeholder="What got in the way?" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>What would you do differently next week?</Label>
                <Textarea value={adjustments} onChange={(e) => setAdjustments(e.target.value)} placeholder="One thing to adjust…" rows={2} />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => saveReflection.mutate()} disabled={!achieved || saveReflection.isPending} size="sm">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Save reflection
                </Button>
                {myReflection && (
                  <Button variant="ghost" size="sm" onClick={() => setEditingReflection(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ) : myReflection ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AchievedBadge achieved={myReflection.achieved} />
                <span className="text-xs text-muted-foreground">
                  Score: {scoreFromAchieved(myReflection.achieved)}/1
                </span>
              </div>
              {myReflection.reflection && <p className="text-sm text-muted-foreground">{myReflection.reflection}</p>}
              {myReflection.adjustments && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Next week I'll</p>
                  <p className="text-sm text-muted-foreground italic">{myReflection.adjustments}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Fill this in on Sunday before the next session.</p>
              <Button variant="outline" size="sm" onClick={() => setEditingReflection(true)}>
                Fill in reflection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Group this week */}
      {otherMembers.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">The group this week</h3>
          <div className="space-y-2">
            {otherMembers.map((member) => (
              <Collapsible key={member.user_id}>
                <Card className="border-border/60">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-0 pt-3 px-4 cursor-pointer hover:bg-muted/20 transition-colors">
                      <div className="flex items-center justify-between pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">
                            {getInitials(member.full_name)}
                          </div>
                          <span className="text-sm font-medium">{member.full_name}</span>
                          {member.entry && (
                            <Badge variant="outline" className="text-xs">committed</Badge>
                          )}
                          {member.reflection && (
                            <AchievedBadge achieved={member.reflection.achieved} />
                          )}
                        </div>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 px-4 space-y-3">
                      {member.entry ? (
                        <>
                          <p className="text-sm">{member.entry.specific_goal}</p>
                          {member.entry.measurable && (
                            <p className="text-xs text-muted-foreground italic">{member.entry.measurable}</p>
                          )}
                          {member.reflection && (
                            <div className="pt-2 border-t border-border/50 space-y-1">
                              <AchievedBadge achieved={member.reflection.achieved} />
                              {member.reflection.reflection && (
                                <p className="text-xs text-muted-foreground">{member.reflection.reflection}</p>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">No commitment set yet.</p>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
