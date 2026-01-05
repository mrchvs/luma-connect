import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/LoadingSpinner";
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
import { toast } from "sonner";
import { GraduationCap, CheckCircle2, XCircle, UserMinus, Sparkles } from "lucide-react";

interface MentorWithProfile {
  user_id: string;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    job_title: string | null;
    company_name: string | null;
  } | null;
  mentor_profile: {
    id: string;
    headline: string;
    expertise_areas: string[];
    is_complete: boolean;
    is_active: boolean;
  } | null;
}

export function AdminMentors() {
  const queryClient = useQueryClient();
  const [revokeDialog, setRevokeDialog] = useState<{ open: boolean; userId: string | null; name: string }>({
    open: false,
    userId: null,
    name: "",
  });

  // Fetch users with mentor role
  const { data: mentors, isLoading } = useQuery({
    queryKey: ["admin-mentors"],
    queryFn: async () => {
      // Get all users with mentor role
      const { data: mentorRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "mentor");

      if (rolesError) throw rolesError;
      if (!mentorRoles || mentorRoles.length === 0) return [];

      const userIds = mentorRoles.map((r) => r.user_id);

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, job_title, company_name")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Get mentor profiles
      const { data: mentorProfiles, error: mpError } = await supabase
        .from("mentor_profiles")
        .select("id, user_id, headline, expertise_areas, is_complete, is_active")
        .in("user_id", userIds);

      if (mpError) throw mpError;

      // Combine data
      const result: MentorWithProfile[] = userIds.map((userId) => ({
        user_id: userId,
        profile: profiles?.find((p) => p.user_id === userId) || null,
        mentor_profile: mentorProfiles?.find((mp) => mp.user_id === userId) || null,
      }));

      return result;
    },
  });

  const revokeMentorMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Remove mentor role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "mentor");

      if (error) throw error;

      // Deactivate mentor profile if exists
      await supabase
        .from("mentor_profiles")
        .update({ is_active: false })
        .eq("user_id", userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-mentors"] });
      toast.success("Mentor status revoked");
      setRevokeDialog({ open: false, userId: null, name: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to revoke mentor status");
    },
  });

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <LoadingSpinner size="md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>Mentor Management</CardTitle>
              <CardDescription>
                View and manage approved mentors
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!mentors || mentors.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No mentors yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Assign the mentor role to members in the Roles tab
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {mentors.map((mentor) => (
                <div
                  key={mentor.user_id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={mentor.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(mentor.profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {mentor.profile?.full_name || "Unnamed"}
                        </p>
                        {mentor.mentor_profile?.is_complete ? (
                          <Badge variant="secondary" className="text-success bg-success/10 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Complete
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <XCircle className="w-3 h-3 mr-1" />
                            Incomplete
                          </Badge>
                        )}
                        {mentor.mentor_profile && !mentor.mentor_profile.is_active && (
                          <Badge variant="secondary" className="text-warning bg-warning/10 text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      {mentor.profile?.job_title && mentor.profile?.company_name && (
                        <p className="text-sm text-muted-foreground">
                          {mentor.profile.job_title} at {mentor.profile.company_name}
                        </p>
                      )}
                      {mentor.mentor_profile?.expertise_areas && mentor.mentor_profile.expertise_areas.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Sparkles className="w-3 h-3 text-primary" />
                          <span className="text-xs text-muted-foreground">
                            {mentor.mentor_profile.expertise_areas.slice(0, 3).join(", ")}
                            {mentor.mentor_profile.expertise_areas.length > 3 && ` +${mentor.mentor_profile.expertise_areas.length - 3}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      setRevokeDialog({
                        open: true,
                        userId: mentor.user_id,
                        name: mentor.profile?.full_name || "this member",
                      })
                    }
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke Confirmation */}
      <AlertDialog open={revokeDialog.open} onOpenChange={(open) => setRevokeDialog((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Mentor Status?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {revokeDialog.name}'s mentor badge and hide their mentor profile.
              Their existing bookings and messages will remain intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeDialog.userId && revokeMentorMutation.mutate(revokeDialog.userId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Mentor Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
