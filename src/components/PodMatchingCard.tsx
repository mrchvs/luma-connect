import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  UsersRound,
  Target,
  Rocket,
  Lightbulb,
  Building2,
  ChevronRight,
  Calendar,
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

type PodPreference = "stage" | "focus";

export function PodMatchingCard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [podPreference, setPodPreference] = useState<PodPreference>("stage");
  const [selectedStage, setSelectedStage] = useState<string>(profile?.current_stage || "building");
  const [selectedFocus, setSelectedFocus] = useState<string>("product_development");

  // Fetch current pod preferences
  const { data: preferences } = useQuery({
    queryKey: ["matching-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("matching_preferences")
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
      
      // Filter to only active pods
      return (data || []).filter((pm: any) => pm.pod?.status === "active");
    },
    enabled: !!user,
  });

  const updatePodPreferencesMutation = useMutation({
    mutationFn: async (optIn: boolean) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("matching_preferences")
        .upsert({
          user_id: user.id,
          opt_in_pods: optIn,
          pod_preference: optIn ? (podPreference === "stage" ? selectedStage : selectedFocus) : null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matching-preferences"] });
      setDialogOpen(false);
      toast({
        title: preferences?.opt_in_pods ? "Pod preferences updated" : "You're in the pod matching pool!",
        description: "We'll notify you when a matching pod is forming.",
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

  const isOptedIn = preferences?.opt_in_pods;
  const hasActivePod = activePods && activePods.length > 0;

  const getPodInfo = () => {
    if (!hasActivePod) return null;
    const pod = (activePods[0] as any).pod;
    return pod;
  };

  const activePod = getPodInfo();

  return (
    <Card className="mb-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <UsersRound className="w-5 h-5 text-primary" />
          <CardTitle className="font-display text-lg">Small-Group Pods</CardTitle>
        </div>
        <CardDescription>
          Join 4-6 peers for a month of focused support
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasActivePod && activePod ? (
          <div className="bg-primary/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                Active Pod
              </Badge>
            </div>
            <p className="text-sm font-medium">{activePod.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {activePod.focus_type === "stage" ? "Stage" : "Focus"}: {activePod.focus_value?.replace("_", " ")}
            </p>
            {activePod.weekly_prompt && (
              <div className="mt-3 p-2 bg-background rounded border">
                <p className="text-xs text-muted-foreground">This week's prompt:</p>
                <p className="text-sm mt-1">{activePod.weekly_prompt}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Ends {new Date(activePod.ends_at).toLocaleDateString()}
            </p>
          </div>
        ) : isOptedIn ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">You're in the pod matching pool</p>
              <p className="text-xs text-muted-foreground mt-1">
                Preference: {preferences?.pod_preference?.replace("_", " ")}
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Edit preferences
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Update Pod Preferences</DialogTitle>
                  <DialogDescription>
                    Adjust how you'd like to be matched into a pod
                  </DialogDescription>
                </DialogHeader>
                <PodPreferencesForm
                  podPreference={podPreference}
                  setPodPreference={setPodPreference}
                  selectedStage={selectedStage}
                  setSelectedStage={setSelectedStage}
                  selectedFocus={selectedFocus}
                  setSelectedFocus={setSelectedFocus}
                  onSubmit={() => updatePodPreferencesMutation.mutate(true)}
                  onOptOut={() => updatePodPreferencesMutation.mutate(false)}
                  isLoading={updatePodPreferencesMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Target className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs font-medium">By Stage</p>
                <p className="text-xs text-muted-foreground">Same journey phase</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Lightbulb className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs font-medium">By Focus</p>
                <p className="text-xs text-muted-foreground">Shared priority</p>
              </div>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  Join a pod
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Join a Small-Group Pod</DialogTitle>
                  <DialogDescription>
                    Pods are 4-6 peers who meet for 1 month with light structure
                  </DialogDescription>
                </DialogHeader>
                <PodPreferencesForm
                  podPreference={podPreference}
                  setPodPreference={setPodPreference}
                  selectedStage={selectedStage}
                  setSelectedStage={setSelectedStage}
                  selectedFocus={selectedFocus}
                  setSelectedFocus={setSelectedFocus}
                  onSubmit={() => updatePodPreferencesMutation.mutate(true)}
                  isLoading={updatePodPreferencesMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PodPreferencesForm({
  podPreference,
  setPodPreference,
  selectedStage,
  setSelectedStage,
  selectedFocus,
  setSelectedFocus,
  onSubmit,
  onOptOut,
  isLoading,
}: {
  podPreference: PodPreference;
  setPodPreference: (v: PodPreference) => void;
  selectedStage: string;
  setSelectedStage: (v: string) => void;
  selectedFocus: string;
  setSelectedFocus: (v: string) => void;
  onSubmit: () => void;
  onOptOut?: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-6 py-4">
      <div className="space-y-3">
        <Label>How would you like to be grouped?</Label>
        <RadioGroup 
          value={podPreference} 
          onValueChange={(v) => setPodPreference(v as PodPreference)}
          className="grid grid-cols-2 gap-2"
        >
          <div
            className={`text-center p-3 rounded-lg border cursor-pointer transition-colors ${
              podPreference === "stage" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
            }`}
            onClick={() => setPodPreference("stage")}
          >
            <RadioGroupItem value="stage" id="pref-stage" className="sr-only" />
            <Target className="w-5 h-5 mx-auto mb-1" />
            <Label htmlFor="pref-stage" className="cursor-pointer text-sm font-medium">
              By Stage
            </Label>
            <p className="text-xs text-muted-foreground">Same journey phase</p>
          </div>
          <div
            className={`text-center p-3 rounded-lg border cursor-pointer transition-colors ${
              podPreference === "focus" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
            }`}
            onClick={() => setPodPreference("focus")}
          >
            <RadioGroupItem value="focus" id="pref-focus" className="sr-only" />
            <Lightbulb className="w-5 h-5 mx-auto mb-1" />
            <Label htmlFor="pref-focus" className="cursor-pointer text-sm font-medium">
              By Focus
            </Label>
            <p className="text-xs text-muted-foreground">Shared priority</p>
          </div>
        </RadioGroup>
      </div>

      {podPreference === "stage" ? (
        <div className="space-y-3">
          <Label>Select your current stage</Label>
          <RadioGroup value={selectedStage} onValueChange={setSelectedStage}>
            {STAGE_OPTIONS.map((stage) => (
              <div
                key={stage.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedStage === stage.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedStage(stage.value)}
              >
                <RadioGroupItem value={stage.value} id={stage.value} />
                <div className="flex-1">
                  <Label htmlFor={stage.value} className="cursor-pointer font-medium">
                    {stage.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{stage.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>
      ) : (
        <div className="space-y-3">
          <Label>Select your current focus</Label>
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
                  <RadioGroupItem value={focus.value} id={focus.value} />
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor={focus.value} className="cursor-pointer font-medium flex-1">
                    {focus.label}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">
          <strong>What to expect:</strong> 4-6 members, 1 month commitment, 1 prompt/week to keep conversations flowing. No open chat — just structured touchpoints.
        </p>
      </div>

      <div className="flex gap-2">
        {onOptOut && (
          <Button variant="outline" onClick={onOptOut} disabled={isLoading} className="flex-1">
            Opt out
          </Button>
        )}
        <Button onClick={onSubmit} disabled={isLoading} className="flex-1">
          {isLoading ? "Saving..." : "Join matching pool"}
        </Button>
      </div>
    </div>
  );
}
