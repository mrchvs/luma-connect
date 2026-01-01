import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { MainNav } from "@/components/MainNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  CheckCircle2, 
  MessageSquare, 
  HandHeart, 
  Calendar, 
  FileText,
  Activity as ActivityIcon
} from "lucide-react";

const eventConfig: Record<string, { icon: typeof User; label: string; color: string }> = {
  profile_submitted: { icon: FileText, label: "Profile submitted", color: "text-primary" },
  profile_approved: { icon: CheckCircle2, label: "Profile approved", color: "text-success" },
  request_created: { icon: MessageSquare, label: "Posted an ask", color: "text-primary" },
  intro_requested: { icon: HandHeart, label: "Requested intro", color: "text-secondary" },
  intro_accepted: { icon: CheckCircle2, label: "Accepted intro request", color: "text-success" },
  intro_declined: { icon: User, label: "Declined intro request", color: "text-muted-foreground" },
  timeslot_proposed: { icon: Calendar, label: "Proposed meeting time", color: "text-primary" },
  timeslot_accepted: { icon: CheckCircle2, label: "Confirmed meeting", color: "text-success" },
};

export default function Activity() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const { data: activities, isLoading } = useQuery({
    queryKey: ["user-activity", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_events")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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

  return (
    <div className="min-h-screen gradient-hero">
      <MainNav />

      <main className="container py-8 px-4 max-w-2xl">
        <div className="mb-8 animate-slide-up">
          <h1 className="font-display text-3xl font-semibold mb-2">Your Activity</h1>
          <p className="text-muted-foreground">
            A timeline of your actions on Luma Circle
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const config = eventConfig[activity.event_type] || {
                  icon: ActivityIcon,
                  label: activity.event_type,
                  color: "text-muted-foreground",
                };
                const Icon = config.icon;

                return (
                  <div 
                    key={activity.id} 
                    className="relative flex gap-4 animate-slide-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center ${config.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <Card className="flex-1 shadow-card">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm">{config.label}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {activity.entity_type && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            {activity.entity_type}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <ActivityIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg font-medium mb-2">No activity yet</h3>
              <p className="text-muted-foreground">
                Your activity will appear here as you use Luma Circle.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
