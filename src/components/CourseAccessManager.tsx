import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserPlus, X, Search, Check } from "lucide-react";

interface Course {
  id: string;
  title: string;
  access_type: "free" | "paid" | "subscription";
}

interface CourseAccess {
  id: string;
  user_id: string;
  course_id: string;
  granted_by: string;
  granted_at: string;
  revoked_at: string | null;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  company_name: string | null;
}

interface CourseAccessManagerProps {
  course: Course;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CourseAccessManager({ course, open, onOpenChange }: CourseAccessManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch current access grants
  const { data: accessGrants, isLoading: accessLoading } = useQuery({
    queryKey: ["course-access", course.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_access")
        .select("*")
        .eq("course_id", course.id)
        .is("revoked_at", null);

      if (error) throw error;
      return data as CourseAccess[];
    },
    enabled: open,
  });

  // Fetch profiles for users with access
  const { data: accessProfiles } = useQuery({
    queryKey: ["course-access-profiles", accessGrants?.map((a) => a.user_id)],
    queryFn: async () => {
      if (!accessGrants || accessGrants.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, job_title, company_name")
        .in(
          "user_id",
          accessGrants.map((a) => a.user_id)
        );

      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!accessGrants && accessGrants.length > 0,
  });

  // Search for users to grant access
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["user-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, job_title, company_name")
        .ilike("full_name", `%${searchQuery}%`)
        .eq("status", "approved")
        .limit(10);

      if (error) throw error;
      return data as Profile[];
    },
    enabled: searchQuery.length >= 2,
  });

  // Grant access mutation
  const grantAccessMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("course_access").upsert(
        {
          user_id: userId,
          course_id: course.id,
          granted_by: user!.id,
          revoked_at: null,
        },
        { onConflict: "user_id,course_id" }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-access", course.id] });
      toast({ title: "Access granted", description: "User now has access to this course." });
      setSearchQuery("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Revoke access mutation
  const revokeAccessMutation = useMutation({
    mutationFn: async (accessId: string) => {
      const { error } = await supabase
        .from("course_access")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", accessId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-access", course.id] });
      toast({ title: "Access revoked" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getProfileForUser = (userId: string) => {
    return accessProfiles?.find((p) => p.user_id === userId);
  };

  const userHasAccess = (userId: string) => {
    return accessGrants?.some((a) => a.user_id === userId && !a.revoked_at);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Course Access</DialogTitle>
          <DialogDescription>
            Grant or revoke access to <strong>{course.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Search & Add Users */}
          <div className="space-y-3">
            <Label>Add User</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {searchQuery.length >= 2 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {searchLoading ? (
                  <div className="p-4 text-center">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : searchResults?.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No users found
                  </div>
                ) : (
                  searchResults?.map((profile) => {
                    const hasAccess = userHasAccess(profile.user_id);
                    return (
                      <div
                        key={profile.user_id}
                        className="flex items-center justify-between p-3 hover:bg-muted/50 border-b last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(profile.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{profile.full_name}</p>
                            {profile.job_title && (
                              <p className="text-xs text-muted-foreground">
                                {profile.job_title}
                                {profile.company_name && ` at ${profile.company_name}`}
                              </p>
                            )}
                          </div>
                        </div>
                        {hasAccess ? (
                          <Badge variant="secondary">
                            <Check className="w-3 h-3 mr-1" />
                            Has Access
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => grantAccessMutation.mutate(profile.user_id)}
                            disabled={grantAccessMutation.isPending}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Grant
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Current Access List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Users with Access</Label>
              <Badge variant="outline">{accessGrants?.length || 0} users</Badge>
            </div>

            {accessLoading ? (
              <LoadingSpinner size="sm" />
            ) : accessGrants?.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg">
                No users have been granted access yet.
              </div>
            ) : (
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {accessGrants?.map((access) => {
                  const profile = getProfileForUser(access.user_id);
                  return (
                    <div
                      key={access.id}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(profile?.full_name || null)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{profile?.full_name || "Unknown User"}</p>
                          <p className="text-xs text-muted-foreground">
                            Granted {new Date(access.granted_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Revoke access for this user?")) {
                            revokeAccessMutation.mutate(access.id);
                          }
                        }}
                        disabled={revokeAccessMutation.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
