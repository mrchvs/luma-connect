import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Crown, ShieldCheck, User, UserCog } from "lucide-react";

interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "admin" | "user";
}

export function AdminRoleManagement() {
  const { isOwner, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userId: string;
    email: string;
    newRole: "admin" | "user";
  } | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-role-management", {
        body: { action: "list_users" },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.users as UserWithRole[];
    },
    enabled: isOwner,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "user" }) => {
      const { data, error } = await supabase.functions.invoke("admin-role-management", {
        body: { action: "update_role", userId, role },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-roles"] });
      setPendingRoleChange(null);
      toast({
        title: "Role updated",
        description: "The user's role has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-0">
            <Crown className="w-3 h-3 mr-1" />
            Owner
          </Badge>
        );
      case "admin":
        return (
          <Badge className="bg-primary/10 text-primary border-0">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground border-0">
            <User className="w-3 h-3 mr-1" />
            User
          </Badge>
        );
    }
  };

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Crown className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">Only owners can manage user roles.</p>
        </CardContent>
      </Card>
    );
  }

  const admins = users?.filter((u) => u.role === "admin") || [];
  const owners = users?.filter((u) => u.role === "owner") || [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Owners</p>
                <p className="text-2xl font-bold">{owners.length}</p>
              </div>
              <div className="p-2 rounded-full bg-amber-500/10">
                <Crown className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{admins.length}</p>
              </div>
              <div className="p-2 rounded-full bg-primary/10">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{users?.length || 0}</p>
              </div>
              <div className="p-2 rounded-full bg-muted">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Role Management
          </CardTitle>
          <CardDescription>
            Manage user roles. Owners can promote users to admin or demote admins to users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner text="Loading users..." />
            </div>
          ) : !users?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((userItem) => {
                    const isCurrentUser = userItem.user_id === user?.id;
                    const isOwnerRole = userItem.role === "owner";

                    return (
                      <TableRow key={userItem.user_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {userItem.full_name || "Unnamed User"}
                              {isCurrentUser && (
                                <span className="text-muted-foreground ml-2">(you)</span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">{userItem.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(userItem.role)}</TableCell>
                        <TableCell className="text-right">
                          {isOwnerRole ? (
                            <span className="text-sm text-muted-foreground">Cannot change</span>
                          ) : isCurrentUser ? (
                            <span className="text-sm text-muted-foreground">Cannot change own role</span>
                          ) : (
                            <Select
                              value={userItem.role}
                              onValueChange={(value: "admin" | "user") => {
                                if (value !== userItem.role) {
                                  setPendingRoleChange({
                                    userId: userItem.user_id,
                                    email: userItem.email,
                                    newRole: value,
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
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

      {/* Confirmation Dialog */}
      <AlertDialog open={!!pendingRoleChange} onOpenChange={() => setPendingRoleChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingRoleChange?.newRole === "user" ? "Demote Admin to Member?" : "Confirm Role Change"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the role of{" "}
              <strong>{pendingRoleChange?.email}</strong> to{" "}
              <strong>{pendingRoleChange?.newRole === "admin" ? "Administrator" : "Member"}</strong>?
              {pendingRoleChange?.newRole === "admin" && (
                <span className="block mt-2 text-amber-600">
                  This will give them full admin privileges including access to member management.
                </span>
              )}
              {pendingRoleChange?.newRole === "user" && (
                <span className="block mt-2 text-destructive">
                  This will remove their admin privileges. They will no longer be able to review applications, manage members, or access admin tools.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRoleChange) {
                  updateRoleMutation.mutate({
                    userId: pendingRoleChange.userId,
                    role: pendingRoleChange.newRole,
                  });
                }
              }}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? <LoadingSpinner size="sm" /> : "Confirm Change"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
