import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Target, CheckCircle2, Pencil } from "lucide-react";

interface MonthlyGoal {
  id: string;
  monthly_goal: string;
  success_metric: string | null;
}

interface Props {
  cycleId: string;
  userId: string;
  existing: MonthlyGoal | null;
  otherGoals: Array<{
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    monthly_goal: string;
    success_metric: string | null;
  }>;
}

export function AccountabilityGoalSetup({ cycleId, userId, existing, otherGoals }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(!existing);
  const [goal, setGoal] = useState(existing?.monthly_goal ?? "");
  const [metric, setMetric] = useState(existing?.success_metric ?? "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (existing) {
        const { error } = await supabase
          .from("accountability_monthly_goals")
          .update({ monthly_goal: goal, success_metric: metric, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("accountability_monthly_goals")
          .insert({ cycle_id: cycleId, user_id: userId, monthly_goal: goal, success_metric: metric });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Monthly goal saved!");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["accountability"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to save goal"),
  });

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Your goal */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Your monthly goal
            </CardTitle>
            {existing && !editing && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>What's the one thing you want to achieve this month?</Label>
                <Textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Launch my new service offering…"
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>How will you know you've achieved it?</Label>
                <Textarea
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  placeholder="e.g. Pricing page is live AND 2 discovery calls booked"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={!goal.trim() || saveMutation.isPending}
                  size="sm"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Save goal
                </Button>
                {existing && (
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setGoal(existing.monthly_goal); setMetric(existing.success_metric ?? ""); }}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">{existing?.monthly_goal}</p>
              {existing?.success_metric && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Success metric</p>
                  <p className="text-sm text-muted-foreground">{existing.success_metric}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Group goals */}
      {otherGoals.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">The group's goals this month</h3>
          <div className="space-y-3">
            {otherGoals.map((og) => (
              <Card key={og.user_id} className="border-border/60">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">
                      {getInitials(og.full_name)}
                    </div>
                    <div className="min-w-0 space-y-2">
                      <p className="text-sm font-medium">{og.full_name}</p>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">Monthly goal</p>
                        <p className="text-sm text-muted-foreground">{og.monthly_goal}</p>
                      </div>
                      {og.success_metric && (
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-0.5">Success metric</p>
                          <p className="text-xs text-muted-foreground">{og.success_metric}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
