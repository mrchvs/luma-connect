import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Send, RefreshCw, X, Clock, CheckCircle2, XCircle, UserPlus, Users, FileText, TrendingUp, BarChart3, Timer } from "lucide-react";
import { formatDistanceToNow, differenceInHours, differenceInDays } from "date-fns";

interface Invitation {
  id: string;
  email: string;
  invited_by_email: string;
  status: "pending" | "accepted" | "expired";
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

interface BulkResult {
  email: string;
  success: boolean;
  error?: string;
}

export function AdminInviteMembers() {
  const [email, setEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [inviteTab, setInviteTab] = useState<"single" | "bulk">("single");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invitations, isLoading } = useQuery({
    queryKey: ["admin-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-invite-member", {
        body: { action: "list_invitations" },
      });
      if (error) throw error;
      return data.invitations as Invitation[];
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (inviteEmail: string) => {
      const { data, error } = await supabase.functions.invoke("admin-invite-member", {
        body: { action: "send_invite", email: inviteEmail },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invitations"] });
      setEmail("");
      toast({
        title: "Invitation sent",
        description: "The invitation email has been sent successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkInviteMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      const { data, error } = await supabase.functions.invoke("admin-invite-member", {
        body: { action: "bulk_invite", emails },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as { message: string; results: BulkResult[] };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-invitations"] });
      setBulkEmails("");
      
      const failed = data.results.filter((r) => !r.success);
      if (failed.length > 0) {
        toast({
          title: data.message,
          description: `Failed: ${failed.map((f) => `${f.email} (${f.error})`).join(", ")}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Bulk invitations sent",
          description: data.message,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitations",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-invite-member", {
        body: { action: "resend_invite", invitationId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invitations"] });
      toast({
        title: "Invitation resent",
        description: "The invitation has been resent with a new expiration date.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resend invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-invite-member", {
        body: { action: "cancel_invite", invitationId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invitations"] });
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    sendInviteMutation.mutate(email.trim());
  };

  const handleBulkInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkEmails.trim()) return;

    // Parse emails from textarea - support comma, semicolon, newline, and space separated
    const emails = bulkEmails
      .split(/[,;\s\n]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && e.includes("@"));

    if (emails.length === 0) {
      toast({
        title: "No valid emails",
        description: "Please enter at least one valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (emails.length > 50) {
      toast({
        title: "Too many emails",
        description: "Maximum 50 emails per bulk invite. Please split into smaller batches.",
        variant: "destructive",
      });
      return;
    }

    bulkInviteMutation.mutate(emails);
  };

  const getStatusBadge = (invitation: Invitation) => {
    const isExpired = new Date(invitation.expires_at) < new Date();

    if (invitation.status === "accepted") {
      return (
        <Badge className="bg-success/10 text-success border-0">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Accepted
        </Badge>
      );
    }
    if (invitation.status === "expired" || isExpired) {
      return (
        <Badge className="bg-destructive/10 text-destructive border-0">
          <XCircle className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    }
    return (
      <Badge className="bg-warning/10 text-warning border-0">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const pendingCount =
    invitations?.filter(
      (inv) => inv.status === "pending" && new Date(inv.expires_at) > new Date()
    ).length || 0;

  const parsedEmailCount = bulkEmails
    .split(/[,;\s\n]+/)
    .filter((e) => e.trim().length > 0 && e.includes("@")).length;

  // Analytics calculations
  const analytics = (() => {
    if (!invitations || invitations.length === 0) {
      return {
        total: 0,
        accepted: 0,
        pending: 0,
        expired: 0,
        acceptanceRate: 0,
        avgTimeToAcceptHours: null as number | null,
        fastestAcceptHours: null as number | null,
      };
    }

    const now = new Date();
    const accepted = invitations.filter((inv) => inv.status === "accepted");
    const pending = invitations.filter(
      (inv) => inv.status === "pending" && new Date(inv.expires_at) > now
    );
    const expired = invitations.filter(
      (inv) => inv.status === "expired" || (inv.status === "pending" && new Date(inv.expires_at) <= now)
    );

    // Calculate time to accept for accepted invitations
    const timesToAccept = accepted
      .filter((inv) => inv.accepted_at)
      .map((inv) => differenceInHours(new Date(inv.accepted_at!), new Date(inv.created_at)));

    const avgTimeToAcceptHours =
      timesToAccept.length > 0
        ? Math.round(timesToAccept.reduce((a, b) => a + b, 0) / timesToAccept.length)
        : null;

    const fastestAcceptHours =
      timesToAccept.length > 0 ? Math.min(...timesToAccept) : null;

    // Acceptance rate based on non-pending invitations
    const resolved = accepted.length + expired.length;
    const acceptanceRate = resolved > 0 ? Math.round((accepted.length / resolved) * 100) : 0;

    return {
      total: invitations.length,
      accepted: accepted.length,
      pending: pending.length,
      expired: expired.length,
      acceptanceRate,
      avgTimeToAcceptHours,
      fastestAcceptHours,
    };
  })();

  const formatTimeToAccept = (hours: number | null) => {
    if (hours === null) return "—";
    if (hours < 1) return "< 1 hour";
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""}`;
    const days = Math.round(hours / 24);
    return `${days} day${days !== 1 ? "s" : ""}`;
  };

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      {invitations && invitations.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sent</p>
                  <p className="text-2xl font-bold">{analytics.total}</p>
                </div>
                <div className="p-2 rounded-full bg-primary/10">
                  <Send className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Acceptance Rate</p>
                  <p className="text-2xl font-bold">{analytics.acceptanceRate}%</p>
                </div>
                <div className="p-2 rounded-full bg-success/10">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {analytics.accepted} accepted / {analytics.expired} expired
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Time to Accept</p>
                  <p className="text-2xl font-bold">{formatTimeToAccept(analytics.avgTimeToAcceptHours)}</p>
                </div>
                <div className="p-2 rounded-full bg-warning/10">
                  <Timer className="w-5 h-5 text-warning" />
                </div>
              </div>
              {analytics.fastestAcceptHours !== null && (
                <p className="text-xs text-muted-foreground mt-2">
                  Fastest: {formatTimeToAccept(analytics.fastestAcceptHours)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{analytics.pending}</p>
                </div>
                <div className="p-2 rounded-full bg-muted">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Awaiting response
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Send Invitation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite New Members
          </CardTitle>
          <CardDescription>
            Send email invitations to new members. They'll receive a link to create their account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={inviteTab} onValueChange={(v) => setInviteTab(v as "single" | "bulk")}>
            <TabsList className="mb-4">
              <TabsTrigger value="single" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Single Invite
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Bulk Invite
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single">
              <form onSubmit={handleSendInvite} className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="invite-email" className="sr-only">
                    Email address
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={sendInviteMutation.isPending}
                  />
                </div>
                <Button type="submit" disabled={!email.trim() || sendInviteMutation.isPending}>
                  {sendInviteMutation.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Invite
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="bulk">
              <form onSubmit={handleBulkInvite} className="space-y-4">
                <div>
                  <Label htmlFor="bulk-emails" className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4" />
                    Email Addresses
                  </Label>
                  <Textarea
                    id="bulk-emails"
                    placeholder="Enter email addresses separated by commas, semicolons, spaces, or new lines.&#10;&#10;Example:&#10;john@example.com, jane@example.com&#10;bob@example.com"
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    disabled={bulkInviteMutation.isPending}
                    className="min-h-[120px] font-mono text-sm"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    {parsedEmailCount > 0
                      ? `${parsedEmailCount} email${parsedEmailCount !== 1 ? "s" : ""} detected (max 50)`
                      : "Paste emails from a spreadsheet or CSV"}
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={parsedEmailCount === 0 || bulkInviteMutation.isPending}
                >
                  {bulkInviteMutation.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send {parsedEmailCount > 0 ? `${parsedEmailCount} ` : ""}Invite
                      {parsedEmailCount !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Invitations List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Invitations</CardTitle>
              <CardDescription>
                {pendingCount} pending invitation{pendingCount !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner text="Loading invitations..." />
            </div>
          ) : !invitations?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              No invitations sent yet. Use the form above to invite new members.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited By</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => {
                    const isExpired = new Date(invitation.expires_at) < new Date();
                    const canResend = invitation.status === "pending" || (invitation.status !== "accepted" && isExpired);
                    const canCancel = invitation.status === "pending" && !isExpired;

                    return (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>{getStatusBadge(invitation)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {invitation.invited_by_email}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(invitation.created_at), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {invitation.status === "accepted"
                            ? "—"
                            : formatDistanceToNow(new Date(invitation.expires_at), {
                                addSuffix: true,
                              })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canResend && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resendInviteMutation.mutate(invitation.id)}
                                disabled={resendInviteMutation.isPending}
                              >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Resend
                              </Button>
                            )}
                            {canCancel && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive">
                                    <X className="w-3 h-3 mr-1" />
                                    Cancel
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to cancel this invitation to{" "}
                                      <strong>{invitation.email}</strong>? The invitation link will
                                      no longer work.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => cancelInviteMutation.mutate(invitation.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Cancel Invitation
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
