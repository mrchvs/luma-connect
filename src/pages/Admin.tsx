import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { AdminLockedAccounts } from "@/components/AdminLockedAccounts";
import { AdminInviteMembers } from "@/components/AdminInviteMembers";
import { AdminRoleManagement } from "@/components/AdminRoleManagement";
import { AdminWaitlist } from "@/components/AdminWaitlist";
import { AdminFeedback } from "@/components/AdminFeedback";
import { AdminAsks } from "@/components/AdminAsks";
import { AdminMomentumGroups } from "@/components/AdminMomentumGroups";
import { AdminResources } from "@/components/AdminResources";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  MapPin,
  Globe,
  Linkedin,
  Link as LinkIcon,
  Briefcase,
  ExternalLink,
  MessageSquare,
  Mail,
  Users,
  Shield,
  UserPlus,
  Crown,
  Sparkles,
  MessageSquare as FeedbackIcon,
  MessageCircle,
  Target,
  Trash2,
  BookOpen,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  city: string | null;
  country: string | null;
  timezone: string | null;
  languages: string[];
  short_bio: string | null;
  bio_long: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  portfolio_url: string | null;
  instagram_url: string | null;
  company_name: string | null;
  job_title: string | null;
  years_experience: number | null;
  proof_links: string[];
  credibility_confirmed: boolean;
  completed: boolean;
  status: "pending_review" | "approved" | "rejected" | "suspended";
  created_at: string;
  admin_notes?: { notes: string | null } | null;
}

type ProfileStatus = "pending_review" | "approved" | "rejected" | "suspended";

export default function Admin() {
  const { user, isAdmin, isOwner, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { section: sectionParam } = useParams<{ section?: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionDialog, setActionDialog] = useState<{ open: boolean; action: ProfileStatus | null }>({
    open: false,
    action: null,
  });
  const [activeTab, setActiveTab] = useState<ProfileStatus>(
    (searchParams.get("status") as ProfileStatus) ?? "approved"
  );
  const adminSection = sectionParam ?? "members";
  const [showInviteForm, setShowInviteForm] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (!loading && user && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin dashboard.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [user, isAdmin, loading, navigate, toast]);

  // Fetch profile counts for all statuses
  const { data: profileCounts } = useQuery({
    queryKey: ["admin-profile-counts"],
    queryFn: async () => {
      const statuses: ProfileStatus[] = ["pending_review", "approved", "rejected", "suspended"];
      const counts: Record<ProfileStatus, number> = {
        pending_review: 0,
        approved: 0,
        rejected: 0,
        suspended: 0,
      };
      
      for (const status of statuses) {
        const { count, error } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", status)
          .eq("completed", true);
        
        if (!error && count !== null) {
          counts[status] = count;
        }
      }
      
      return counts;
    },
    enabled: isAdmin,
  });

  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ["admin-profiles", activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          admin_notes(notes)
        `)
        .eq("status", activeTab)
        .eq("completed", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Profile[];
    },
    enabled: isAdmin,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ profileId, userId, status, notes, rejectionReason }: { profileId: string; userId: string; status: ProfileStatus; notes: string; rejectionReason?: string }) => {
      // Update profile status directly
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ status })
        .eq("id", profileId);
      if (profileError) throw profileError;

      // Save admin notes if provided
      if (notes?.trim()) {
        const { error: notesError } = await supabase
          .from("admin_notes")
          .upsert({ profile_id: profileId, notes }, { onConflict: "profile_id" });
        if (notesError) throw notesError;
      }

      // Check if approved user is in a momentum cohort
      let approvedLink = "/dashboard";
      if (status === "approved") {
        const { data: cohortMember } = await supabase
          .from("accountability_cycle_members")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (cohortMember) approvedLink = "/momentum";
      }

      // Send in-app notification to the user
      const notificationContent = status === "approved"
        ? {
            title: "Welcome to Luma Circle! 🎉",
            body: approvedLink === "/momentum"
              ? "You're in! Head to Monday Momentum to set your monthly goal and get started."
              : "Your profile has been approved. You can now explore the community.",
            link: approvedLink,
          }
        : status === "rejected"
        ? { title: "Application update", body: rejectionReason || "Your application was not approved at this time.", link: "/dashboard" }
        : status === "suspended"
        ? { title: "Account suspended", body: "Your account has been suspended. Please contact us if you think this is a mistake.", link: "/dashboard" }
        : null;

      if (notificationContent) {
        await supabase.from("notifications").insert({ user_id: userId, ...notificationContent });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      setSelectedProfile(null);
      setAdminNotes("");
      setRejectionReason("");
      setActionDialog({ open: false, action: null });
      toast({
        title: "Status updated",
        description: "The profile status has been updated and the user has been notified.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [deleteDialog, setDeleteDialog] = useState(false);

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Fire the delete. We intentionally never throw here — Supabase's
      // auth.admin.deleteUser sometimes returns an error object even when
      // the deletion fully succeeded, causing a false error toast. The
      // onSuccess list-refresh is the source of truth: if the user is gone,
      // it worked.
      await supabase.functions.invoke("admin-invite-member", {
        body: { action: "delete_user", userId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      setSelectedProfile(null);
      setDeleteDialog(false);
      toast({ title: "User deleted", description: "The user account has been permanently removed." });
    },
  });

  const handleAction = (action: ProfileStatus) => {
    setActionDialog({ open: true, action });
  };

  const confirmAction = () => {
    if (selectedProfile && actionDialog.action) {
      updateStatusMutation.mutate({
        profileId: selectedProfile.id,
        userId: selectedProfile.user_id,
        status: actionDialog.action,
        notes: adminNotes,
        rejectionReason: rejectionReason,
      });
    }
  };

  const statusConfig = {
    pending_review: { icon: Clock, color: "text-warning", bg: "bg-warning/10", label: "Pending Review" },
    approved: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Approved" },
    rejected: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Rejected" },
    suspended: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", label: "Suspended" },
  };

  if (loading || profilesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F2E9" }}>
        <LoadingSpinner size="lg" text="Loading admin dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F7F2E9" }}>
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Logo size="sm" />
            <Badge variant="secondary" className="font-medium">Admin</Badge>
          </div>
        </div>
      </header>

      <main className="container py-8 px-4">
        <div className="mb-8">
          <p className="text-xs font-bold tracking-widest uppercase text-primary mb-1">Admin</p>
          <h1 className="font-display text-3xl font-semibold leading-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage profiles, email templates, and security</p>
        </div>

        {/* Admin Section Tabs */}
        <Tabs value={adminSection} onValueChange={(v) => navigate(`/admin/${v}`)} className="space-y-6">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="asks" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Asks
            </TabsTrigger>
            <TabsTrigger value="momentum" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Momentum
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <FeedbackIcon className="w-4 h-4" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
            {isOwner && (
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Roles
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profiles/Members Tab */}
          <TabsContent value="members">
            <Tabs defaultValue="manage">
              <TabsList className="mb-4">
                <TabsTrigger value="manage" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Manage Members
                </TabsTrigger>
                <TabsTrigger value="invite" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Invite Members
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manage">
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Profile List */}
                  <div className="lg:col-span-1 space-y-4">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProfileStatus)}>
                      <TabsList className="grid grid-cols-2 mb-4">
                        <TabsTrigger value="approved" className="text-xs">
                          Approved ({profileCounts?.approved ?? 0})
                        </TabsTrigger>
                        <TabsTrigger value="pending_review" className="text-xs">
                          Pending ({profileCounts?.pending_review ?? 0})
                        </TabsTrigger>
                      </TabsList>
                      <TabsList className="grid grid-cols-2">
                        <TabsTrigger value="suspended" className="text-xs">
                          Suspended ({profileCounts?.suspended ?? 0})
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className="text-xs">
                          Rejected ({profileCounts?.rejected ?? 0})
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {profiles?.length === 0 && (
                        <Card className="bg-muted/50">
                          <CardContent className="py-8 text-center">
                            <p className="text-muted-foreground">No profiles in this category</p>
                          </CardContent>
                        </Card>
                      )}
                      
                      {profiles?.map((profile) => (
                        <Card
                          key={profile.id}
                          className={`cursor-pointer transition-all hover:shadow-card ${
                            selectedProfile?.id === profile.id ? "ring-2 ring-primary shadow-card" : ""
                          }`}
                          onClick={() => {
                            setSelectedProfile(profile);
                            setAdminNotes(profile.admin_notes?.notes || "");
                          }}
                        >
                          <CardContent className="py-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-medium">{profile.full_name || "Unnamed"}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {profile.city}, {profile.country}
                                </p>
                                {profile.job_title && profile.company_name && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {profile.job_title} at {profile.company_name}
                                  </p>
                                )}
                              </div>
                              <div className={`p-1.5 rounded-full ${statusConfig[profile.status].bg}`}>
                                {(() => {
                                  const Icon = statusConfig[profile.status].icon;
                                  return <Icon className={`w-4 h-4 ${statusConfig[profile.status].color}`} />;
                                })()}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

              {/* Profile Detail */}
              <div className="lg:col-span-2">
                {!selectedProfile ? (
                  <Card className="h-full flex items-center justify-center bg-muted/30">
                    <CardContent className="text-center py-16">
                      <User className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">Select a profile to review</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="animate-scale-in">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="font-display text-2xl">
                            {selectedProfile.full_name}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <MapPin className="w-4 h-4" />
                            {selectedProfile.city}, {selectedProfile.country}
                            <span className="text-muted-foreground/50">•</span>
                            <Globe className="w-4 h-4" />
                            {selectedProfile.timezone}
                          </CardDescription>
                        </div>
                        <Badge className={statusConfig[selectedProfile.status].bg + " " + statusConfig[selectedProfile.status].color}>
                          {statusConfig[selectedProfile.status].label}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      {/* Bio */}
                      <div>
                        <h4 className="font-medium mb-2">Bio</h4>
                        <p className="text-muted-foreground">{selectedProfile.short_bio}</p>
                        {selectedProfile.bio_long && (
                          <p className="text-muted-foreground mt-2 text-sm">{selectedProfile.bio_long}</p>
                        )}
                      </div>

                      {/* Languages */}
                      <div>
                        <h4 className="font-medium mb-2">Languages</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedProfile.languages?.map((lang) => (
                            <Badge key={lang} variant="secondary">{lang}</Badge>
                          ))}
                        </div>
                      </div>

                      {/* Professional Info */}
                      {(selectedProfile.company_name || selectedProfile.job_title) && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Professional
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {selectedProfile.job_title && (
                              <div>
                                <span className="text-muted-foreground">Title:</span>{" "}
                                {selectedProfile.job_title}
                              </div>
                            )}
                            {selectedProfile.company_name && (
                              <div>
                                <span className="text-muted-foreground">Company:</span>{" "}
                                {selectedProfile.company_name}
                              </div>
                            )}
                            {selectedProfile.years_experience && (
                              <div>
                                <span className="text-muted-foreground">Experience:</span>{" "}
                                {selectedProfile.years_experience} years
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Credibility Links */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <LinkIcon className="w-4 h-4" />
                          Credibility Links
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedProfile.linkedin_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={selectedProfile.linkedin_url} target="_blank" rel="noopener noreferrer">
                                <Linkedin className="w-4 h-4 mr-1" />
                                LinkedIn
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </Button>
                          )}
                          {selectedProfile.website_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={selectedProfile.website_url} target="_blank" rel="noopener noreferrer">
                                <Globe className="w-4 h-4 mr-1" />
                                Website
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </Button>
                          )}
                          {selectedProfile.portfolio_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={selectedProfile.portfolio_url} target="_blank" rel="noopener noreferrer">
                                <LinkIcon className="w-4 h-4 mr-1" />
                                Portfolio
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </Button>
                          )}
                          {selectedProfile.instagram_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={selectedProfile.instagram_url} target="_blank" rel="noopener noreferrer">
                                Instagram
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </Button>
                          )}
                        </div>
                        {selectedProfile.credibility_confirmed && (
                          <p className="text-xs text-success mt-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            User confirmed links are accurate
                          </p>
                        )}
                      </div>

                      {/* Admin Notes */}
                      <div>
                        <Label htmlFor="admin-notes" className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4" />
                          Admin Notes (internal only)
                        </Label>
                        <Textarea
                          id="admin-notes"
                          placeholder="Add internal notes about this profile..."
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          className="min-h-[100px]"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3 pt-4 border-t justify-between">
                        {selectedProfile.status !== "approved" && (
                          <Button
                            variant="success"
                            onClick={() => handleAction("approved")}
                            disabled={updateStatusMutation.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                        )}
                        {selectedProfile.status !== "rejected" && (
                          <Button
                            variant="destructive"
                            onClick={() => handleAction("rejected")}
                            disabled={updateStatusMutation.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        )}
                        {selectedProfile.status !== "suspended" && selectedProfile.status !== "rejected" && (
                          <Button
                            variant="outline"
                            onClick={() => handleAction("suspended")}
                            disabled={updateStatusMutation.isPending}
                          >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Suspend
                          </Button>
                        )}
                        {selectedProfile.status !== "pending_review" && (
                          <Button
                            variant="secondary"
                            onClick={() => handleAction("pending_review")}
                            disabled={updateStatusMutation.isPending}
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Move to Pending
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                          onClick={() => setDeleteDialog(true)}
                          disabled={deleteUserMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete user
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                </div>
              </div>
              </TabsContent>
              
              <TabsContent value="invite">
                <AdminInviteMembers />
              </TabsContent>
            </Tabs>
          </TabsContent>


          <TabsContent value="momentum">
            <AdminMomentumGroups initialCycleId={searchParams.get("cycle") ?? undefined} />
          </TabsContent>

          <TabsContent value="asks">
            <AdminAsks />
          </TabsContent>

          <TabsContent value="resources">
            <AdminResources />
          </TabsContent>

          <TabsContent value="feedback">
            <AdminFeedback />
          </TabsContent>

          <TabsContent value="roles">
            <AdminRoleManagement />
          </TabsContent>


          <TabsContent value="security">
            <AdminLockedAccounts />
          </TabsContent>
        </Tabs>
      </main>

      {/* Confirmation Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => {
        setActionDialog({ ...actionDialog, open });
        if (!open) setRejectionReason("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              Confirm {actionDialog.action === "approved" ? "Approval" : actionDialog.action === "rejected" ? "Rejection" : actionDialog.action === "suspended" ? "Suspension" : "Status Change"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "approved" && "This user will be able to access the community."}
              {actionDialog.action === "rejected" && "This user will not be approved. You can add a reason that will be included in their notification."}
              {actionDialog.action === "suspended" && "This user's access will be suspended."}
              {actionDialog.action === "pending_review" && "This profile will be moved back to pending review."}
            </DialogDescription>
          </DialogHeader>
          
          {actionDialog.action === "rejected" && (
            <div className="space-y-2 py-4">
              <Label htmlFor="rejection-reason">Rejection Reason (will be sent to user)</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please provide a reason for the rejection... (e.g., incomplete profile, unverifiable credentials)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setActionDialog({ open: false, action: null });
              setRejectionReason("");
            }}>
              Cancel
            </Button>
            <Button
              variant={actionDialog.action === "approved" ? "default" : "destructive"}
              onClick={confirmAction}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? <LoadingSpinner size="sm" /> : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete user confirmation */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-destructive">Delete user</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{selectedProfile?.full_name ?? "this user"}</strong>'s account and all their data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedProfile && deleteUserMutation.mutate(selectedProfile.user_id)}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? <LoadingSpinner size="sm" /> : <><Trash2 className="w-4 h-4 mr-2" />Delete permanently</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
