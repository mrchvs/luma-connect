import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  UserMinus, 
  Sparkles, 
  Clock, 
  Eye,
  Building2,
  DollarSign,
  FileText,
} from "lucide-react";
import { useAllMentorApplications, MentorApplication } from "@/hooks/use-mentor-application";

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

interface ApplicationWithProfile extends MentorApplication {
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    job_title: string | null;
    company_name: string | null;
  } | null;
}

export function AdminMentors() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [viewDialog, setViewDialog] = useState<{ open: boolean; application: ApplicationWithProfile | null }>({
    open: false,
    application: null,
  });
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; applicationId: string | null; reason: string }>({
    open: false,
    applicationId: null,
    reason: "",
  });
  const [revokeDialog, setRevokeDialog] = useState<{ open: boolean; userId: string | null; name: string }>({
    open: false,
    userId: null,
    name: "",
  });

  // Fetch mentor applications
  const { data: applications, isLoading: applicationsLoading } = useAllMentorApplications();

  // Fetch users with mentor role
  const { data: mentors, isLoading: mentorsLoading } = useQuery({
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

  // Fetch profiles for applications
  const { data: applicationsWithProfiles } = useQuery({
    queryKey: ["admin-mentor-applications-profiles", applications],
    queryFn: async () => {
      if (!applications || applications.length === 0) return [];
      
      const userIds = applications.map(a => a.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, job_title, company_name")
        .in("user_id", userIds);

      return applications.map(app => ({
        ...app,
        profile: profiles?.find(p => p.user_id === app.user_id) || null,
      })) as ApplicationWithProfile[];
    },
    enabled: !!applications && applications.length > 0,
  });

  const approveMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const application = applications?.find(a => a.id === applicationId);
      if (!application) throw new Error("Application not found");

      // Update application status
      const { error: updateError } = await supabase
        .from("mentor_applications")
        .update({ 
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq("id", applicationId);

      if (updateError) throw updateError;

      // Assign mentor role via edge function
      const { data, error } = await supabase.functions.invoke("admin-role-management", {
        body: { action: "update_role", userId: application.user_id, role: "mentor" },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-mentors"] });
      queryClient.invalidateQueries({ queryKey: ["admin-mentor-applications-profiles"] });
      toast.success("Mentor application approved!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to approve application");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ applicationId, reason }: { applicationId: string; reason: string }) => {
      const { error } = await supabase
        .from("mentor_applications")
        .update({ 
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          rejection_reason: reason || null,
        })
        .eq("id", applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-mentor-applications-profiles"] });
      setRejectDialog({ open: false, applicationId: null, reason: "" });
      toast.success("Application rejected");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reject application");
    },
  });

  const revokeMentorMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Remove mentor role via edge function
      const { data, error } = await supabase.functions.invoke("admin-role-management", {
        body: { action: "update_role", userId, role: "user" },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Update application status if exists
      await supabase
        .from("mentor_applications")
        .update({ status: "revoked" })
        .eq("user_id", userId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-mentors"] });
      queryClient.invalidateQueries({ queryKey: ["mentor-applications"] });
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

  const pendingApplications = applicationsWithProfiles?.filter(a => a.status === "pending_review") || [];
  const rejectedApplications = applicationsWithProfiles?.filter(a => a.status === "rejected") || [];

  const isLoading = applicationsLoading || mentorsLoading;

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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending
            {pendingApplications.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingApplications.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Approved
            {mentors && mentors.length > 0 && (
              <Badge variant="secondary" className="ml-1">{mentors.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Rejected
          </TabsTrigger>
        </TabsList>

        {/* Pending Applications */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-warning" />
                <div>
                  <CardTitle>Pending Applications</CardTitle>
                  <CardDescription>
                    Review and approve mentor applications
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pendingApplications.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No pending applications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingApplications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={app.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(app.profile?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {app.profile?.full_name || "Unnamed"}
                          </p>
                          {app.profile?.job_title && app.profile?.company_name && (
                            <p className="text-sm text-muted-foreground">
                              {app.profile.job_title} at {app.profile.company_name}
                            </p>
                          )}
                          <div className="flex items-center gap-1 mt-1">
                            <Sparkles className="w-3 h-3 text-primary" />
                            <span className="text-xs text-muted-foreground">
                              {app.expertise_areas.slice(0, 3).join(", ")}
                              {app.expertise_areas.length > 3 && ` +${app.expertise_areas.length - 3}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewDialog({ open: true, application: app })}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRejectDialog({ open: true, applicationId: app.id, reason: "" })}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(app.id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approved Mentors */}
        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle>Approved Mentors</CardTitle>
                  <CardDescription>
                    Active mentors on the platform
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!mentors || mentors.length === 0 ? (
                <div className="text-center py-8">
                  <GraduationCap className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No approved mentors yet</p>
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
                                Profile Complete
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Profile Incomplete
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
        </TabsContent>

        {/* Rejected Applications */}
        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-destructive" />
                <div>
                  <CardTitle>Rejected Applications</CardTitle>
                  <CardDescription>
                    Previously rejected mentor applications
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {rejectedApplications.length === 0 ? (
                <div className="text-center py-8">
                  <XCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No rejected applications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rejectedApplications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={app.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            {getInitials(app.profile?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {app.profile?.full_name || "Unnamed"}
                          </p>
                          {app.rejection_reason && (
                            <p className="text-sm text-muted-foreground">
                              Reason: {app.rejection_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewDialog({ open: true, application: app })}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Application Dialog */}
      <Dialog open={viewDialog.open} onOpenChange={(open) => setViewDialog({ open, application: null })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={viewDialog.application?.profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(viewDialog.application?.profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p>{viewDialog.application?.profile?.full_name || "Unnamed"}</p>
                <p className="text-sm font-normal text-muted-foreground">
                  Mentor Application
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {viewDialog.application && (
            <div className="space-y-6 mt-4">
              {/* Expertise */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h4 className="font-medium">Areas of Expertise</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {viewDialog.application.expertise_areas.map((area) => (
                    <Badge key={area}>{area}</Badge>
                  ))}
                </div>
              </div>

              {/* Industries */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h4 className="font-medium">Industries</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {viewDialog.application.industries.map((industry) => (
                    <Badge key={industry} variant="secondary">{industry}</Badge>
                  ))}
                </div>
              </div>

              {/* Services */}
              {viewDialog.application.services_description && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <h4 className="font-medium">Planned Services</h4>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {viewDialog.application.services_description}
                  </p>
                </div>
              )}

              {/* Pricing */}
              {viewDialog.application.pricing_info && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <h4 className="font-medium">Pricing</h4>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {viewDialog.application.pricing_info}
                  </p>
                </div>
              )}

              {/* Mentor Bio */}
              {viewDialog.application.mentor_bio && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    <h4 className="font-medium">Mentor Bio</h4>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {viewDialog.application.mentor_bio}
                  </p>
                </div>
              )}

              {/* Actions for pending applications */}
              {viewDialog.application.status === "pending_review" && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={() => {
                      setViewDialog({ open: false, application: null });
                      setRejectDialog({ open: true, applicationId: viewDialog.application!.id, reason: "" });
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      approveMutation.mutate(viewDialog.application!.id);
                      setViewDialog({ open: false, application: null });
                    }}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Application?</AlertDialogTitle>
            <AlertDialogDescription>
              Provide optional feedback to help the applicant improve their application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)..."
            value={rejectDialog.reason}
            onChange={(e) => setRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (rejectDialog.applicationId) {
                  rejectMutation.mutate({ 
                    applicationId: rejectDialog.applicationId, 
                    reason: rejectDialog.reason 
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject Application
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
