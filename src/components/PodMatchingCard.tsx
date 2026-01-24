import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UsersRound,
  Target,
  Lightbulb,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle2,
} from "lucide-react";

export function PodMatchingCard() {
  const { user } = useAuth();

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
            weekly_prompt
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

  const hasActivePod = activePods && activePods.length > 0;
  const hasPendingApplication = pendingApplications && pendingApplications.length > 0;
  const activePod = hasActivePod ? (activePods[0] as any).pod : null;

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
          // Active pod state - clear CTA
          <div className="bg-primary/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-primary/20 text-primary gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Active Pod
              </Badge>
            </div>
            <p className="text-sm font-medium">{activePod.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {activePod.focus_type === "stage" ? "Journey" : "Focus"}: {activePod.focus_value?.replace("_", " ")}
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
            <Button asChild className="w-full mt-3">
              <Link to="/inbox">
                Go to your pod
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        ) : hasPendingApplication ? (
          // Pending application state
          <div className="flex items-center justify-between">
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
            <Button variant="outline" size="sm" asChild>
              <Link to="/pods">View pods</Link>
            </Button>
          </div>
        ) : (
          // Not joined - browse pods CTA
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Target className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs font-medium">Journey Pods</p>
                <p className="text-xs text-muted-foreground">By stage</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Lightbulb className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs font-medium">Focus Pods</p>
                <p className="text-xs text-muted-foreground">By priority</p>
              </div>
            </div>
            
            <Button asChild className="w-full gap-2">
              <Link to="/pods">
                Browse open pods
                <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
