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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Crown, ShieldCheck, User, UserCog, Info, GraduationCap } from "lucide-react";

interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "admin" | "mentor" | "user";
  is_mentor?: boolean;
}

export function AdminRoleManagement() {
  const { isOwner, isAdmin, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userId: string;
    email: string;
    currentRole: string;
    newRole: "admin" | "mentor" | "user";
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
    enabled: isOwner || isAdmin,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "mentor" | "user" }) => {
      const { data, error } = await supabase.functions.invoke("admin-role-management", {
        body: { action: "update_role", userId, role },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-mentors"] });
      queryClient.invalidateQueries({ queryKey: ["mentor-applications"] });
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
      case "mentor":
        return (
          <Badge className="bg-purple-500/10 text-purple-600 border-0">
            <GraduationCap className="w-3 h-3 mr-1" />
            Mentor
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

  if (!isOwner && !isAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Crown className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">Only owners and admins can manage user roles.</p>
        </CardContent>
      </Card>
    );
  }

  const owners = users?.filter((u) => u.role === "owner") || [];
  const admins = users?.filter((u) => u.role === "admin") || [];
  const mentors = users?.filter((u) => u.role === "mentor") || [];

  const getConfirmationMessage = () => {
    if (!pendingRoleChange) return null;
    
    const { currentRole, newRole, email } = pendingRoleChange;
    
    if (newRole === "admin") {
      return (
        <span className="block mt-2 text-amber-600">
          This will give them full admin privileges including access to member management, application reviews, and admin tools.
        </span>
      );
    }
    if (newRole === "mentor") {
      return (
        <span className="block mt-2 text-purple-600">
          This will give them mentor status. They'll be prompted to complete their Mentor Profile and can offer paid services to the community.
        </span>
      );
    }
    if (currentRole === "admin" && newRole === "user") {
      return (
        <span className="block mt-2 text-destructive">
          This will remove their admin privileges. They will no longer be able to review applications, manage members, or access admin tools.
        </span>
      );
    }
    if (currentRole === "mentor" && newRole === "user") {
      return (
        <span className="block mt-2 text-destructive">
          This will revoke their mentor status. Their Mentor Profile will be hidden and they won't be able to offer paid services.
        </span>
      );
    }
    return null;
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Stats with permission tooltips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm text-muted-foreground">Owners</p>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium mb-1">Owner Permissions</p>
                        <ul className="text-xs space-y-1">
                          <li>• Full platform access</li>
                          <li>• Manage all users and admins</li>
                          <li>• Change user roles</li>
                          <li>• Access all admin features</li>
                          <li>• Cannot be demoted</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </div>
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
                  <div className="flex items-center gap-1">
                    <p className="text-sm text-muted-foreground">Admins</p>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium mb-1">Admin Permissions</p>
                        <ul className="text-xs space-y-1">
                          <li>• Review and approve applications</li>
                          <li>• Manage member profiles</li>
                          <li>• Approve/reject mentor applications</li>
                          <li>• Edit email templates</li>
                          <li>• Access admin dashboard</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </div>
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
                  <div className="flex items-center gap-1">
                    <p className="text-sm text-muted-foreground">Mentors</p>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium mb-1">Mentor Permissions</p>
                        <ul className="text-xs space-y-1">
                          <li>• All member permissions</li>
                          <li>• Create Mentor Profile</li>
                          <li>• Offer paid services</li>
                          <li>• Receive booking requests</li>
                          <li>• Display mentor badge</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold">{mentors.length}</p>
                </div>
                <div className="p-2 rounded-full bg-purple-500/10">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm text-muted-foreground">Members</p>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium mb-1">Member Permissions</p>
                        <ul className="text-xs space-y-1">
                          <li>• Browse other members</li>
                          <li>• Send connection requests</li>
                          <li>• Manage own profile</li>
                          <li>• View matches</li>
                          <li>• No admin access</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </div>
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
              {isOwner 
                ? "Manage user roles. You can assign Admin, Mentor, or User roles."
                : "Manage mentor roles. Only owners can assign admin roles."
              }
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
                      const isAdminRole = userItem.role === "admin";

                      // Non-owners can't change admin roles
                      const canChangeRole = isOwner || (!isAdminRole && !isOwnerRole);

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
                            ) : !canChangeRole ? (
                              <span className="text-sm text-muted-foreground">Owner required</span>
                            ) : (
                              <Select
                                value={userItem.role}
                                onValueChange={(value: "admin" | "mentor" | "user") => {
                                  if (value !== userItem.role) {
                                    setPendingRoleChange({
                                      userId: userItem.user_id,
                                      email: userItem.email,
                                      currentRole: userItem.role,
                                      newRole: value,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {isOwner && <SelectItem value="admin">Admin</SelectItem>}
                                  <SelectItem value="mentor">Mentor</SelectItem>
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
                {pendingRoleChange?.newRole === "user" && pendingRoleChange?.currentRole === "admin"
                  ? "Demote Admin to Member?"
                  : pendingRoleChange?.newRole === "user" && pendingRoleChange?.currentRole === "mentor"
                  ? "Revoke Mentor Status?"
                  : "Confirm Role Change"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to change the role of{" "}
                <strong>{pendingRoleChange?.email}</strong> to{" "}
                <strong>
                  {pendingRoleChange?.newRole === "admin" 
                    ? "Administrator" 
                    : pendingRoleChange?.newRole === "mentor"
                    ? "Mentor"
                    : "Member"}
                </strong>?
                {getConfirmationMessage()}
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
    </TooltipProvider>
  );
}
