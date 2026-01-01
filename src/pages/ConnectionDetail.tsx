import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { MainNav } from "@/components/MainNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ConnectionNotes } from "@/components/ConnectionNotes";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TimeSlotProposer } from "@/components/TimeSlotProposer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  MessageCircle, 
  Video, 
  Clock, 
  Calendar,
  CheckCircle2,
  Bell,
  ExternalLink,
  ChevronDown,
  User
} from "lucide-react";
import { format, formatDistanceToNow, addHours } from "date-fns";

interface ConnectionData {
  id: string;
  status: "pending" | "accepted" | "declined";
  format: "async" | "short_call" | "long_call";
  message: string;
  expected_outcome: string | null;
  matching_tags: string[] | null;
  created_at: string;
  requester_id: string;
  helper_id: string;
  is_requester: boolean;
  other_user: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    short_bio: string | null;
    linkedin_url: string | null;
  } | null;
  scheduled_slot: {
    id: string;
    start_time: string;
    duration_minutes: number;
    status: string;
  } | null;
}

const formatIcons = {
  async: MessageCircle,
  short_call: Video,
  long_call: Video,
};

const formatLabels = {
  async: "Async",
  short_call: "Short Call",
  long_call: "Long Call",
};

export default function ConnectionDetail() {
  const { connectionId } = useParams<{ connectionId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: connection, isLoading, isFetched, refetch, error: queryError } = useQuery({
    queryKey: ["connection-detail", connectionId, user?.id],
    queryFn: async (): Promise<ConnectionData | null> => {
      if (!user || !connectionId) {
        return null;
      }

      const { data: request, error } = await supabase
        .from("intro_requests")
        .select("*")
        .eq("id", connectionId)
        .single();

      if (error) {
        console.error("Connection fetch error:", error);
        return null;
      }
      
      if (!request) {
        return null;
      }

      // Check user is part of this connection
      const isRequester = request.requester_id === user.id;
      const isHelper = request.helper_id === user.id;
      if (!isRequester && !isHelper) return null;
      const otherUserId = isRequester ? request.helper_id : request.requester_id;

      // Fetch other user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, short_bio, linkedin_url")
        .eq("user_id", otherUserId)
        .single();

      // Fetch scheduled time slot if any
      const { data: slots } = await supabase
        .from("proposed_time_slots")
        .select("id, start_time, duration_minutes, status")
        .eq("intro_request_id", connectionId)
        .eq("status", "accepted")
        .order("start_time", { ascending: true })
        .limit(1);

      return {
        id: request.id,
        status: request.status as "pending" | "accepted" | "declined",
        format: request.format as "async" | "short_call" | "long_call",
        message: request.message,
        expected_outcome: request.expected_outcome,
        matching_tags: request.matching_tags,
        created_at: request.created_at ?? new Date().toISOString(),
        requester_id: request.requester_id,
        helper_id: request.helper_id,
        is_requester: isRequester,
        other_user: profile,
        scheduled_slot: slots?.[0] || null,
      };
    },
    enabled: !!user && !!connectionId,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || (isLoading && !isFetched)) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!connection && isFetched) {
    return (
      <div className="min-h-screen gradient-hero">
        <MainNav />
        <main className="container py-8 px-4 max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="font-display text-xl font-medium mb-2">Connection not found</h2>
            <p className="text-muted-foreground mb-4">
              This connection may have been removed or you don't have access to it.
            </p>
            <Button asChild>
              <Link to="/connections">← Back to Connections</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  const FormatIcon = formatIcons[connection.format];
  const otherName = connection.other_user?.full_name || "Member";
  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  // Determine status and action
  const getStatusDetails = () => {
    if (connection.status === "pending") {
      if (connection.is_requester) {
        return {
          label: "Waiting for reply",
          sublabel: "We'll notify you when they respond",
          variant: "secondary" as const,
          showAction: false,
        };
      }
      return {
        label: "Waiting for you",
        sublabel: "They're waiting for your response",
        variant: "default" as const,
        showAction: true,
        actionType: "reply" as const,
      };
    }

    if (connection.status === "accepted") {
      if (connection.format === "async") {
        return {
          label: "Connected",
          sublabel: "You're connected async",
          variant: "secondary" as const,
          showAction: false,
        };
      }

      if (connection.scheduled_slot) {
        const callTime = new Date(connection.scheduled_slot.start_time);
        const now = new Date();
        const isWithin24h = callTime > now && callTime <= addHours(now, 24);

        return {
          label: "Scheduled",
          const safeCallLabel = !isNaN(callTime.getTime())
  ? format(callTime, "EEE, MMM d 'at' h:mm a")
  : "Time to be confirmed";

sublabel: safeCallLabel,
          variant: "secondary" as const,
          showAction: true,
          actionType: isWithin24h ? "join" as const : "view-call" as const,
          callTime,
        };
      }

      return {
        label: "Connected",
        sublabel: "Schedule a time to connect",
        variant: "default" as const,
        showAction: true,
        actionType: "schedule" as const,
      };
    }

    return {
      label: "Declined",
      sublabel: "This connection was not accepted",
      variant: "secondary" as const,
      showAction: false,
    };
  };

  const statusDetails = getStatusDetails();

  const updateMutation = useMutation({
    mutationFn: async ({ status }: { status: "accepted" | "declined" }) => {
      const { error } = await supabase
        .from("intro_requests")
        .update({ status })
        .eq("id", connection.id);
      if (error) throw error;

      // Send notification
      try {
        await supabase.functions.invoke("send-intro-notification", {
          body: { requestId: connection.id, type: status },
        });
      } catch (e) {
        console.error("Notification error:", e);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["connection-detail"] });
      queryClient.invalidateQueries({ queryKey: ["incoming-requests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-connections"] });
      
      if (variables.status === "declined") {
        navigate("/connections");
      } else {
        toast.success("Connection accepted!");
        refetch();
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update connection");
    },
  });

  const handleAccept = () => {
    updateMutation.mutate({ status: "accepted" });
  };

  const handleDecline = () => {
    updateMutation.mutate({ status: "declined" });
  };

  // Generate calendar link
  const getCalendarLink = (type: "google" | "outlook") => {
    if (!connection.scheduled_slot) return "#";
    const start = new Date(connection.scheduled_slot.start_time);
    const end = new Date(start.getTime() + connection.scheduled_slot.duration_minutes * 60000);
    const title = `Luma Circle: Call with ${otherName}`;
    
    if (type === "google") {
      const params = new URLSearchParams({
        action: "TEMPLATE",
        text: title,
        dates: `${start.toISOString().replace(/[-:]/g, "").split(".")[0]}Z/${end.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      });
      return `https://calendar.google.com/calendar/render?${params}`;
    }
    
    const params = new URLSearchParams({
      subject: title,
      startdt: start.toISOString(),
      enddt: end.toISOString(),
    });
    return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
  };

  // Check if needs scheduling (call format, accepted, no scheduled slot)
  const needsScheduling = 
    connection.status === "accepted" && 
    connection.format !== "async" && 
    !connection.scheduled_slot;

  return (
    <div className="min-h-screen gradient-hero">
      <MainNav />

      <main className="container py-8 px-4 max-w-2xl">
        {/* Back navigation */}
        <Button 
          variant="ghost" 
          size="sm" 
          asChild 
          className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <Link to="/connections">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Connections
          </Link>
        </Button>

        {/* Header Card */}
        <Card className="mb-6 animate-slide-up">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              <Link to={`/profile/${connection.other_user?.user_id}`}>
                <Avatar className="w-16 h-16 border-2 border-border cursor-pointer hover:opacity-80 transition-opacity">
                  <AvatarImage src={connection.other_user?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {getInitials(otherName)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              
              <div className="flex-1 min-w-0">
                <Link 
                  to={`/profile/${connection.other_user?.user_id}`}
                  className="hover:underline"
                >
                  <h1 className="font-display text-2xl font-semibold mb-1">
                    {otherName}
                  </h1>
                </Link>
                {connection.other_user?.short_bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {connection.other_user.short_bio}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={statusDetails.variant} className="text-xs">
                    {statusDetails.label}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FormatIcon className="w-3.5 h-3.5" />
                    {formatLabels[connection.format]}
                  </div>
                </div>
              </div>

              <Button variant="outline" size="sm" asChild className="flex-shrink-0">
                <Link to={`/profile/${connection.other_user?.user_id}`}>
                  <User className="w-4 h-4 mr-1" />
                  View profile
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Status & Action Card */}
        <Card className="mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardContent className="py-6">
            <div className="flex items-center gap-3 mb-4">
              {statusDetails.label === "Scheduled" ? (
                <Calendar className="w-5 h-5 text-primary" />
              ) : statusDetails.label === "Waiting for reply" ? (
                <Bell className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Clock className="w-5 h-5 text-primary" />
              )}
              <div>
                <p className="font-medium">{statusDetails.label}</p>
                <p className="text-sm text-muted-foreground">{statusDetails.sublabel}</p>
              </div>
            </div>

            {/* Action Buttons */}
            {statusDetails.showAction && statusDetails.actionType === "reply" && (
              <div className="flex gap-3">
                <Button 
                  onClick={handleAccept} 
                  className="flex-1"
                  disabled={updateMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Accept
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDecline}
                  disabled={updateMutation.isPending}
                >
                  Not now
                </Button>
              </div>
            )}

            {statusDetails.showAction && (statusDetails.actionType === "join" || statusDetails.actionType === "view-call") && (
              <div className="space-y-3">
                <Button className="w-full" disabled>
                  <Video className="w-4 h-4 mr-2" />
                  {statusDetails.actionType === "join" ? "Join call" : "View call details"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Share your meeting link with {otherName.split(" ")[0]} to connect
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1" 
                    asChild
                  >
                    <a href={getCalendarLink("google")} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Google
                    </a>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1" 
                    asChild
                  >
                    <a href={getCalendarLink("outlook")} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Outlook
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time Slot Proposer - inline for scheduling */}
        {needsScheduling && connection.format !== "async" && (
          <div className="mb-6 animate-slide-up" style={{ animationDelay: "0.15s" }}>
            <TimeSlotProposer
              requestId={connection.id}
              otherPartyName={otherName}
              isRequester={connection.is_requester}
              format={connection.format as "short_call" | "long_call"}
            />
          </div>
        )}

        {/* Request Context - Collapsible */}
        <Collapsible defaultOpen={false} className="mb-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Request context</p>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div>
                  <p className="text-sm">{connection.message}</p>
                </div>
                {connection.expected_outcome && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Expected outcome</p>
                    <p className="text-sm">{connection.expected_outcome}</p>
                  </div>
                )}
                {connection.matching_tags && connection.matching_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {connection.matching_tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {connection.is_requester ? "You sent this request" : "They sent this request"} · {(() => {
  const d = new Date(connection.created_at);
  return isNaN(d.getTime())
    ? "recently"
    : formatDistanceToNow(d, { addSuffix: true });
})()}
                </p>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Private Notes */}
        <div className="animate-slide-up" style={{ animationDelay: "0.25s" }}>
          <ConnectionNotes connectionId={connection.id} />
        </div>
      </main>
    </div>
  );
}
