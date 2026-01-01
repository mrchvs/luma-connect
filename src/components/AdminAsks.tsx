import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageCircle, CheckCircle2, Archive, Eye, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Request {
  id: string;
  title: string | null;
  body: string;
  status: "open" | "resolved" | "archived";
  created_at: string;
  created_by: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function AdminAsks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | "archived">("open");
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [actionDialog, setActionDialog] = useState<{ open: boolean; action: "resolved" | "archived" | "open" | null }>({
    open: false,
    action: null,
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-asks", statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .eq("status", statusFilter)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Request[];
    },
  });

  // Fetch profiles separately
  const { data: profiles } = useQuery({
    queryKey: ["admin-asks-profiles", requests?.map(r => r.created_by)],
    queryFn: async () => {
      if (!requests || requests.length === 0) return {};
      const userIds = [...new Set(requests.map(r => r.created_by))];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      if (error) throw error;
      return Object.fromEntries(data.map(p => [p.user_id, p]));
    },
    enabled: !!requests && requests.length > 0,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: "open" | "resolved" | "archived" }) => {
      const { error } = await supabase
        .from("requests")
        .update({ status })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-asks"] });
      setSelectedRequest(null);
      setActionDialog({ open: false, action: null });
      toast({
        title: "Status updated",
        description: "The ask status has been updated.",
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

  const handleAction = (action: "resolved" | "archived" | "open") => {
    setActionDialog({ open: true, action });
  };

  const confirmAction = () => {
    if (selectedRequest && actionDialog.action) {
      updateStatusMutation.mutate({
        requestId: selectedRequest.id,
        status: actionDialog.action,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-success/10 text-success border-0">Open</Badge>;
      case "resolved":
        return <Badge className="bg-primary/10 text-primary border-0">Resolved</Badge>;
      case "archived":
        return <Badge className="bg-muted text-muted-foreground border-0">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const counts = {
    open: 0,
    resolved: 0,
    archived: 0,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Community Asks Management
          </CardTitle>
          <CardDescription>
            Review and manage community asks. Archive inappropriate content or help resolve asks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <TabsList className="mb-4">
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter}>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner text="Loading asks..." />
                </div>
              ) : !requests?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No {statusFilter} asks</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {requests.map((request) => {
                    const profile = profiles?.[request.created_by];
                    return (
                      <Card
                        key={request.id}
                        className={`cursor-pointer transition-all hover:shadow-card ${
                          selectedRequest?.id === request.id ? "ring-2 ring-primary shadow-card" : ""
                        }`}
                        onClick={() => setSelectedRequest(request)}
                      >
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {profile?.full_name || "Member"}
                                </span>
                                {getStatusBadge(request.status)}
                              </div>
                              {request.title && (
                                <h4 className="font-medium mb-1 truncate">{request.title}</h4>
                              )}
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {request.body}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Selected Ask Detail */}
      {selectedRequest && (
        <Card className="animate-scale-in">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="font-display">
                  {selectedRequest.title || "Untitled Ask"}
                </CardTitle>
                <CardDescription>
                  By {profiles?.[selectedRequest.created_by]?.full_name || "Member"} •{" "}
                  {formatDistanceToNow(new Date(selectedRequest.created_at), { addSuffix: true })}
                </CardDescription>
              </div>
              {getStatusBadge(selectedRequest.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Content</h4>
              <p className="text-foreground/90 whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                {selectedRequest.body}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t">
              {selectedRequest.status !== "open" && (
                <Button
                  variant="outline"
                  onClick={() => handleAction("open")}
                  disabled={updateStatusMutation.isPending}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reopen
                </Button>
              )}
              {selectedRequest.status === "open" && (
                <Button
                  variant="secondary"
                  onClick={() => handleAction("resolved")}
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Resolved
                </Button>
              )}
              {selectedRequest.status !== "archived" && (
                <Button
                  variant="destructive"
                  onClick={() => handleAction("archived")}
                  disabled={updateStatusMutation.isPending}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm {actionDialog.action === "archived" ? "Archive" : actionDialog.action === "resolved" ? "Resolve" : "Reopen"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.action === "archived" && "This will hide the ask from the community feed. Use this for inappropriate or spam content."}
              {actionDialog.action === "resolved" && "This will mark the ask as resolved."}
              {actionDialog.action === "open" && "This will reopen the ask and make it visible in the community feed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              {updateStatusMutation.isPending ? <LoadingSpinner size="sm" /> : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}