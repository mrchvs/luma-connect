import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { MainNav } from "@/components/MainNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  Video,
  Clock,
  Calendar,
  Link as LinkIcon,
} from "lucide-react";
import { formatDistanceToNow, addHours } from "date-fns";

interface ConnectionItem {
  id: string;
  requester_id: string;
  helper_id: string;
  message: string;
  expected_outcome: string | null;
  format: "async" | "short_call" | "long_call";
  status: "pending" | "accepted" | "declined";
  matching_tags: string[] | null;
  created_at: string;
  is_requester: boolean;
  other_user_id: string;
  other_profile?: {
    full_name: string | null;
    short_bio: string | null;
    avatar_url: string | null;
    job_title: string | null;
    company_name: string | null;
  };
  scheduled_time?: string | null;
}

type StatusFilter = "all" | "waiting" | "scheduled" | "connected";

const formatLabels = {
  async: { label: "Async", icon: MessageCircle },
  short_call: { label: "Short Call", icon: Clock },
  long_call: { label: "Long Call", icon: Video },
};

function getConnectionStatus(conn: ConnectionItem): {
  displayStatus: string;
  statusVariant: "default" | "secondary" | "outline";
  filterCategory: StatusFilter;
} {
  if (conn.status === "pending") {
    if (conn.is_requester) {
      return { displayStatus: "Waiting for reply", statusVariant: "secondary", filterCategory: "waiting" };
    }
    return { displayStatus: "Waiting for you", statusVariant: "default", filterCategory: "waiting" };
  }
  
  if (conn.status === "accepted") {
    if (conn.scheduled_time) {
      return { displayStatus: "Scheduled", statusVariant: "secondary", filterCategory: "scheduled" };
    }
    return { displayStatus: "Connected", statusVariant: "secondary", filterCategory: "connected" };
  }
  
  return { displayStatus: "Not now", statusVariant: "outline", filterCategory: "connected" };
}

function getTimeMetadata(conn: ConnectionItem): string {
  if (conn.scheduled_time) {
    const scheduledDate = new Date(conn.scheduled_time);
    const now = new Date();
    if (scheduledDate > now && scheduledDate <= addHours(now, 24)) {
      return "Scheduled today";
    }
    return `Scheduled ${formatDistanceToNow(scheduledDate, { addSuffix: true })}`;
  }
  return formatDistanceToNow(new Date(conn.created_at), { addSuffix: true });
}

function getPrimaryCTA(conn: ConnectionItem): { label: string; variant: "default" | "outline" } {
  if (conn.status === "pending" && !conn.is_requester) {
    return { label: "Reply", variant: "default" };
  }
  if (conn.scheduled_time) {
    const scheduledDate = new Date(conn.scheduled_time);
    const now = new Date();
    if (scheduledDate > now && scheduledDate <= addHours(now, 24)) {
      return { label: "Join call", variant: "default" };
    }
  }
  return { label: "View details", variant: "outline" };
}

export default function Requests() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [declineDialog, setDeclineDialog] = useState<{ open: boolean; requestId: string | null }>({
    open: false,
    requestId: null,
  });
  const [declineNote, setDeclineNote] = useState("");
  const [acceptDialog, setAcceptDialog] = useState<{ open: boolean; request: ConnectionItem | null }>({
    open: false,
    request: null,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (!loading && profile?.status !== "approved") {
      toast({
        title: "Access restricted",
        description: "You need to be approved to view connections.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [user, profile, loading, navigate, toast]);

  // Unified connections query
  const { data: connections, isLoading: connectionsLoading } = useQuery({
    queryKey: ["all-connections", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch all requests where user is involved
      const { data, error } = await supabase
        .from("intro_requests")
        .select("*")
        .or(`requester_id.eq.${user.id},helper_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data?.length) return [];

      // Get all other user IDs
      const otherUserIds = new Set<string>();
      data.forEach((r) => {
        if (r.requester_id !== user.id) otherUserIds.add(r.requester_id);
        if (r.helper_id !== user.id) otherUserIds.add(r.helper_id);
      });

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, short_bio, avatar_url, job_title, company_name")
        .in("user_id", Array.from(otherUserIds));

      // Fetch scheduled times
      const requestIds = data.map((r) => r.id);
      const { data: timeSlots } = await supabase
        .from("proposed_time_slots")
        .select("intro_request_id, start_time")
        .in("intro_request_id", requestIds)
        .eq("status", "accepted");

      const scheduledMap = new Map(timeSlots?.map((t) => [t.intro_request_id, t.start_time]) || []);

      return data.map((request): ConnectionItem => {
        const isRequester = request.requester_id === user.id;
        const otherUserId = isRequester ? request.helper_id : request.requester_id;
        
        return {
          ...request,
          is_requester: isRequester,
          other_user_id: otherUserId,
          other_profile: profiles?.find((p) => p.user_id === otherUserId),
          scheduled_time: scheduledMap.get(request.id) || null,
        };
      }) as ConnectionItem[];
    },
    enabled: !!user && profile?.status === "approved",
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ requestId, status, asyncOnly }: { requestId: string; status: "accepted" | "declined"; asyncOnly?: boolean }) => {
      const updateData: { status: "accepted" | "declined"; format?: "async" | "short_call" | "long_call" } = { status };
      if (asyncOnly) {
        updateData.format = "async";
      }
      
      const { error } = await supabase
        .from("intro_requests")
        .update(updateData)
        .eq("id", requestId);

      if (error) throw error;

      try {
        await supabase.functions.invoke("send-intro-notification", {
          body: { requestId, type: status === "accepted" ? "accepted" : "declined" },
        });
      } catch (notifError) {
        console.error("Notification error:", notifError);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["all-connections"] });
      setAcceptDialog({ open: false, request: null });
      setDeclineDialog({ open: false, requestId: null });
      setDeclineNote("");
      toast({
        title: variables.status === "accepted" ? "Connection accepted!" : "Response sent",
        description: variables.status === "accepted" 
          ? "Your contact info has been shared. You can now connect!" 
          : "Your response has been recorded.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmDecline = () => {
    if (declineDialog.requestId) {
      updateRequestMutation.mutate({
        requestId: declineDialog.requestId,
        status: "declined",
      });
    }
  };

  if (loading || connectionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading connections..." />
      </div>
    );
  }

  // Filter connections
  const filteredConnections = connections?.filter((conn) => {
    if (conn.status === "declined") return false;
    if (statusFilter === "all") return true;
    const { filterCategory } = getConnectionStatus(conn);
    return filterCategory === statusFilter;
  }) || [];

  const filterCounts = {
    all: connections?.filter((c) => c.status !== "declined").length || 0,
    waiting: connections?.filter((c) => c.status === "pending").length || 0,
    scheduled: connections?.filter((c) => c.status === "accepted" && c.scheduled_time).length || 0,
    connected: connections?.filter((c) => c.status === "accepted" && !c.scheduled_time).length || 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNav />

      <main className="container py-8 px-4 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-semibold mb-1">Connections</h1>
          <p className="text-muted-foreground text-sm">Your active conversations and scheduled calls</p>
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(["all", "waiting", "scheduled", "connected"] as StatusFilter[]).map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter)}
              className="capitalize"
            >
              {filter}
              {filterCounts[filter] > 0 && (
                <Badge 
                  variant={statusFilter === filter ? "secondary" : "outline"} 
                  className="ml-1.5 h-5 min-w-5 px-1.5"
                >
                  {filterCounts[filter]}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Connections List */}
        <div className="space-y-3">
          {filteredConnections.length === 0 ? (
            <Card className="bg-muted/30">
              <CardContent className="py-12 text-center">
                <LinkIcon className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="font-medium text-foreground mb-2">
                  {statusFilter === "all" ? "No connections yet" : `No ${statusFilter} connections`}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Connections appear when you reach out to members or respond to community asks.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/community-asks">View community asks</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/members">Browse members</Link>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  You'll be notified when someone responds.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredConnections.map((conn) => {
              const { displayStatus, statusVariant } = getConnectionStatus(conn);
              const FormatIcon = formatLabels[conn.format].icon;
              const cta = getPrimaryCTA(conn);
              const timeMetadata = getTimeMetadata(conn);
              const otherName = conn.other_profile?.full_name || "Member";
              const subtitle = conn.other_profile?.job_title && conn.other_profile?.company_name
                ? `${conn.other_profile.job_title} at ${conn.other_profile.company_name}`
                : conn.other_profile?.short_bio?.slice(0, 50);

              return (
                <Card 
                  key={conn.id} 
                  className="animate-scale-in cursor-pointer hover:shadow-elevated transition-shadow"
                  onClick={() => navigate(`/connections/${conn.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <Link 
                        to={`/profile/${conn.other_user_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0"
                      >
                        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center hover:opacity-80 transition-opacity overflow-hidden">
                          {conn.other_profile?.avatar_url ? (
                            <img 
                              src={conn.other_profile.avatar_url} 
                              alt="" 
                              className="w-11 h-11 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-base font-medium text-primary">
                              {otherName[0] || "?"}
                            </span>
                          )}
                        </div>
                      </Link>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link 
                            to={`/profile/${conn.other_user_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-display text-sm font-medium hover:underline"
                          >
                            {otherName}
                          </Link>
                          <Badge variant={statusVariant} className="text-xs h-5">
                            {displayStatus}
                          </Badge>
                        </div>
                        {subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <FormatIcon className="w-3 h-3" />
                          <span>{formatLabels[conn.format].label}</span>
                          <span className="text-muted-foreground/50">·</span>
                          <span>{timeMetadata}</span>
                        </div>
                      </div>

                      <Button 
                        variant={cta.variant}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/connections/${conn.id}`);
                        }}
                      >
                        {cta.label}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>

      {/* Accept Dialog for call requests */}
      <Dialog open={acceptDialog.open} onOpenChange={(open) => setAcceptDialog({ open, request: open ? acceptDialog.request : null })}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-display">Accept Connection</DialogTitle>
            <DialogDescription>
              How would you like to connect with {acceptDialog.request?.other_profile?.full_name?.split(' ')[0]}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Button
              className="w-full justify-start h-auto py-3"
              onClick={() => {
                if (acceptDialog.request) {
                  updateRequestMutation.mutate({ requestId: acceptDialog.request.id, status: "accepted" });
                }
              }}
              disabled={updateRequestMutation.isPending}
            >
              <Calendar className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-medium">Accept for {formatLabels[acceptDialog.request?.format || "async"].label}</p>
                <p className="text-xs opacity-80">As they requested</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => {
                if (acceptDialog.request) {
                  updateRequestMutation.mutate({ 
                    requestId: acceptDialog.request.id, 
                    status: "accepted",
                    asyncOnly: true,
                  });
                }
              }}
              disabled={updateRequestMutation.isPending}
            >
              <MessageCircle className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-medium">Accept — Async only</p>
                <p className="text-xs text-muted-foreground">Connect via messages instead</p>
              </div>
            </Button>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAcceptDialog({ open: false, request: null })}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={declineDialog.open} onOpenChange={(open) => {
        setDeclineDialog({ open, requestId: open ? declineDialog.requestId : null });
        if (!open) setDeclineNote("");
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-display">Not the right time?</DialogTitle>
            <DialogDescription>
              That's completely okay. You can optionally share a brief note, or simply pass.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="decline-note" className="text-sm text-muted-foreground">
                Optional note (won't be shared with requester)
              </Label>
              <Textarea
                id="decline-note"
                placeholder="e.g., Too busy this month..."
                value={declineNote}
                onChange={(e) => setDeclineNote(e.target.value)}
                className="min-h-[60px]"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              The requester will only see that now isn't the right time—no details will be shared.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeclineDialog({ open: false, requestId: null })}>
              Go back
            </Button>
            <Button
              variant="secondary"
              onClick={confirmDecline}
              disabled={updateRequestMutation.isPending}
            >
              {updateRequestMutation.isPending ? <LoadingSpinner size="sm" /> : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
