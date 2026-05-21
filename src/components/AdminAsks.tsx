import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { MessageCircle, Archive, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Request {
  id: string;
  title: string | null;
  body: string;
  status: "open" | "resolved" | "archived";
  created_at: string;
  created_by: string;
}

const helpTypePattern = /\n\n---\n\*Looking for: (.+?)\*$/;
function parseBody(body: string) {
  const match = body.match(helpTypePattern);
  return {
    cleanBody: match ? body.replace(helpTypePattern, "").trim() : body,
    helpType: match ? match[1] : null,
  };
}

export function AdminAsks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | "archived">("open");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [inlineConfirm, setInlineConfirm] = useState<{ id: string; action: "archived" | "open" } | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-asks", statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("id, title, body, status, created_at, created_by")
        .eq("status", statusFilter)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Request[];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-asks-profiles", requests?.map(r => r.created_by)],
    queryFn: async () => {
      if (!requests?.length) return {};
      const userIds = [...new Set(requests.map(r => r.created_by))];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      if (error) throw error;
      return Object.fromEntries(data.map(p => [p.user_id, p]));
    },
    enabled: !!requests?.length,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: "open" | "archived" }) => {
      const { error } = await supabase
        .from("requests")
        .update({ status })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, { ids, status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-asks"] });
      queryClient.invalidateQueries({ queryKey: ["community-asks"] });
      setSelected(new Set());
      toast({
        title: status === "archived" ? `${ids.length > 1 ? ids.length + " asks" : "Ask"} archived` : "Ask reopened",
      });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Selection helpers
  const allIds = requests?.map(r => r.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  // Reset selection when tab changes
  const handleTabChange = (v: string) => {
    setStatusFilter(v as typeof statusFilter);
    setSelected(new Set());
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":     return <Badge className="bg-success/10 text-success border-0">Open</Badge>;
      case "resolved": return <Badge className="bg-primary/10 text-primary border-0">Resolved</Badge>;
      case "archived": return <Badge className="bg-muted text-muted-foreground border-0">Archived</Badge>;
      default:         return <Badge variant="secondary">{status}</Badge>;
    }
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
          <Tabs value={statusFilter} onValueChange={handleTabChange}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <TabsList>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>

              {/* Bulk action bar */}
              {someSelected && (
                <div className="flex items-center gap-2 animate-scale-in">
                  <span className="text-sm text-muted-foreground">{selected.size} selected</span>
                  {statusFilter !== "archived" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1.5"
                      onClick={() => setBulkConfirmOpen(true)}
                      disabled={updateStatus.isPending}
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Archive selected
                    </Button>
                  )}
                  {statusFilter === "archived" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => updateStatus.mutate({ ids: [...selected], status: "open" })}
                      disabled={updateStatus.isPending}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reopen selected
                    </Button>
                  )}
                </div>
              )}
            </div>

            <TabsContent value={statusFilter}>
              {isLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner text="Loading asks..." /></div>
              ) : !requests?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No {statusFilter} asks</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {/* Select all row */}
                  <div className="flex items-center gap-3 px-3 py-1.5">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                    <span className="text-xs text-muted-foreground">
                      {allSelected ? "Deselect all" : "Select all"}
                    </span>
                  </div>

                  {requests.map((request) => {
                    const profile = profiles?.[request.created_by];
                    const { cleanBody, helpType } = parseBody(request.body);
                    const isChecked = selected.has(request.id);
                    return (
                      <div
                        key={request.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                          isChecked ? "bg-primary/5 border-primary/30" : "bg-card border-border/50 hover:bg-muted/30"
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleOne(request.id)}
                          className="mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium">{profile?.full_name || "Member"}</span>
                            {getStatusBadge(request.status)}
                          </div>
                          {request.title && (
                            <p className="text-sm font-medium truncate">{request.title}</p>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-1">{cleanBody}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {helpType && (
                              <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                                Looking for: {helpType}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>

                        {/* Inline actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {statusFilter !== "archived" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => setInlineConfirm({ id: request.id, action: "archived" })}
                              disabled={updateStatus.isPending}
                            >
                              <Archive className="w-3 h-3" />
                              Archive
                            </Button>
                          )}
                          {statusFilter === "archived" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => setInlineConfirm({ id: request.id, action: "open" })}
                              disabled={updateStatus.isPending}
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reopen
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Inline single-ask confirm */}
      <AlertDialog open={!!inlineConfirm} onOpenChange={(o) => !o && setInlineConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {inlineConfirm?.action === "archived" ? "Archive this ask?" : "Reopen this ask?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {inlineConfirm?.action === "archived"
                ? "This will hide the ask from the community feed."
                : "This will make the ask visible again in the community feed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (inlineConfirm) {
                  updateStatus.mutate({ ids: [inlineConfirm.id], status: inlineConfirm.action });
                  setInlineConfirm(null);
                }
              }}
            >
              {updateStatus.isPending ? <LoadingSpinner size="sm" /> : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk archive confirm */}
      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {selected.size} ask{selected.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide {selected.size > 1 ? "these asks" : "this ask"} from the community feed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                updateStatus.mutate({ ids: [...selected], status: "archived" });
                setBulkConfirmOpen(false);
              }}
            >
              {updateStatus.isPending ? <LoadingSpinner size="sm" /> : `Archive ${selected.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
