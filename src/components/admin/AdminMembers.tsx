import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { AdminInviteMembers } from "@/components/AdminInviteMembers";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, User, MapPin, Globe, Linkedin,
  Link as LinkIcon, Briefcase, ExternalLink, MessageSquare, Search, UserPlus,
  Trash2, ArrowRight, Sparkles,
} from "lucide-react";

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
  status: ProfileStatus;
  created_at: string;
  admin_notes?: { notes: string | null } | null;
}

type ProfileStatus = "pending_review" | "approved" | "rejected" | "suspended";

const STATUS_PILLS: { key: ProfileStatus; label: string }[] = [
  { key: "pending_review", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "suspended", label: "Suspended" },
  { key: "rejected", label: "Rejected" },
];

const statusConfig: Record<ProfileStatus, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  pending_review: { icon: Clock, color: "text-warning", bg: "bg-warning/10", label: "Pending Review" },
  approved: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Approved" },
  rejected: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Rejected" },
  suspended: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", label: "Suspended" },
};

function notificationFor(status: ProfileStatus, reason?: string, link = "/dashboard") {
  if (status === "approved") return { title: "Welcome to Luma Circle! 🎉", body: "Your profile has been approved. You can now explore the community.", link };
  if (status === "rejected") return { title: "Application update", body: reason || "Your application was not approved at this time.", link: "/dashboard" };
  if (status === "suspended") return { title: "Account suspended", body: "Your account has been suspended. Please contact us if you think this is a mistake.", link: "/dashboard" };
  return null;
}

export function AdminMembers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<ProfileStatus>(
    (searchParams.get("status") as ProfileStatus) ?? "pending_review"
  );
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [actionDialog, setActionDialog] = useState<{ open: boolean; action: ProfileStatus | null }>({ open: false, action: null });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: profileCounts } = useQuery({
    queryKey: ["admin-profile-counts"],
    queryFn: async () => {
      const statuses: ProfileStatus[] = ["pending_review", "approved", "rejected", "suspended"];
      const counts: Record<ProfileStatus, number> = { pending_review: 0, approved: 0, rejected: 0, suspended: 0 };
      for (const status of statuses) {
        const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", status).eq("completed", true);
        counts[status] = count ?? 0;
      }
      return counts;
    },
  });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles", activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`*, admin_notes(notes)`)
        .eq("status", activeTab)
        .eq("completed", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles ?? [];
    return (profiles ?? []).filter((p) =>
      [p.full_name, p.job_title, p.company_name, p.city, p.country].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [profiles, search]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    queryClient.invalidateQueries({ queryKey: ["admin-profile-counts"] });
    queryClient.invalidateQueries({ queryKey: ["admin-nav-counts"] });
  };

  // ---- Single status update (used by detail buttons + confirm dialog) ----
  const updateStatus = useMutation({
    mutationFn: async ({ profileId, userId, status, notes, reason }: { profileId: string; userId: string; status: ProfileStatus; notes?: string; reason?: string }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", profileId);
      if (error) throw error;
      if (notes?.trim()) {
        await supabase.from("admin_notes").upsert({ profile_id: profileId, notes }, { onConflict: "profile_id" });
      }
      let link = "/dashboard";
      if (status === "approved") {
        const { data: cohortMember } = await (supabase as any).from("accountability_cycle_members").select("id").eq("user_id", userId).maybeSingle();
        if (cohortMember) link = "/momentum";
      }
      const note = notificationFor(status, reason, link);
      if (note) await supabase.from("notifications").insert({ user_id: userId, ...note });
    },
    onSuccess: () => {
      invalidate();
      setAdminNotes("");
      setRejectionReason("");
      setActionDialog({ open: false, action: null });
      toast({ title: "Status updated", description: "The member has been notified." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ---- Bulk status update ----
  const bulkUpdate = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: ProfileStatus }) => {
      const { error } = await supabase.from("profiles").update({ status }).in("id", ids);
      if (error) throw error;
      const affected = (profiles ?? []).filter((p) => ids.includes(p.id));
      const notifs = affected.map((p) => ({ user_id: p.user_id, ...notificationFor(status) })).filter((n) => n.title);
      if (notifs.length) await supabase.from("notifications").insert(notifs as any);
    },
    onSuccess: (_d, { ids, status }) => {
      invalidate();
      setSelection(new Set());
      if (selectedProfile && ids.includes(selectedProfile.id)) setSelectedProfile(null);
      toast({ title: status === "approved" ? `${ids.length} approved` : `${ids.length} rejected` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.functions.invoke("admin-invite-member", { body: { action: "delete_user", userId } });
    },
    onSuccess: () => {
      invalidate();
      setSelectedProfile(null);
      setDeleteDialog(false);
      toast({ title: "User deleted", description: "The account has been permanently removed." });
    },
  });

  const selectProfile = (p: Profile) => {
    setSelectedProfile(p);
    setAdminNotes(p.admin_notes?.notes || "");
  };

  // Approve current pending member and jump to the next in the queue.
  const approveAndNext = () => {
    if (!selectedProfile) return;
    const idx = filtered.findIndex((p) => p.id === selectedProfile.id);
    const next = filtered[idx + 1] ?? filtered[idx - 1] ?? null;
    updateStatus.mutate(
      { profileId: selectedProfile.id, userId: selectedProfile.user_id, status: "approved", notes: adminNotes },
      { onSuccess: () => setSelectedProfile(next && next.id !== selectedProfile.id ? next : null) }
    );
  };

  const confirmAction = () => {
    if (!selectedProfile || !actionDialog.action) return;
    updateStatus.mutate(
      { profileId: selectedProfile.id, userId: selectedProfile.user_id, status: actionDialog.action, notes: adminNotes, reason: rejectionReason },
      { onSuccess: () => setSelectedProfile(null) }
    );
  };

  const toggleSelect = (id: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const allVisibleSelected = filtered.length > 0 && filtered.every((p) => selection.has(p.id));
  const toggleSelectAll = () => {
    setSelection((prev) => {
      if (filtered.every((p) => prev.has(p.id))) return new Set();
      return new Set(filtered.map((p) => p.id));
    });
  };

  const isPendingTab = activeTab === "pending_review";

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-primary mb-1">Community</p>
          <h1 className="font-display text-3xl font-semibold leading-tight">Members</h1>
          <p className="text-muted-foreground text-sm mt-1">Review applications and manage member access.</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" /> Invite member
        </Button>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_PILLS.map((pill) => {
          const active = activeTab === pill.key;
          return (
            <button
              key={pill.key}
              onClick={() => { setActiveTab(pill.key); setSelection(new Set()); setSelectedProfile(null); }}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {pill.label}
              <span className={`ml-2 ${active ? "opacity-90" : "text-muted-foreground/70"}`}>{profileCounts?.[pill.key] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search name, role, company, city…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-full" />
          </div>

          {filtered.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <Checkbox id="select-all" checked={allVisibleSelected} onCheckedChange={toggleSelectAll} />
              <Label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer">Select all ({filtered.length})</Label>
            </div>
          )}

          {/* Bulk action bar */}
          {selection.size > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-2">
              <span className="text-xs font-medium px-1">{selection.size} selected</span>
              <div className="flex-1" />
              <Button size="sm" variant="success" disabled={bulkUpdate.isPending} onClick={() => bulkUpdate.mutate({ ids: [...selection], status: "approved" })}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="destructive" disabled={bulkUpdate.isPending} onClick={() => bulkUpdate.mutate({ ids: [...selection], status: "rejected" })}>
                <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
              </Button>
            </div>
          )}

          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {isLoading && <LoadingSpinner size="sm" text="Loading…" />}
            {!isLoading && filtered.length === 0 && (
              <Card className="bg-muted/50"><CardContent className="py-8 text-center"><p className="text-muted-foreground text-sm">No members here</p></CardContent></Card>
            )}
            {filtered.map((profile) => {
              const Icon = statusConfig[profile.status].icon;
              return (
                <Card key={profile.id} className={`transition-all hover:shadow-card ${selectedProfile?.id === profile.id ? "ring-2 ring-primary shadow-card" : ""}`}>
                  <CardContent className="py-3 flex items-start gap-3">
                    <Checkbox className="mt-1" checked={selection.has(profile.id)} onCheckedChange={() => toggleSelect(profile.id)} aria-label={`Select ${profile.full_name ?? "member"}`} />
                    <button className="flex-1 text-left" onClick={() => selectProfile(profile)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-medium truncate">{profile.full_name || "Unnamed"}</h3>
                          <p className="text-sm text-muted-foreground truncate">{[profile.city, profile.country].filter(Boolean).join(", ")}</p>
                          {profile.job_title && profile.company_name && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{profile.job_title} at {profile.company_name}</p>
                          )}
                        </div>
                        <div className={`p-1.5 rounded-full ${statusConfig[profile.status].bg} shrink-0`}>
                          <Icon className={`w-4 h-4 ${statusConfig[profile.status].color}`} />
                        </div>
                      </div>
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {!selectedProfile ? (
            <Card className="h-full flex items-center justify-center bg-muted/30">
              <CardContent className="text-center py-16">
                <User className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Select a member to review</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="animate-scale-in">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-display text-2xl">{selectedProfile.full_name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <MapPin className="w-4 h-4" />{[selectedProfile.city, selectedProfile.country].filter(Boolean).join(", ")}
                      {selectedProfile.timezone && (<><span className="text-muted-foreground/50">•</span><Globe className="w-4 h-4" />{selectedProfile.timezone}</>)}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={statusConfig[selectedProfile.status].bg + " " + statusConfig[selectedProfile.status].color}>
                      {statusConfig[selectedProfile.status].label}
                    </Badge>
                    {(selectedProfile.years_experience ?? 0) >= 5 && (
                      <span className="inline-flex items-center gap-1 text-xs text-secondary-foreground"><Sparkles className="w-3 h-3" />Experienced</span>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* History timeline (best-effort from available fields) */}
                <div>
                  <h4 className="font-medium mb-2 text-sm">History</h4>
                  <ol className="space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" />Applied · {new Date(selectedProfile.created_at).toLocaleDateString()}</li>
                    {selectedProfile.completed && <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" />Completed profile</li>}
                    {selectedProfile.credibility_confirmed && <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-success" />Confirmed credibility links</li>}
                    {/* TODO: richer audit trail once an admin_audit_logs source is wired */}
                  </ol>
                </div>

                {/* Bio */}
                <div>
                  <h4 className="font-medium mb-2">Bio</h4>
                  <p className="text-muted-foreground">{selectedProfile.short_bio}</p>
                  {selectedProfile.bio_long && <p className="text-muted-foreground mt-2 text-sm">{selectedProfile.bio_long}</p>}
                </div>

                {/* Languages */}
                {selectedProfile.languages?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Languages</h4>
                    <div className="flex flex-wrap gap-2">{selectedProfile.languages.map((l) => <Badge key={l} variant="secondary">{l}</Badge>)}</div>
                  </div>
                )}

                {/* Professional */}
                {(selectedProfile.company_name || selectedProfile.job_title) && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2"><Briefcase className="w-4 h-4" />Professional</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedProfile.job_title && <div><span className="text-muted-foreground">Title:</span> {selectedProfile.job_title}</div>}
                      {selectedProfile.company_name && <div><span className="text-muted-foreground">Company:</span> {selectedProfile.company_name}</div>}
                      {selectedProfile.years_experience != null && <div><span className="text-muted-foreground">Experience:</span> {selectedProfile.years_experience} years</div>}
                    </div>
                  </div>
                )}

                {/* Credibility links */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2"><LinkIcon className="w-4 h-4" />Credibility Links</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfile.linkedin_url && <Button variant="outline" size="sm" asChild><a href={selectedProfile.linkedin_url} target="_blank" rel="noopener noreferrer"><Linkedin className="w-4 h-4 mr-1" />LinkedIn<ExternalLink className="w-3 h-3 ml-1" /></a></Button>}
                    {selectedProfile.website_url && <Button variant="outline" size="sm" asChild><a href={selectedProfile.website_url} target="_blank" rel="noopener noreferrer"><Globe className="w-4 h-4 mr-1" />Website<ExternalLink className="w-3 h-3 ml-1" /></a></Button>}
                    {selectedProfile.portfolio_url && <Button variant="outline" size="sm" asChild><a href={selectedProfile.portfolio_url} target="_blank" rel="noopener noreferrer"><LinkIcon className="w-4 h-4 mr-1" />Portfolio<ExternalLink className="w-3 h-3 ml-1" /></a></Button>}
                    {selectedProfile.instagram_url && <Button variant="outline" size="sm" asChild><a href={selectedProfile.instagram_url} target="_blank" rel="noopener noreferrer">Instagram<ExternalLink className="w-3 h-3 ml-1" /></a></Button>}
                  </div>
                  {selectedProfile.credibility_confirmed && <p className="text-xs text-success mt-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />User confirmed links are accurate</p>}
                </div>

                {/* Admin notes */}
                <div>
                  <Label htmlFor="admin-notes" className="flex items-center gap-2 mb-2"><MessageSquare className="w-4 h-4" />Admin Notes (internal only)</Label>
                  <Textarea id="admin-notes" placeholder="Add internal notes about this member…" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} className="min-h-[100px]" />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-4 border-t justify-between">
                  {selectedProfile.status !== "approved" && (
                    <Button variant="success" onClick={approveAndNext} disabled={updateStatus.isPending} className="gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {isPendingTab ? "Approve & next" : "Approve"}
                      {isPendingTab && <ArrowRight className="w-4 h-4" />}
                    </Button>
                  )}
                  {selectedProfile.status !== "rejected" && (
                    <Button variant="destructive" onClick={() => setActionDialog({ open: true, action: "rejected" })} disabled={updateStatus.isPending}>
                      <XCircle className="w-4 h-4 mr-2" />Reject
                    </Button>
                  )}
                  {selectedProfile.status !== "suspended" && selectedProfile.status !== "rejected" && (
                    <Button variant="outline" onClick={() => setActionDialog({ open: true, action: "suspended" })} disabled={updateStatus.isPending}>
                      <AlertTriangle className="w-4 h-4 mr-2" />Suspend
                    </Button>
                  )}
                  {selectedProfile.status !== "pending_review" && (
                    <Button variant="secondary" onClick={() => setActionDialog({ open: true, action: "pending_review" })} disabled={updateStatus.isPending}>
                      <Clock className="w-4 h-4 mr-2" />Move to Pending
                    </Button>
                  )}
                  <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto" onClick={() => setDeleteDialog(true)} disabled={deleteUser.isPending}>
                    <Trash2 className="w-4 h-4 mr-2" />Delete user
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirm dialog (reject / suspend / move-to-pending) */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => { setActionDialog({ ...actionDialog, open }); if (!open) setRejectionReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              Confirm {actionDialog.action === "rejected" ? "Rejection" : actionDialog.action === "suspended" ? "Suspension" : "Status Change"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "rejected" && "This member will not be approved. You can add a reason included in their notification."}
              {actionDialog.action === "suspended" && "This member's access will be suspended."}
              {actionDialog.action === "pending_review" && "This member will be moved back to pending review."}
            </DialogDescription>
          </DialogHeader>
          {actionDialog.action === "rejected" && (
            <div className="space-y-2 py-2">
              <Label htmlFor="rejection-reason">Rejection reason (sent to member)</Label>
              <Textarea id="rejection-reason" placeholder="e.g. incomplete profile, unverifiable credentials" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="min-h-[100px]" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog({ open: false, action: null }); setRejectionReason(""); }}>Cancel</Button>
            <Button variant={actionDialog.action === "pending_review" ? "default" : "destructive"} onClick={confirmAction} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? <LoadingSpinner size="sm" /> : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-destructive">Delete user</DialogTitle>
            <DialogDescription>
              This permanently deletes <strong>{selectedProfile?.full_name ?? "this user"}</strong>'s account and all their data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => selectedProfile && deleteUser.mutate(selectedProfile.user_id)} disabled={deleteUser.isPending}>
              {deleteUser.isPending ? <LoadingSpinner size="sm" /> : <><Trash2 className="w-4 h-4 mr-2" />Delete permanently</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Invite members</DialogTitle>
            <DialogDescription>Send an invitation so someone can join the community.</DialogDescription>
          </DialogHeader>
          <AdminInviteMembers />
        </DialogContent>
      </Dialog>
    </div>
  );
}
