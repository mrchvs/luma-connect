import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Crown, ShieldCheck, User, UserCog, ShieldPlus, ShieldMinus } from "lucide-react";

interface MemberWithRole {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "owner" | "admin" | "user";
}

export function AdminRoleManagement() {
  const { isOwner, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingChange, setPendingChange] = useState<{
    member: MemberWithRole;
    newRole: "admin" | "user";
  } | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ["admin-members-roles"],
    queryFn: async () => {
      // Get all approved profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .eq("status", "approved")
        .eq("completed", true)
        .order("full_name");
      if (profilesError) throw profilesError;

      // Get all elevated roles (admin + owner)
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "owner"]);
      if (rolesError) throw rolesError;

      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role as "admin" | "owner"]));

      return (profiles ?? []).map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        role: roleMap.get(p.user_id) ?? "user",
      })) as MemberWithRole[];
    },
    enabled: isOwner,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "user" }) => {
      if (role === "admin") {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-members-roles"] });
      setPendingChange(null);
      toast({
        title: vars.role === "admin" ? "Admin added" : "Admin removed",
        description: vars.role === "admin"
          ? "This member now has admin access."
          : "Admin access has been removed.",
      });
    },
    onError: (e: any) => {
      toast({ title: "Failed to update role", description: e.message, variant: "destructive" });
    },
  });

  const getInitials = (name: string | null) =>
    (name ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Crown className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">Only owners can manage roles.</p>
        </CardContent>
      </Card>
    );
  }

  const owners = members?.filter((m) => m.role === "owner") ?? [];
  const admins = members?.filter((m) => m.role === "admin") ?? [];
  const regularMembers = members?.filter((m) => m.role === "user") ?? [];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <CardContent className="py-4">
            <Crown className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{owners.length}</p>
            <p className="text-xs text-muted-foreground">Owners</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-4">
            <ShieldCheck className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{admins.length}</p>
            <p className="text-xs text-muted-foreground">Admins</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-4">
            <User className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-2xl font-bold">{regularMembers.length}</p>
            <p className="text-xs text-muted-foreground">Members</p>
          </CardContent>
        </Card>
      </div>

      {/* Member list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCog className="w-4 h-4" />
            Role Management
          </CardTitle>
          <CardDescription>
            Promote members to admin so they can review applications and manage the community.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner text="Loading members…" />
            </div>
          ) : (
            <div className="space-y-2">
              {members?.map((member) => {
                const isCurrentUser = member.user_id === user?.id;
                const isOwnerRole = member.role === "owner";
                return (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member.full_name || "Unnamed"}
                          {isCurrentUser && <span className="text-muted-foreground ml-1">(you)</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwnerRole && (
                        <Badge className="bg-amber-500/10 text-amber-600 border-0">
                          <Crown className="w-3 h-3 mr-1" /> Owner
                        </Badge>
                      )}
                      {member.role === "admin" && (
                        <Badge className="bg-primary/10 text-primary border-0">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Admin
                        </Badge>
                      )}
                      {!isOwnerRole && !isCurrentUser && (
                        <Button
                          size="sm"
                          variant={member.role === "admin" ? "outline" : "default"}
                          className="h-7 text-xs"
                          onClick={() => setPendingChange({ member, newRole: member.role === "admin" ? "user" : "admin" })}
                        >
                          {member.role === "admin" ? (
                            <><ShieldMinus className="w-3 h-3 mr-1" /> Remove admin</>
                          ) : (
                            <><ShieldPlus className="w-3 h-3 mr-1" /> Make admin</>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingChange} onOpenChange={() => setPendingChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingChange?.newRole === "admin" ? "Make admin?" : "Remove admin?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingChange?.newRole === "admin"
                ? `${pendingChange.member.full_name} will be able to review applications, manage members, and access the admin dashboard.`
                : `${pendingChange?.member.full_name} will lose admin access and return to a regular member.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingChange && updateRoleMutation.mutate({
                userId: pendingChange.member.user_id,
                role: pendingChange.newRole,
              })}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? <LoadingSpinner size="sm" /> : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
