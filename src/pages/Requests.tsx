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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Inbox,
  Send,
  Clock,
  MessageCircle,
  Video,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface IntroRequest {
  id: string;
  requester_id: string;
  helper_id: string;
  message: string;
  expected_outcome: string | null;
  format: "async" | "short_call" | "long_call";
  status: "pending" | "accepted" | "declined";
  matching_tags: string[] | null;
  created_at: string;
  requester_profile?: {
    full_name: string | null;
    short_bio: string | null;
    city: string | null;
    country: string | null;
    linkedin_url: string | null;
    website_url: string | null;
    avatar_url: string | null;
  };
  helper_profile?: {
    full_name: string | null;
  };
}

const formatLabels = {
  async: { label: "Async", icon: MessageCircle },
  short_call: { label: "20-30 min call", icon: Clock },
  long_call: { label: "45-60 min call", icon: Video },
};

const statusConfig = {
  pending: { label: "Pending", color: "bg-warning/10 text-warning" },
  accepted: { label: "Accepted", color: "bg-success/10 text-success" },
  declined: { label: "Declined", color: "bg-muted text-muted-foreground" },
};

export default function Requests() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [declineDialog, setDeclineDialog] = useState<{ open: boolean; requestId: string | null }>({
    open: false,
    requestId: null,
  });
  const [declineNote, setDeclineNote] = useState("");
  const [acceptDialog, setAcceptDialog] = useState<{ open: boolean; request: IntroRequest | null }>({
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
        description: "You need to be approved to view requests.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [user, profile, loading, navigate, toast]);

  // Fetch incoming requests (where user is helper)
  const { data: incomingRequests, isLoading: incomingLoading } = useQuery({
    queryKey: ["incoming-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("intro_requests")
        .select("*")
        .eq("helper_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data?.length) return [];

      // Fetch requester profiles
      const requesterIds = data.map((r) => r.requester_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, short_bio, city, country, linkedin_url, website_url, avatar_url")
        .in("user_id", requesterIds);

      return data.map((request) => ({
        ...request,
        requester_profile: profiles?.find((p) => p.user_id === request.requester_id),
      })) as IntroRequest[];
    },
    enabled: !!user && profile?.status === "approved",
  });

  // Fetch outgoing requests (where user is requester)
  const { data: outgoingRequests, isLoading: outgoingLoading } = useQuery({
    queryKey: ["outgoing-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("intro_requests")
        .select("*")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data?.length) return [];

      // Fetch helper profiles
      const helperIds = data.map((r) => r.helper_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", helperIds);

      return data.map((request) => ({
        ...request,
        helper_profile: profiles?.find((p) => p.user_id === request.helper_id),
      })) as IntroRequest[];
    },
    enabled: !!user && profile?.status === "approved",
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ requestId, status, asyncOnly }: { requestId: string; status: "accepted" | "declined"; asyncOnly?: boolean }) => {
      // If accepting as async only, update the format as well
      const updateData: any = { status };
      if (asyncOnly) {
        updateData.format = "async";
      }
      
      const { error } = await supabase
        .from("intro_requests")
        .update(updateData)
        .eq("id", requestId);

      if (error) throw error;

      // Send email notification via edge function
      try {
        const { error: fnError } = await supabase.functions.invoke("send-intro-notification", {
          body: { requestId, type: status === "accepted" ? "accepted" : "declined" },
        });
        if (fnError) {
          console.error("Failed to send notification:", fnError);
        }
      } catch (notifError) {
        console.error("Notification error:", notifError);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["incoming-requests"] });
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
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAccept = (request: IntroRequest) => {
    // If it's already async, just accept directly
    if (request.format === "async") {
      updateRequestMutation.mutate({ requestId: request.id, status: "accepted" });
    } else {
      // Show dialog with options for call requests
      setAcceptDialog({ open: true, request });
    }
  };

  const handleDecline = (requestId: string) => {
    setDeclineDialog({ open: true, requestId });
  };

  const confirmDecline = () => {
    if (declineDialog.requestId) {
      updateRequestMutation.mutate({
        requestId: declineDialog.requestId,
        status: "declined",
      });
    }
  };

  if (loading || incomingLoading || outgoingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading requests..." />
      </div>
    );
  }

  const pendingIncoming = incomingRequests?.filter((r) => r.status === "pending") || [];

  return (
    <div className="min-h-screen bg-background">
      <MainNav />

      <main className="container py-8 px-4 max-w-3xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold mb-2">Connections</h1>
          <p className="text-muted-foreground">Your active conversations and scheduled calls</p>
        </div>

        <Tabs defaultValue="incoming" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="incoming" className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              Received
              {pendingIncoming.length > 0 && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                  {pendingIncoming.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Sent
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="space-y-4">
            <p className="text-xs text-muted-foreground mb-4">
              Requests sent to you by other members
            </p>
            {!incomingRequests?.length ? (
              <Card className="bg-muted/30">
                <CardContent className="py-12 text-center">
                  <Inbox className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                  <h3 className="font-medium text-foreground mb-2">No incoming connections yet</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Connections appear when another member reaches out to you, or when you respond to a community ask.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/community-asks">View community asks</Link>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4">
                    You'll be notified when a new request arrives.
                  </p>
                </CardContent>
              </Card>
            ) : (
              incomingRequests.map((request) => (
                <Card 
                  key={request.id} 
                  className="animate-scale-in cursor-pointer hover:shadow-elevated transition-shadow"
                  onClick={() => navigate(`/connections/${request.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar - clicks to profile */}
                      <Link 
                        to={`/profile/${request.requester_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0"
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center hover:opacity-80 transition-opacity">
                          {request.requester_profile?.avatar_url ? (
                            <img 
                              src={request.requester_profile.avatar_url} 
                              alt="" 
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-medium text-primary">
                              {request.requester_profile?.full_name?.[0] || "?"}
                            </span>
                          )}
                        </div>
                      </Link>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link 
                            to={`/profile/${request.requester_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-display text-base font-medium hover:underline"
                          >
                            {request.requester_profile?.full_name || "Member"}
                          </Link>
                          <Badge className={statusConfig[request.status].color}>
                            {request.status === "pending" ? "Waiting for you" : 
                             request.status === "accepted" ? "Connected" : "Not now"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          {(() => {
                            const FormatIcon = formatLabels[request.format].icon;
                            return <FormatIcon className="w-3.5 h-3.5" />;
                          })()}
                          <span>{formatLabels[request.format].label}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>

                      <Button 
                        variant={request.status === "pending" ? "default" : "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/connections/${request.id}`);
                        }}
                      >
                        {request.status === "pending" ? "Reply" : "View details"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-4">
            <p className="text-xs text-muted-foreground mb-4">
              Requests you've sent to other members
            </p>
            {!outgoingRequests?.length ? (
              <Card className="bg-muted/30">
                <CardContent className="py-12 text-center">
                  <Send className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                  <h3 className="font-medium text-foreground mb-2">No sent connections yet</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    When you reach out to connect with someone, it will appear here.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/members">Browse members</Link>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4">
                    You'll be notified when they respond.
                  </p>
                </CardContent>
              </Card>
            ) : (
              outgoingRequests.map((request) => (
                <Card 
                  key={request.id} 
                  className="animate-scale-in cursor-pointer hover:shadow-elevated transition-shadow"
                  onClick={() => navigate(`/connections/${request.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar - clicks to profile */}
                      <Link 
                        to={`/profile/${request.helper_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0"
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center hover:opacity-80 transition-opacity">
                          <span className="text-lg font-medium text-primary">
                            {request.helper_profile?.full_name?.[0] || "?"}
                          </span>
                        </div>
                      </Link>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link 
                            to={`/profile/${request.helper_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-display text-base font-medium hover:underline"
                          >
                            {request.helper_profile?.full_name || "Member"}
                          </Link>
                          <Badge className={statusConfig[request.status].color}>
                            {request.status === "pending" ? "Waiting for reply" : 
                             request.status === "accepted" ? "Connected" : "Not now"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          {(() => {
                            const FormatIcon = formatLabels[request.format].icon;
                            return <FormatIcon className="w-3.5 h-3.5" />;
                          })()}
                          <span>{formatLabels[request.format].label}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                        </div>
                        {request.status === "pending" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            We'll notify you when they respond
                          </p>
                        )}
                      </div>

                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/connections/${request.id}`);
                        }}
                      >
                        View details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Accept Dialog for call requests */}
      <Dialog open={acceptDialog.open} onOpenChange={(open) => setAcceptDialog({ open, request: open ? acceptDialog.request : null })}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-display">Accept Connection</DialogTitle>
            <DialogDescription>
              How would you like to connect with {acceptDialog.request?.requester_profile?.full_name?.split(' ')[0]}?
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

      {/* Decline Dialog - emotionally safe */}
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
