import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Video, Clock, ArrowRight, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ConnectionRequest {
  id: string;
  type: "incoming" | "outgoing";
  status: "pending" | "accepted" | "declined";
  format: "async" | "short_call" | "long_call";
  created_at: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  has_scheduled_time: boolean;
  is_requester: boolean;
}

const formatIcons = {
  async: MessageCircle,
  short_call: Video,
  long_call: Video,
};

// Human-readable status with directional context
function getStatusInfo(request: ConnectionRequest): { 
  label: string; 
  sublabel: string; 
  action: string;
  actionVariant: "default" | "outline" | "secondary";
} {
  if (request.status === "pending") {
    if (request.type === "incoming") {
      return { 
        label: "Waiting for you", 
        sublabel: "Action needed",
        action: "Reply",
        actionVariant: "default"
      };
    }
    return { 
      label: "Waiting for reply", 
      sublabel: "No action needed",
      action: "View",
      actionVariant: "outline"
    };
  }
  
  if (request.status === "accepted") {
    if (request.format !== "async" && !request.has_scheduled_time) {
      return { 
        label: "Connected", 
        sublabel: "Schedule a time",
        action: "Pick a time",
        actionVariant: "default"
      };
    }
    if (request.has_scheduled_time) {
      return { 
        label: "Scheduled", 
        sublabel: "",
        action: "View details",
        actionVariant: "outline"
      };
    }
    return { 
      label: "Connected", 
      sublabel: "Async",
      action: "View",
      actionVariant: "outline"
    };
  }
  
  return { 
    label: "Not now", 
    sublabel: "",
    action: "View",
    actionVariant: "outline"
  };
}

export function ConnectionsSection() {
  const { user } = useAuth();

  const { data: connections, isLoading } = useQuery({
    queryKey: ["dashboard-connections", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch intro requests where user is involved
      const { data: requests, error } = await supabase
        .from("intro_requests")
        .select("*")
        .or(`requester_id.eq.${user.id},helper_id.eq.${user.id}`)
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      if (!requests?.length) return [];

      // Get all user IDs we need profiles for
      const userIds = new Set<string>();
      requests.forEach((r) => {
        if (r.requester_id !== user.id) userIds.add(r.requester_id);
        if (r.helper_id !== user.id) userIds.add(r.helper_id);
      });

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", Array.from(userIds));

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      // Check for scheduled time slots
      const requestIds = requests.map((r) => r.id);
      const { data: timeSlots } = await supabase
        .from("proposed_time_slots")
        .select("intro_request_id, status")
        .in("intro_request_id", requestIds)
        .eq("status", "accepted");

      const scheduledRequestIds = new Set(timeSlots?.map((t) => t.intro_request_id) || []);

      // Map to connection format
      return requests.map((r): ConnectionRequest => {
        const isRequester = r.requester_id === user.id;
        const otherUserId = isRequester ? r.helper_id : r.requester_id;
        const otherProfile = profileMap.get(otherUserId);

        return {
          id: r.id,
          type: isRequester ? "outgoing" : "incoming",
          status: r.status as "pending" | "accepted" | "declined",
          format: r.format as "async" | "short_call" | "long_call",
          created_at: r.created_at || "",
          other_user_id: otherUserId,
          other_user_name: otherProfile?.full_name?.split(" ")[0] || "Member",
          other_user_avatar: otherProfile?.avatar_url || null,
          has_scheduled_time: scheduledRequestIds.has(r.id),
          is_requester: isRequester,
        };
      }).filter((c) => c.status !== "declined").slice(0, 3);
    },
    enabled: !!user,
  });

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  if (isLoading) {
    return (
      <Card className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!connections || connections.length === 0) {
    return (
      <Card className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Connections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No connections yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              When someone responds to your ask or sends you a request, it will appear here.
            </p>
            <Button variant="link" asChild className="mt-2">
              <Link to="/members">Find members to connect with</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          Connections
        </CardTitle>
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link to="/connections" className="flex items-center gap-1">
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {connections.map((connection) => {
          const statusInfo = getStatusInfo(connection);
          const FormatIcon = formatIcons[connection.format];

          return (
            <Link
              key={connection.id}
              to="/connections"
              className="block p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border border-border/50">
                  <AvatarImage src={connection.other_user_avatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(connection.other_user_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">
                      {connection.other_user_name}
                    </p>
                    <FormatIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge 
                      variant={connection.status === "pending" && connection.type === "incoming" ? "default" : "secondary"} 
                      className="text-xs h-5"
                    >
                      {statusInfo.label}
                    </Badge>
                    {statusInfo.sublabel && (
                      <span className="text-xs text-muted-foreground">
                        {statusInfo.sublabel}
                      </span>
                    )}
                  </div>
                </div>

                <Button 
                  variant={statusInfo.actionVariant} 
                  size="sm"
                  className="flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                  asChild
                >
                  <span>{statusInfo.action}</span>
                </Button>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
