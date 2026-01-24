import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { MainNav } from "@/components/MainNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  UsersRound,
  Target,
  Lightbulb,
  Calendar,
  Clock,
  CheckCircle2,
  Users,
  ArrowRight,
} from "lucide-react";

// Canonical taxonomy - must match DB values
const STAGE_OPTIONS = [
  { value: "exploring", label: "Exploring" },
  { value: "building", label: "Building" },
  { value: "growing", label: "Growing" },
  { value: "established", label: "Established" },
];

const FOCUS_AREA_OPTIONS = [
  { value: "product", label: "Product" },
  { value: "go_to_market", label: "Go-to-Market" },
  { value: "growth_marketing", label: "Growth & Marketing" },
  { value: "fundraising", label: "Fundraising" },
  { value: "operations_scale", label: "Operations & Scale" },
];

const POD_LIFECYCLE = [
  { week: "Week 1", title: "Alignment", description: "Get to know your pod members and set intentions" },
  { week: "Weeks 2-3", title: "Execution", description: "Weekly prompts keep conversations focused and productive" },
  { week: "Week 4", title: "Reflection", description: "Celebrate wins, share learnings, decide what's next" },
];

export default function Pods() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch open pods
  const { data: openPods, isLoading: podsLoading } = useQuery({
    queryKey: ["open-pods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pods")
        .select("*")
        .eq("is_open", true)
        .eq("status", "active")
        .order("started_at", { ascending: true });

      if (error) throw error;

      // Get member counts
      const podIds = data?.map(p => p.id) || [];
      const { data: members } = await supabase
        .from("pod_members")
        .select("pod_id")
        .in("pod_id", podIds);

      const memberCounts = new Map<string, number>();
      members?.forEach(m => {
        memberCounts.set(m.pod_id, (memberCounts.get(m.pod_id) || 0) + 1);
      });

      return data?.map(pod => ({
        ...pod,
        member_count: memberCounts.get(pod.id) || 0,
        spots_left: (pod.max_members || 6) - (memberCounts.get(pod.id) || 0),
      })) || [];
    },
    enabled: !!user,
  });

  // Fetch user's applications
  const { data: myApplications } = useQuery({
    queryKey: ["my-pod-applications", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("pod_applications")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data || [];
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

  // Apply to pod mutation
  const applyMutation = useMutation({
    mutationFn: async (podId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("pod_applications")
        .insert({
          pod_id: podId,
          user_id: user.id,
          status: "pending",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-pod-applications"] });
      toast({
        title: "Application submitted!",
        description: "You'll be notified when the admin reviews your application.",
      });
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast({
          title: "Already applied",
          description: "You've already applied to this pod.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  // Withdraw application mutation
  const withdrawMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from("pod_applications")
        .delete()
        .eq("id", applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-pod-applications"] });
      toast({ title: "Application withdrawn" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const hasActivePod = activePods && activePods.length > 0;
  const activePod = hasActivePod ? (activePods[0] as any).pod : null;

  const getApplicationForPod = (podId: string) => {
    return myApplications?.find(a => a.pod_id === podId);
  };

  const getFocusValueLabel = (type: string, value: string | null) => {
    if (!value) return "";
    if (type === "stage") {
      return STAGE_OPTIONS.find(s => s.value === value)?.label || value;
    }
    return FOCUS_AREA_OPTIONS.find(f => f.value === value)?.label || value.replace("_", " ");
  };

  if (loading || podsLoading) {
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

        {/* Active Pod - Your Pod */}
        {hasActivePod && activePod && (
          <Card className="mb-6 border-primary/20 animate-slide-up">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Your Active Pod
                </Badge>
              </div>
              <CardTitle className="font-display text-xl">{activePod.name}</CardTitle>
              <CardDescription>
                {activePod.focus_type === "stage" ? "Journey Pod" : "Focus Pod"} · {getFocusValueLabel(activePod.focus_type, activePod.focus_value)}
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
              <Button asChild className="w-full">
                <Link to="/inbox">
                  Go to your pod
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* What is a Pod */}
        <Card className="mb-6 animate-slide-up" style={{ animationDelay: "0.05s" }}>
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

        {/* Pod Types Explanation */}
        <Card className="mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle className="font-display text-lg">Pod Types</CardTitle>
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
                  {FOCUS_AREA_OPTIONS.map((focus) => (
                    <Badge key={focus.value} variant="outline" className="text-xs">
                      {focus.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Open Pods */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: "0.15s" }}>
          <h2 className="font-display text-xl font-semibold mb-4">Open Pods</h2>
          
          {!openPods?.length ? (
            <Card>
              <CardContent className="py-8 text-center">
                <UsersRound className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No pods open right now</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  New pods are created regularly. Check back soon or reach out to the community admin.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {openPods.map((pod) => {
                const application = getApplicationForPod(pod.id);
                const isApplied = !!application;
                const isPending = application?.status === "pending";
                const isApproved = application?.status === "approved";
                const isFull = pod.spots_left <= 0;
                const isMember = activePods?.some((ap: any) => ap.pod?.id === pod.id);

                return (
                  <Card key={pod.id} className="overflow-hidden">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-display font-medium">{pod.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {pod.focus_type === "stage" ? "Journey" : "Focus"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {getFocusValueLabel(pod.focus_type, pod.focus_value)}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Starts {new Date(pod.started_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {pod.spots_left > 0 ? `${pod.spots_left} spots left` : "Full"}
                            </span>
                          </div>
                        </div>

                        {/* CTA based on state */}
                        <div className="flex-shrink-0">
                          {isMember ? (
                            <Button asChild>
                              <Link to="/inbox">
                                Go to your pod
                                <ArrowRight className="w-4 h-4 ml-2" />
                              </Link>
                            </Button>
                          ) : isPending ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="gap-1">
                                <Clock className="w-3 h-3" />
                                Application pending
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => withdrawMutation.mutate(application.id)}
                              >
                                Withdraw
                              </Button>
                            </div>
                          ) : isApproved ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </Badge>
                          ) : isFull ? (
                            <Badge variant="secondary">Full</Badge>
                          ) : (
                            <Button
                              onClick={() => applyMutation.mutate(pod.id)}
                              disabled={applyMutation.isPending}
                            >
                              Apply to this pod
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
