import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { MainNav } from "@/components/MainNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UsersRound,
  Target,
  Lightbulb,
  Rocket,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  Users,
} from "lucide-react";

const STAGE_OPTIONS = [
  { value: "exploring", label: "Exploring", description: "Figuring out what's next" },
  { value: "building", label: "Building", description: "Creating something new" },
  { value: "growing", label: "Growing", description: "Scaling and expanding" },
  { value: "established", label: "Established", description: "Running a mature business" },
];

const FOCUS_OPTIONS = [
  { value: "product_development", label: "Product Development", icon: Lightbulb },
  { value: "go_to_market", label: "Go-to-Market", icon: Rocket },
  { value: "fundraising", label: "Fundraising", icon: Target },
  { value: "operations", label: "Operations & Scale", icon: Building2 },
];

const POD_LIFECYCLE = [
  { week: "Week 1", title: "Alignment", description: "Get to know your pod members and set intentions" },
  { week: "Weeks 2-3", title: "Execution", description: "Weekly prompts keep conversations focused and productive" },
  { week: "Week 4", title: "Reflection", description: "Celebrate wins, share learnings, decide what's next" },
];

type GroupingType = "stage" | "focus";

export default function Pods() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [groupingType, setGroupingType] = useState<GroupingType>("stage");
  const [selectedStage, setSelectedStage] = useState<string>(profile?.current_stage || "building");
  const [selectedFocus, setSelectedFocus] = useState<string>("product_development");

  // Fetch user's pod preferences
  const { data: podPreference } = useQuery({
    queryKey: ["pod-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("pod_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch active pod memberships
  const { data: activePods } = useQuery({
    queryKey: ["pod-memberships", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("pod_members")
        .select(`
          id,
          joined_at,
          pod:pods (
            id,
            name,
            focus_type,
            focus_value,
            status,
            started_at,
            ends_at,
            weekly_prompt,
            max_members
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      
      return (data || []).filter((pm: any) => pm.pod?.status === "active");
    },
    enabled: !!user,
  });

  // Join pod matching pool
  const joinPoolMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const preferenceData = {
        user_id: user.id,
        grouping_type: groupingType,
        stage: groupingType === "stage" ? selectedStage : null,
        focus: groupingType === "focus" ? selectedFocus : null,
      };

      const { error } = await supabase
        .from("pod_preferences")
        .upsert(preferenceData, { onConflict: "user_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pod-preferences"] });
      setDialogOpen(false);
      toast({
        title: "You're in the pod pool!",
        description: "We'll match you as soon as a group forms.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Leave pod matching pool
  const leavePoolMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("pod_preferences")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pod-preferences"] });
      setDialogOpen(false);
      toast({
        title: "Left the pod pool",
        description: "You can rejoin anytime.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const hasActivePod = activePods && activePods.length > 0;
  const isInPool = !!podPreference;
  const activePod = hasActivePod ? (activePods[0] as any).pod : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (profile?.status !== "approved") {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen gradient-hero">
      <MainNav />

      <main className="container py-8 px-4 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UsersRound className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-semibold">Small-Group Pods</h1>
          </div>
          <p className="text-muted-foreground">
            Join 4-6 peers for a month of focused support and accountability
          </p>
        </div>

        {/* Active Pod */}
        {hasActivePod && activePod && (
          <Card className="mb-6 border-primary/20 animate-slide-up">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Active Pod
                </Badge>
              </div>
              <CardTitle className="font-display text-xl">{activePod.name}</CardTitle>
              <CardDescription>
                {activePod.focus_type === "stage" ? "Journey Pod" : "Focus Pod"} · {activePod.focus_value?.replace("_", " ")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activePod.weekly_prompt && (
                <div className="p-4 bg-primary/5 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">This week's prompt</p>
                  <p className="text-sm font-medium">{activePod.weekly_prompt}</p>
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Started {new Date(activePod.started_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Ends {new Date(activePod.ends_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* In Pool State */}
        {isInPool && !hasActivePod && (
          <Card className="mb-6 border-secondary/30 animate-slide-up">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">You're in the pod pool</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Preference: {podPreference.grouping_type === "stage" ? "Journey Pod" : "Focus Pod"} · {" "}
                    {(podPreference.stage || podPreference.focus)?.replace("_", " ")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    We'll match you as soon as a group forms. This usually takes 1-2 weeks.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* What is a Pod */}
        <Card className="mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle className="font-display text-lg">What is a Pod?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A pod is a small group of 4-6 members who commit to supporting each other for one month. 
              It's not an open chat — it's structured, intentional, and time-bound.
            </p>
            
            <div className="grid gap-3">
              {POD_LIFECYCLE.map((phase, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    {phase.week}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{phase.title}</p>
                    <p className="text-xs text-muted-foreground">{phase.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pod Types */}
        <Card className="mb-6 animate-slide-up" style={{ animationDelay: "0.15s" }}>
          <CardHeader>
            <CardTitle className="font-display text-lg">Choose Your Pod Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-primary" />
                  <h4 className="font-medium">Journey Pods</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Grouped by your current stage. Connect with peers navigating similar phases.
                </p>
                <div className="flex flex-wrap gap-1">
                  {STAGE_OPTIONS.map((stage) => (
                    <Badge key={stage.value} variant="outline" className="text-xs">
                      {stage.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  <h4 className="font-medium">Focus Pods</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Grouped by shared priority. Deep-dive into a specific area together.
                </p>
                <div className="flex flex-wrap gap-1">
                  {FOCUS_OPTIONS.map((focus) => (
                    <Badge key={focus.value} variant="outline" className="text-xs">
                      {focus.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        {!hasActivePod && !isInPool && (
          <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <CardContent className="py-8 text-center">
              <UsersRound className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-display text-xl mb-2">Ready to join a pod?</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Tell us how you'd like to be matched and we'll find your group.
              </p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                Join the matching pool
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Pod Preferences Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isInPool ? "Update Pod Preferences" : "Join a Pod"}</DialogTitle>
            <DialogDescription>
              Choose how you'd like to be grouped
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Grouping Type */}
            <div className="space-y-3">
              <Label>Pod type</Label>
              <RadioGroup
                value={groupingType}
                onValueChange={(v) => setGroupingType(v as GroupingType)}
                className="grid grid-cols-2 gap-2"
              >
                <div
                  className={`text-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    groupingType === "stage" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                  onClick={() => setGroupingType("stage")}
                >
                  <RadioGroupItem value="stage" id="type-stage" className="sr-only" />
                  <Target className="w-5 h-5 mx-auto mb-1" />
                  <Label htmlFor="type-stage" className="cursor-pointer text-sm font-medium">
                    Journey Pod
                  </Label>
                  <p className="text-xs text-muted-foreground">By stage</p>
                </div>
                <div
                  className={`text-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    groupingType === "focus" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                  onClick={() => setGroupingType("focus")}
                >
                  <RadioGroupItem value="focus" id="type-focus" className="sr-only" />
                  <Lightbulb className="w-5 h-5 mx-auto mb-1" />
                  <Label htmlFor="type-focus" className="cursor-pointer text-sm font-medium">
                    Focus Pod
                  </Label>
                  <p className="text-xs text-muted-foreground">By priority</p>
                </div>
              </RadioGroup>
            </div>

            {/* Stage Selection */}
            {groupingType === "stage" && (
              <div className="space-y-3">
                <Label>Your current stage</Label>
                <RadioGroup value={selectedStage} onValueChange={setSelectedStage}>
                  {STAGE_OPTIONS.map((stage) => (
                    <div
                      key={stage.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedStage === stage.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedStage(stage.value)}
                    >
                      <RadioGroupItem value={stage.value} id={`stage-${stage.value}`} />
                      <div className="flex-1">
                        <Label htmlFor={`stage-${stage.value}`} className="cursor-pointer font-medium">
                          {stage.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{stage.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Focus Selection */}
            {groupingType === "focus" && (
              <div className="space-y-3">
                <Label>Your current focus</Label>
                <RadioGroup value={selectedFocus} onValueChange={setSelectedFocus}>
                  {FOCUS_OPTIONS.map((focus) => {
                    const Icon = focus.icon;
                    return (
                      <div
                        key={focus.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedFocus === focus.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedFocus(focus.value)}
                      >
                        <RadioGroupItem value={focus.value} id={`focus-${focus.value}`} />
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <Label htmlFor={`focus-${focus.value}`} className="cursor-pointer font-medium flex-1">
                          {focus.label}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                <strong>What to expect:</strong> 4-6 members, 1 month commitment, weekly prompts to keep conversations flowing.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {isInPool && (
                <Button
                  variant="outline"
                  onClick={() => leavePoolMutation.mutate()}
                  disabled={leavePoolMutation.isPending}
                  className="flex-1"
                >
                  Leave pool
                </Button>
              )}
              <Button
                onClick={() => joinPoolMutation.mutate()}
                disabled={joinPoolMutation.isPending}
                className="flex-1"
              >
                {joinPoolMutation.isPending ? "Saving..." : isInPool ? "Update preferences" : "Join matching pool"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
