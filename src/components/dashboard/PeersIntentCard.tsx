import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UsersRound,
  ArrowRight,
  Clock,
  CheckCircle2,
  Users,
  Calendar,
} from "lucide-react";

export function PeersIntentCard() {
  const { user, profile } = useAuth();

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
            ends_at
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || []).filter((pm: any) => pm.pod?.status === "active");
    },
    enabled: !!user,
  });

  // Fetch pending applications
  const { data: pendingApplications } = useQuery({
    queryKey: ["my-pod-applications", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("pod_applications")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch open journey pods (stage-based)
  const { data: openJourneyPods } = useQuery({
    queryKey: ["open-journey-pods", profile?.current_stage],
    queryFn: async () => {
      const query = supabase
        .from("pods")
        .select("*")
        .eq("is_open", true)
        .eq("status", "active")
        .eq("focus_type", "stage");

      // Optionally filter by user's current stage
      if (profile?.current_stage) {
        query.eq("focus_value", profile.current_stage);
      }

      const { data, error } = await query.limit(3);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const hasActivePod = activePods && activePods.length > 0;
  const hasPendingApplication = pendingApplications && pendingApplications.length > 0;
  const activePod = hasActivePod ? (activePods[0] as any).pod : null;

  return (
    <Card className="ring-2 ring-primary/20 animate-slide-up">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <UsersRound className="w-5 h-5 text-primary" />
          <CardTitle className="font-display text-lg">Meet Peers at Your Stage</CardTitle>
        </div>
        <CardDescription>
          Join a Journey Pod to connect with founders in similar phases
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasActivePod && activePod ? (
          // Active pod - go to pod CTA
          <div className="bg-primary/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-primary/20 text-primary gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Active Pod
              </Badge>
            </div>
            <p className="text-sm font-medium">{activePod.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {activePod.focus_value?.replace("_", " ")} stage
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Ends {new Date(activePod.ends_at).toLocaleDateString()}
            </p>
            <Button asChild className="w-full mt-3">
              <Link to="/inbox">
                Go to your pod
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        ) : hasPendingApplication ? (
          // Application pending
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3" />
                  Application pending
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                You'll be notified when the admin reviews your application.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/pods">View your applications</Link>
            </Button>
          </div>
        ) : openJourneyPods && openJourneyPods.length > 0 ? (
          // Open pods available - apply CTA
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {openJourneyPods.length} Journey Pod{openJourneyPods.length > 1 ? "s" : ""} open for your stage
            </p>
            <Button asChild className="w-full gap-2">
              <Link to="/pods">
                Apply to a Journey Pod
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              <Link to="/people" className="underline hover:text-foreground">
                Or browse members directly
              </Link>
            </p>
          </div>
        ) : (
          // No pods available - browse pods page
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Journey Pods group founders at the same stage for a month of mutual support.
            </p>
            <Button asChild className="w-full gap-2">
              <Link to="/pods">
                Browse open pods
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              <Link to="/people" className="underline hover:text-foreground">
                Or browse members directly
              </Link>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
