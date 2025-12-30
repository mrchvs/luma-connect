import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Send, RefreshCw, X, Clock, CheckCircle2, XCircle, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Invitation {
  id: string;
  email: string;
  invited_by_email: string;
  status: "pending" | "accepted" | "expired";
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export function AdminInviteMembers() {
  const [email, setEmail] = useState("");
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

  const pendingCount = invitations?.filter(
    (inv) => inv.status === "pending" && new Date(inv.expires_at) > new Date()
  ).length || 0;

  return (
    <div className="space-y-6">
      {/* Send Invitation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite New Member
          </CardTitle>
          <CardDescription>
            Send an email invitation to a new member. They'll receive a link to create their account.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                    const canResend = invitation.status === "pending" || isExpired;
                    const canCancel = invitation.status === "pending" && !isExpired;

                    return (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>{getStatusBadge(invitation)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {invitation.invited_by_email}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {invitation.status === "accepted"
                            ? "—"
                            : formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
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
                                      <strong>{invitation.email}</strong>? The invitation link will no
                                      longer work.
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
