import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Calendar, Clock, ExternalLink } from "lucide-react";
import { format, formatDistanceToNow, addHours } from "date-fns";

export function UpcomingCalls() {
  const { user } = useAuth();

  const { data: upcomingCalls, isLoading } = useQuery({
    queryKey: ["upcoming-calls", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get accepted time slots for the user's intro requests
      const { data: timeSlots, error } = await supabase
        .from("proposed_time_slots")
        .select(`
          id, start_time, duration_minutes, status, intro_request_id,
          intro_requests!inner(
            id, requester_id, helper_id,
            requester:requester_id(user_id:user_id, full_name, avatar_url),
            helper:helper_id(user_id:user_id, full_name, avatar_url)
          )
        `)
        .eq("status", "accepted")
        .gte("start_time", new Date().toISOString())
        .or(`intro_requests.requester_id.eq.${user.id},intro_requests.helper_id.eq.${user.id}`)
        .order("start_time", { ascending: true })
        .limit(3);

      if (error) throw error;
      return timeSlots || [];
    },
    enabled: !!user,
  });

  const hasCalls = upcomingCalls && upcomingCalls.length > 0;

  if (isLoading) {
    return null;
  }

  if (!hasCalls) {
    return (
      <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Upcoming Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No upcoming calls</p>
            <p className="text-xs text-muted-foreground mt-1">
              Scheduled calls will appear here with one-click access.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="animate-slide-up border-primary/20" 
      style={{ animationDelay: "0.2s" }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          Upcoming Calls
          <Badge variant="secondary" className="text-xs ml-auto">
            {upcomingCalls.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingCalls.map((call: any) => {
          const introRequest = call.intro_requests;
          const isRequester = introRequest?.requester_id === user?.id;
          const partner = isRequester 
            ? (introRequest?.helper as any)
            : (introRequest?.requester as any);

          const callTime = new Date(call.start_time);
          const now = new Date();
          const isWithin24h = callTime > now && callTime <= addHours(now, 24);

          return (
            <div 
              key={call.id} 
              className={`p-3 rounded-lg border ${isWithin24h ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/20"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    Call with {partner?.full_name?.split(" ")[0] || "Member"}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{format(callTime, "EEE, MMM d")}</span>
                    <Clock className="w-3 h-3 ml-1" />
                    <span>{format(callTime, "h:mm a")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(callTime, { addSuffix: true })}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {call.duration_minutes}min
                </Badge>
              </div>
              <div className="mt-3">
                <Button 
                  variant={isWithin24h ? "default" : "outline"} 
                  size="sm" 
                  asChild 
                  className="w-full"
                >
                  <Link to={`/connections/${introRequest?.id}`}>
                    {isWithin24h ? "Join call" : "View details"}
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
