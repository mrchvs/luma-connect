import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Inbox,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  MessageCircle,
  Video,
  Mail,
  Linkedin,
  Globe,
  ExternalLink,
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
  declined: { label: "Declined", color: "bg-destructive/10 text-destructive" },
};

export default function Requests() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        .select("user_id, full_name, short_bio, city, country, linkedin_url, website_url")
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
    mutationFn: async ({ requestId, status }: { requestId: string; status: "accepted" | "declined" }) => {
      const { error } = await supabase
        .from("intro_requests")
        .update({ status })
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
        // Don't throw - the status update succeeded
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["incoming-requests"] });
      toast({
        title: variables.status === "accepted" ? "Request accepted!" : "Request declined",
        description: variables.status === "accepted" 
          ? "Your contact info has been shared with the requester." 
          : "The requester has been notified.",
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
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="outline" size="sm" asChild>
              <Link to="/matches">View Matches</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 px-4 max-w-3xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold mb-2">Intro Requests</h1>
          <p className="text-muted-foreground">Manage your connection requests</p>
        </div>

        <Tabs defaultValue="incoming" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="incoming" className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              Incoming
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
            {!incomingRequests?.length ? (
              <Card className="bg-muted/30">
                <CardContent className="py-12 text-center">
                  <Inbox className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No incoming requests yet</p>
                </CardContent>
              </Card>
            ) : (
              incomingRequests.map((request) => (
                <Card key={request.id} className="animate-scale-in">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="font-display text-lg">
                          {request.requester_profile?.full_name || "Member"}
                        </CardTitle>
                        <CardDescription>
                          {request.requester_profile?.city}, {request.requester_profile?.country}
                        </CardDescription>
                      </div>
                      <Badge className={statusConfig[request.status].color}>
                        {statusConfig[request.status].label}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {request.requester_profile?.short_bio && (
                      <p className="text-sm text-muted-foreground">
                        {request.requester_profile.short_bio}
                      </p>
                    )}

                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          What they need help with
                        </p>
                        <p className="text-sm">{request.message}</p>
                      </div>

                      {request.expected_outcome && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                            Expected outcome
                          </p>
                          <p className="text-sm">{request.expected_outcome}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {(() => {
                          const FormatIcon = formatLabels[request.format].icon;
                          return <FormatIcon className="w-4 h-4" />;
                        })()}
                        {formatLabels[request.format].label}
                        <span className="text-muted-foreground/50">•</span>
                        {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </div>
                    </div>

                    {request.matching_tags && request.matching_tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {request.matching_tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {request.status === "pending" && (
                      <div className="flex gap-3 pt-2">
                        <Button
                          className="flex-1"
                          onClick={() =>
                            updateRequestMutation.mutate({
                              requestId: request.id,
                              status: "accepted",
                            })
                          }
                          disabled={updateRequestMutation.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            updateRequestMutation.mutate({
                              requestId: request.id,
                              status: "declined",
                            })
                          }
                          disabled={updateRequestMutation.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    )}

                    {request.status === "accepted" && request.requester_profile && (
                      <div className="pt-2 border-t space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Contact info shared
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {request.requester_profile.linkedin_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={request.requester_profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                                <Linkedin className="w-4 h-4 mr-1" />
                                LinkedIn
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </Button>
                          )}
                          {request.requester_profile.website_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={request.requester_profile.website_url} target="_blank" rel="noopener noreferrer">
                                <Globe className="w-4 h-4 mr-1" />
                                Website
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-4">
            {!outgoingRequests?.length ? (
              <Card className="bg-muted/30">
                <CardContent className="py-12 text-center">
                  <Send className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No sent requests yet</p>
                  <Button variant="link" asChild className="mt-2">
                    <Link to="/matches">Find matches to connect with</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              outgoingRequests.map((request) => (
                <Card key={request.id} className="animate-scale-in">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="font-display text-lg">
                          To: {request.helper_profile?.full_name || "Member"}
                        </CardTitle>
                        <CardDescription>
                          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </CardDescription>
                      </div>
                      <Badge className={statusConfig[request.status].color}>
                        {statusConfig[request.status].label}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="text-sm">{request.message}</p>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {(() => {
                        const FormatIcon = formatLabels[request.format].icon;
                        return <FormatIcon className="w-4 h-4" />;
                      })()}
                      {formatLabels[request.format].label}
                    </div>

                    {request.matching_tags && request.matching_tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {request.matching_tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
