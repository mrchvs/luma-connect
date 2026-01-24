import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
  MessageCircle,
  ArrowRight,
  Calendar,
  Clock,
  ChevronRight,
  HandshakeIcon,
  Brain,
  RefreshCw,
} from "lucide-react";

const MATCHING_MODES = [
  {
    value: "accountability_partner",
    label: "Accountability Partner",
    icon: HandshakeIcon,
    description: "Regular check-ins to keep each other on track",
  },
  {
    value: "thinking_buddy",
    label: "Thinking Buddy",
    icon: Brain,
    description: "Thought partner for exploring ideas together",
  },
  {
    value: "skill_swap",
    label: "Skill Swap",
    icon: RefreshCw,
    description: "Exchange expertise in different areas",
  },
];

const CADENCE_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
];

const DURATION_OPTIONS = [
  { value: 2, label: "2 weeks" },
  { value: 4, label: "4 weeks" },
];

const INTENTION_OPTIONS = [
  { value: "accountability", label: "Stay accountable on goals" },
  { value: "explore_ideas", label: "Explore and validate ideas" },
  { value: "learn_skill", label: "Learn a new skill" },
  { value: "get_feedback", label: "Get honest feedback" },
  { value: "expand_network", label: "Expand my network" },
];

export function FocusedChatsIntentCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string>("accountability_partner");
  const [cadence, setCadence] = useState<string>("weekly");
  const [duration, setDuration] = useState<number>(2);
  const [intention, setIntention] = useState<string>("accountability");

  // Fetch current matching preferences
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

  // Fetch active matches
  const { data: activeMatches } = useQuery({
    queryKey: ["structured-matches", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("structured_matches")
        .select(`
          id,
          match_type,
          cadence,
          status,
          started_at,
          ends_at,
          user_one,
          user_two
        `)
        .or(`user_one.eq.${user.id},user_two.eq.${user.id}`)
        .eq("status", "active");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch match partner profile
  const { data: matchPartner } = useQuery({
    queryKey: ["match-partner", activeMatches?.[0]?.id],
    queryFn: async () => {
      if (!activeMatches?.length || !user) return null;
      
      const match = activeMatches[0];
      const partnerId = match.user_one === user.id ? match.user_two : match.user_one;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", partnerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!activeMatches?.length && !!user,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (optIn: boolean) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("matching_preferences")
        .upsert({
          user_id: user.id,
          opt_in_1on1: optIn,
          matching_mode: optIn ? selectedMode : null,
          cadence: optIn ? cadence : null,
          duration_weeks: optIn ? duration : null,
          matching_intention: optIn ? intention : null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matching-preferences"] });
      setDialogOpen(false);
      toast({
        title: preferences?.opt_in_1on1 ? "Preferences updated" : "You're in the matching pool!",
        description: "We'll notify you when we find a great match.",
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

  const isOptedIn = preferences?.opt_in_1on1;
  const hasActiveMatch = activeMatches && activeMatches.length > 0;
  const activeMatch = hasActiveMatch ? activeMatches[0] : null;

  return (
    <Card className="ring-2 ring-primary/20 animate-slide-up">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <CardTitle className="font-display text-lg">Focused 1:1 Chats</CardTitle>
        </div>
        <CardDescription>
          Time-bound partnerships with clear intentions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasActiveMatch && activeMatch ? (
          // Active match - message CTA
          <div className="bg-primary/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                Active Match
              </Badge>
            </div>
            <p className="text-sm font-medium">
              {matchPartner?.full_name || "Your match"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeMatch.match_type.replace("_", " ")} · {activeMatch.cadence}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Ends {new Date(activeMatch.ends_at).toLocaleDateString()}
            </p>
            <Button asChild className="w-full mt-3">
              <Link to="/inbox">
                Message your match
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        ) : isOptedIn ? (
          // In pool - edit preferences CTA
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3" />
                  In matching pool
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {MATCHING_MODES.find(m => m.value === preferences?.matching_mode)?.label} · {preferences?.cadence}
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Edit preferences</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Update Matching Preferences</DialogTitle>
                  <DialogDescription>
                    Adjust your 1:1 matching settings
                  </DialogDescription>
                </DialogHeader>
                <MatchingPreferencesForm
                  selectedMode={selectedMode}
                  setSelectedMode={setSelectedMode}
                  cadence={cadence}
                  setCadence={setCadence}
                  duration={duration}
                  setDuration={setDuration}
                  intention={intention}
                  setIntention={setIntention}
                  onSubmit={() => updatePreferencesMutation.mutate(true)}
                  onOptOut={() => updatePreferencesMutation.mutate(false)}
                  isLoading={updatePreferencesMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          // Not joined - join matching CTA
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {MATCHING_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <div key={mode.value} className="text-center p-3 rounded-lg bg-muted/50">
                    <Icon className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs font-medium">{mode.label}</p>
                  </div>
                );
              })}
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2">
                  Join 1:1 matching
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Join 1:1 Matching</DialogTitle>
                  <DialogDescription>
                    Choose your matching style and commitment level
                  </DialogDescription>
                </DialogHeader>
                <MatchingPreferencesForm
                  selectedMode={selectedMode}
                  setSelectedMode={setSelectedMode}
                  cadence={cadence}
                  setCadence={setCadence}
                  duration={duration}
                  setDuration={setDuration}
                  intention={intention}
                  setIntention={setIntention}
                  onSubmit={() => updatePreferencesMutation.mutate(true)}
                  isLoading={updatePreferencesMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MatchingPreferencesForm({
  selectedMode,
  setSelectedMode,
  cadence,
  setCadence,
  duration,
  setDuration,
  intention,
  setIntention,
  onSubmit,
  onOptOut,
  isLoading,
}: {
  selectedMode: string;
  setSelectedMode: (v: string) => void;
  cadence: string;
  setCadence: (v: string) => void;
  duration: number;
  setDuration: (v: number) => void;
  intention: string;
  setIntention: (v: string) => void;
  onSubmit: () => void;
  onOptOut?: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-6 py-4">
      <div className="space-y-3">
        <Label>What kind of partnership?</Label>
        <RadioGroup value={selectedMode} onValueChange={setSelectedMode}>
          {MATCHING_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <div
                key={mode.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedMode === mode.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedMode(mode.value)}
              >
                <RadioGroupItem value={mode.value} id={mode.value} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor={mode.value} className="cursor-pointer flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {mode.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {mode.description}
                  </p>
                </div>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Cadence
          </Label>
          <RadioGroup value={cadence} onValueChange={setCadence} className="flex gap-2">
            {CADENCE_OPTIONS.map((option) => (
              <div
                key={option.value}
                className={`flex-1 text-center p-2 rounded-lg border cursor-pointer transition-colors ${
                  cadence === option.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
                onClick={() => setCadence(option.value)}
              >
                <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                <Label htmlFor={option.value} className="cursor-pointer text-sm">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Duration
          </Label>
          <RadioGroup value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))} className="flex gap-2">
            {DURATION_OPTIONS.map((option) => (
              <div
                key={option.value}
                className={`flex-1 text-center p-2 rounded-lg border cursor-pointer transition-colors ${
                  duration === option.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
                onClick={() => setDuration(option.value)}
              >
                <RadioGroupItem value={option.value.toString()} id={`dur-${option.value}`} className="sr-only" />
                <Label htmlFor={`dur-${option.value}`} className="cursor-pointer text-sm">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>

      <div className="space-y-3">
        <Label>What's your intention for this match?</Label>
        <RadioGroup value={intention} onValueChange={setIntention}>
          {INTENTION_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                intention === opt.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
              onClick={() => setIntention(opt.value)}
            >
              <RadioGroupItem value={opt.value} id={`int-${opt.value}`} />
              <Label htmlFor={`int-${opt.value}`} className="cursor-pointer text-sm flex-1">
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">
          <strong>Expectation:</strong> This is a {duration}-week {selectedMode.replace("_", " ")}. 
          Suggested cadence: 1 chat/{cadence === "weekly" ? "week" : "2 weeks"}.
        </p>
      </div>

      <div className="flex gap-2">
        {onOptOut && (
          <Button variant="outline" onClick={onOptOut} disabled={isLoading} className="flex-1">
            Opt out
          </Button>
        )}
        <Button onClick={onSubmit} disabled={isLoading} className="flex-1">
          {isLoading ? "Saving..." : "Save preferences"}
        </Button>
      </div>
    </div>
  );
}
