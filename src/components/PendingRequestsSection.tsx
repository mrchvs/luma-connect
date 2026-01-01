import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Inbox,
  Send,
  Clock,
  ArrowRight,
  MessageCircle,
  Video,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PendingRequest {
  id: string;
  type: "incoming" | "outgoing";
  other_user_name: string;
  other_user_id: string;
  message: string;
  format: "async" | "short_call" | "long_call";
  created_at: string;
  matching_tags: string[] | null;
}

const formatIcons = {
  async: MessageCircle,
  short_call: Clock,
  long_call: Video,
};

export function PendingRequestsSection() {
  const { user } = useAuth();

  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ["pending-requests-dashboard", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch incoming pending requests
      const { data: incoming, error: inErr } = await supabase
        .from("intro_requests")
        .select("id, requester_id, message, format, created_at, matching_tags")
        .eq("helper_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(3);

      if (inErr) throw inErr;

      // Fetch outgoing pending requests
      const { data: outgoing, error: outErr } = await supabase
        .from("intro_requests")
        .select("id, helper_id, message, format, created_at, matching_tags")
        .eq("requester_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(3);

      if (outErr) throw outErr;

      // Get all user IDs to fetch profiles
      const incomingUserIds = incoming?.map((r) => r.requester_id) || [];
      const outgoingUserIds = outgoing?.map((r) => r.helper_id) || [];
      const allUserIds = [...new Set([...incomingUserIds, ...outgoingUserIds])];

      let profiles: Record<string, string> = {};
      if (allUserIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", allUserIds);

        profiles = (profileData || []).reduce((acc, p) => {
          acc[p.user_id] = p.full_name?.split(" ")[0] || "Member";
          return acc;
        }, {} as Record<string, string>);
      }

      const result: PendingRequest[] = [
        ...(incoming || []).map((r) => ({
          id: r.id,
          type: "incoming" as const,
          other_user_name: profiles[r.requester_id] || "Member",
          other_user_id: r.requester_id,
          message: r.message,
          format: r.format,
          created_at: r.created_at,
          matching_tags: r.matching_tags,
        })),
        ...(outgoing || []).map((r) => ({
          id: r.id,
          type: "outgoing" as const,
          other_user_name: profiles[r.helper_id] || "Member",
          other_user_id: r.helper_id,
          message: r.message,
          format: r.format,
          created_at: r.created_at,
          matching_tags: r.matching_tags,
        })),
      ];

      // Sort by created_at desc
      return result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 5);
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Card className="animate-slide-up" style={{ animationDelay: "0.25s" }}>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!pendingRequests || pendingRequests.length === 0) {
    return null;
  }

  const incomingCount = pendingRequests.filter((r) => r.type === "incoming").length;
  const outgoingCount = pendingRequests.filter((r) => r.type === "outgoing").length;

  return (
    <Card className="animate-slide-up" style={{ animationDelay: "0.25s" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              Pending Requests
            </CardTitle>
            <CardDescription className="mt-1">
              {incomingCount > 0 && `${incomingCount} awaiting your response`}
              {incomingCount > 0 && outgoingCount > 0 && " · "}
              {outgoingCount > 0 && `${outgoingCount} awaiting reply`}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/connections">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingRequests.map((request) => {
          const FormatIcon = formatIcons[request.format];
          return (
            <Link
              key={request.id}
              to="/connections"
              className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      request.type === "incoming"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted-foreground/10 text-muted-foreground"
                    }`}
                  >
                    {request.type === "incoming" ? (
                      <Inbox className="w-4 h-4" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {request.type === "incoming" ? "From" : "To"}{" "}
                      {request.other_user_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {request.message.slice(0, 60)}
                      {request.message.length > 60 ? "..." : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge
                    variant={request.type === "incoming" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {request.type === "incoming" ? "Action needed" : "Waiting"}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FormatIcon className="w-3 h-3" />
                    <span>
                      {formatDistanceToNow(new Date(request.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
