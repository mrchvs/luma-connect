import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Plus, Download, Users, Mail, Copy, ChevronRight, ArrowLeft, UserPlus, Check, Trash2, Search, EyeOff, Eye,
} from "lucide-react";
import { format } from "date-fns";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface Cycle {
  id: string;
  name: string;
  month: number;
  year: number;
  created_at: string;
  hidden: boolean;
}

interface CycleMember {
  id: string;
  email: string;
  user_id: string | null;
  status: "invited" | "joined" | "pending";
  invited_at: string;
  full_name?: string | null;
  has_goal?: boolean;
  weeks_committed?: number;
  weeks_reflected?: number;
}

export function AdminMomentumGroups({ initialCycleId }: { initialCycleId?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [newMonth, setNewMonth] = useState(String(new Date().getMonth() + 2));
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<"members" | "email">("members");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Fetch all cycles ────────────────────────────────────────────────────
  const { data: cycles, isLoading: cyclesLoading } = useQuery({
    queryKey: ["admin-cycles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("accountability_cycles")
        .select("id, name, month, year, created_at, hidden")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((c: any) => ({ ...c, hidden: c.hidden ?? false })) as Cycle[];
    },
  });

  // Auto-select cycle from deep-link (e.g. notification)
  useEffect(() => {
    if (initialCycleId && cycles?.length && selectedCycle?.id !== initialCycleId) {
      const target = cycles.find(c => c.id === initialCycleId);
      if (target) setSelectedCycle(target);
    }
  }, [initialCycleId, cycles]);

  // ── Fetch members for selected cycle ───────────────────────────────────
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["admin-cycle-members", selectedCycle?.id],
    queryFn: async () => {
      if (!selectedCycle) return [];
      const { data: rawMembers, error } = await supabase
        .from("accountability_cycle_members")
        .select("id, email, user_id, status, invited_at")
        .eq("cycle_id", selectedCycle.id)
        .order("invited_at");
      if (error) throw error;

      const userIds = rawMembers?.filter((m) => m.user_id).map((m) => m.user_id!) ?? [];

      const safeQuery = async (q: Promise<{ data: any[] | null; error: any }>) => {
        try {
          const res = await q;
          return res.data ?? [];
        } catch {
          return [];
        }
      };

      const [profiles, goals, entries, reflections] = await Promise.all([
        userIds.length ? safeQuery(supabase.from("profiles").select("user_id, full_name").in("user_id", userIds) as any) : [],
        safeQuery(supabase.from("accountability_monthly_goals").select("user_id").eq("cycle_id", selectedCycle.id) as any),
        safeQuery(supabase.from("accountability_weekly_entries").select("user_id").eq("cycle_id", selectedCycle.id) as any),
        safeQuery(supabase.from("accountability_weekly_reflections").select("user_id").eq("cycle_id", selectedCycle.id) as any),
      ]);

      return (rawMembers ?? []).map((m) => {
        const profile = profiles.find((p: any) => p.user_id === m.user_id);
        const hasGoal = goals.some((g: any) => g.user_id === m.user_id);
        const weeksCommitted = new Set(entries.filter((e: any) => e.user_id === m.user_id).map((e: any) => e.week_number)).size;
        const weeksReflected = new Set(reflections.filter((r: any) => r.user_id === m.user_id).map((r: any) => r.week_number)).size;
        return {
          ...m,
          full_name: profile?.full_name ?? null,
          has_goal: hasGoal,
          weeks_committed: weeksCommitted,
          weeks_reflected: weeksReflected,
        } as CycleMember;
      });
    },
    enabled: !!selectedCycle,
  });

  // ── Approved members not yet in this cohort ────────────────────────────
  const { data: availableMembers, isLoading: availableLoading } = useQuery({
    queryKey: ["available-members", selectedCycle?.id, members?.length],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .eq("status", "approved")
        .eq("completed", true)
        .order("full_name");
      const existingUserIds = new Set(members?.filter(m => m.user_id).map(m => m.user_id) ?? []);
      return (profiles ?? []).filter(p => !existingUserIds.has(p.user_id));
    },
    enabled: !!selectedCycle && showAddMember,
  });

  // ── Add existing platform members ──────────────────────────────────────
  const addExistingMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      if (!selectedCycle) return;
      const cycleSlug = selectedCycle.name.toLowerCase().replace(/\s+/g, "");

      // Resolve emails via security-definer RPC (reads auth.users server-side)
      const { data: emailRows } = await supabase.rpc("admin_get_user_emails", {
        _user_ids: userIds,
      }) as { data: { user_id: string; email: string }[] | null };
      const emailMap = new Map((emailRows ?? []).map(r => [r.user_id, r.email]));

      for (const userId of userIds) {
        const email = emailMap.get(userId) ?? null;

        // Upsert as "joined" — they already have an account.
        // email column is nullable after migration; use email if available.
        await supabase.from("accountability_cycle_members").upsert(
          { cycle_id: selectedCycle.id, email: email ?? "", user_id: userId, status: "joined" },
          { onConflict: "cycle_id,email", ignoreDuplicates: false }
        );

        // In-app notification (always sent)
        await supabase.from("notifications").insert({
          user_id: userId,
          title: `You've been added to ${selectedCycle.name}! 🎯`,
          body: "Set your monthly goal to get started with Monday Momentum.",
          link: `/momentum/${cycleSlug}`,
        });

        // Email invite (best-effort, only if we have an email)
        if (email) {
          supabase.functions.invoke("admin-invite-member", {
            body: {
              action: "send_momentum_invite",
              email,
              metadata: { cycle_id: selectedCycle.id, cycle_name: selectedCycle.name },
            },
          }).catch(console.warn);
        }
      }
    },
    onSuccess: () => {
      toast.success(`${selectedMemberIds.size} member${selectedMemberIds.size > 1 ? "s" : ""} added to cohort!`);
      setSelectedMemberIds(new Set());
      setShowAddMember(false);
      queryClient.invalidateQueries({ queryKey: ["admin-cycle-members", selectedCycle?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Create cycle ────────────────────────────────────────────────────────
  const createCycleMutation = useMutation({
    mutationFn: async () => {
      const month = parseInt(newMonth);
      const year = parseInt(newYear);
      const name = `${MONTHS[month - 1]} ${year}`;
      const { error } = await supabase.from("accountability_cycles").insert({
        name, month, year, created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cohort created!");
      setShowCreateDialog(false);
      queryClient.invalidateQueries({ queryKey: ["admin-cycles"] });
    },
    onError: (e: any) => toast.error(e.message?.includes("unique") ? "A cohort for that month already exists." : e.message),
  });

  // ── Add member ──────────────────────────────────────────────────────────
  const addMemberMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      if (!selectedCycle) return;
      const results: { email: string; success: boolean; emailSent: boolean }[] = [];

      for (const email of emails) {
        const cleanEmail = email.toLowerCase().trim();

        // Always upsert — update invited_at so re-adds get a fresh timestamp.
        // Preserve user_id and status=joined if they already have an account.
        const { error: upsertError } = await supabase
          .from("accountability_cycle_members")
          .upsert(
            { cycle_id: selectedCycle.id, email: cleanEmail, status: "invited", invited_at: new Date().toISOString() },
            { onConflict: "cycle_id,email", ignoreDuplicates: false }
          );
        if (upsertError) {
          toast.error(`Could not add ${email}: ${upsertError.message}`);
          results.push({ email, success: false, emailSent: false });
          continue;
        }

        // Send invite email — surface error clearly so admin knows if it failed
        let emailSent = false;
        try {
          const { error: fnError } = await supabase.functions.invoke("admin-invite-member", {
            body: {
              action: "send_momentum_invite",
              email: cleanEmail,
              metadata: { cycle_id: selectedCycle.id, cycle_name: selectedCycle.name },
            },
          });
          if (fnError) throw new Error(fnError.message);
          emailSent = true;
        } catch (e: any) {
          console.warn("Invite email failed for", email, e?.message);
          // Don't block — member was added, admin can use Resend button
        }

        results.push({ email, success: true, emailSent });
      }
      return results;
    },
    onSuccess: (results) => {
      const succeeded = results?.filter((r) => r.success) ?? [];
      const emailsFailed = succeeded.filter((r) => !r.emailSent);
      const failed = results?.filter((r) => !r.success).length ?? 0;

      if (succeeded.length > 0) {
        toast.success(`${succeeded.length} participant${succeeded.length > 1 ? "s" : ""} added!`);
      }
      if (emailsFailed.length > 0) {
        toast.warning(
          `⚠️ ${emailsFailed.length} invite email${emailsFailed.length > 1 ? "s" : ""} could not be sent — use the Resend button on the row.`,
          { duration: 6000 }
        );
      }
      if (failed > 0) toast.error(`${failed} address${failed > 1 ? "es" : ""} could not be added.`);
      setEmailInput("");
      setBulkEmails("");
      setShowAddMember(false);
      queryClient.invalidateQueries({ queryKey: ["admin-cycle-members", selectedCycle?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Copy invite link ────────────────────────────────────────────────────
  const copyInviteLink = async (email: string) => {
    const { data: invite } = await supabase
      .from("invitations")
      .select("token")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const link = invite?.token
      ? `${window.location.origin}/auth?invite=${invite.token}`
      : `${window.location.origin}/auth`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(email);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // ── Resend invite ───────────────────────────────────────────────────────
  const resendInvite = async (email: string) => {
    if (!selectedCycle) return;
    setResendingEmail(email);
    try {
      const { data, error } = await supabase.functions.invoke("admin-invite-member", {
        body: {
          action: "send_momentum_invite",
          email,
          metadata: { cycle_id: selectedCycle.id, cycle_name: selectedCycle.name },
        },
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message);
      toast.success(`Invite resent to ${email}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to resend invite");
    } finally {
      setResendingEmail(null);
    }
  };

  // ── Accept application ─────────────────────────────────────────────────
  const acceptApplicationMutation = useMutation({
    mutationFn: async (member: CycleMember) => {
      if (!selectedCycle) return;
      const { error } = await supabase
        .from("accountability_cycle_members")
        .update({ status: "joined" })
        .eq("id", member.id);
      if (error) throw error;
      // Notify the applicant (best-effort)
      if (member.user_id) {
        supabase.from("notifications").insert({
          user_id: member.user_id,
          title: "Application accepted!",
          body: `You've been accepted into the ${selectedCycle.name} cohort`,
          link: `/momentum/${format(new Date(selectedCycle.year, selectedCycle.month - 1, 1), "MMMM").toLowerCase()}-${selectedCycle.year}/w1`,
        }).then(() => {});
      }
    },
    onSuccess: () => {
      toast.success("Application accepted!");
      queryClient.invalidateQueries({ queryKey: ["admin-cycle-members", selectedCycle?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Decline application ────────────────────────────────────────────────
  const declineApplicationMutation = useMutation({
    mutationFn: async (member: CycleMember) => {
      if (!selectedCycle) return;
      const { error } = await supabase
        .from("accountability_cycle_members")
        .delete()
        .eq("id", member.id);
      if (error) throw error;
      // Notify the applicant (best-effort)
      if (member.user_id) {
        supabase.from("notifications").insert({
          user_id: member.user_id,
          title: "Application update",
          body: `Your application to the ${selectedCycle.name} cohort was not accepted this time.`,
          link: "/momentum",
        }).then(() => {});
      }
    },
    onSuccess: () => {
      toast.success("Application declined.");
      queryClient.invalidateQueries({ queryKey: ["admin-cycle-members", selectedCycle?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Remove member ──────────────────────────────────────────────────────
  const removeMemberMutation = useMutation({
    mutationFn: async (member: CycleMember) => {
      const { error } = await supabase
        .from("accountability_cycle_members")
        .delete()
        .eq("id", member.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member removed from cohort.");
      queryClient.invalidateQueries({ queryKey: ["admin-cycle-members", selectedCycle?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Hide / Delete cycle mutations ──────────────────────────────────────
  const toggleHideMutation = useMutation({
    mutationFn: async ({ id, hidden }: { id: string; hidden: boolean }) => {
      const { error } = await (supabase as any)
        .from("accountability_cycles")
        .update({ hidden })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, hidden }) => {
      // Optimistically update the cache immediately
      await queryClient.cancelQueries({ queryKey: ["admin-cycles"] });
      const previous = queryClient.getQueryData<Cycle[]>(["admin-cycles"]);
      queryClient.setQueryData<Cycle[]>(["admin-cycles"], (old) =>
        (old ?? []).map((c) => c.id === id ? { ...c, hidden } : c)
      );
      return { previous };
    },
    onSuccess: (_data, { hidden }) => {
      toast.success(hidden ? "Cohort hidden from members." : "Cohort visible to members.");
    },
    onError: (e: any, _vars, context: any) => {
      toast.error(e.message);
      if (context?.previous) queryClient.setQueryData(["admin-cycles"], context.previous);
    },
  });

  const deleteCycleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("delete_accountability_cycle", { p_cycle_id: id });
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["admin-cycles"] });
      const previous = queryClient.getQueryData<Cycle[]>(["admin-cycles"]);
      queryClient.setQueryData<Cycle[]>(["admin-cycles"], (old) =>
        (old ?? []).filter((c) => c.id !== id)
      );
      return { previous };
    },
    onSuccess: () => {
      toast.success("Cohort deleted.");
      setConfirmDeleteId(null);
      // Don't invalidate — optimistic update already removed it from the cache.
      // Invalidating would trigger a refetch that could bring it back if RLS blocks the delete.
    },
    onError: (e: any, _id, context: any) => {
      toast.error("Failed to delete cohort: " + e.message);
      setConfirmDeleteId(null);
      if (context?.previous) queryClient.setQueryData(["admin-cycles"], context.previous);
    },
  });

  // ── CSV Export ──────────────────────────────────────────────────────────
  const exportCSV = async () => {
    if (!selectedCycle || !members) return;

    const userIds = members.filter((m) => m.user_id).map((m) => m.user_id!);
    const [goalsRes, entriesRes, reflectionsRes] = await Promise.all([
      supabase.from("accountability_monthly_goals").select("user_id, monthly_goal, success_metric").eq("cycle_id", selectedCycle.id),
      supabase.from("accountability_weekly_entries").select("user_id, week_number, specific_goal, relevance, measurable, achievable").eq("cycle_id", selectedCycle.id),
      supabase.from("accountability_weekly_reflections").select("user_id, week_number, achieved, reflection, blocker, adjustments").eq("cycle_id", selectedCycle.id),
    ]);

    const goals = goalsRes.data ?? [];
    const entries = entriesRes.data ?? [];
    const reflections = reflectionsRes.data ?? [];

    const headers = [
      "Name", "Email", "Status",
      "Monthly Goal", "Success Metric",
      "Wk1 Goal", "Wk1 Achievable", "Wk1 Measurable", "Wk1 Achieved", "Wk1 Reflection", "Wk1 Blocker", "Wk1 Adjustments",
      "Wk2 Goal", "Wk2 Achievable", "Wk2 Measurable", "Wk2 Achieved", "Wk2 Reflection", "Wk2 Blocker", "Wk2 Adjustments",
      "Wk3 Goal", "Wk3 Achievable", "Wk3 Measurable", "Wk3 Achieved", "Wk3 Reflection", "Wk3 Blocker", "Wk3 Adjustments",
      "Wk4 Goal", "Wk4 Achievable", "Wk4 Measurable", "Wk4 Achieved", "Wk4 Reflection", "Wk4 Blocker", "Wk4 Adjustments",
    ];

    const escape = (v: string | null | undefined) => {
      if (!v) return "";
      return `"${String(v).replace(/"/g, '""')}"`;
    };

    const rows = members.map((m) => {
      const g = goals.find((x) => x.user_id === m.user_id);
      const weekData = [1, 2, 3, 4].flatMap((wk) => {
        const e = entries.find((x) => x.user_id === m.user_id && x.week_number === wk);
        const r = reflections.find((x) => x.user_id === m.user_id && x.week_number === wk);
        return [
          escape(e?.specific_goal), escape(e?.achievable), escape(e?.measurable),
          escape(r?.achieved), escape(r?.reflection), escape(r?.blocker), escape(r?.adjustments),
        ];
      });
      return [
        escape(m.full_name ?? m.email.split("@")[0]),
        escape(m.email),
        escape(m.status),
        escape(g?.monthly_goal),
        escape(g?.success_metric),
        ...weekData,
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `momentum-${selectedCycle.name.replace(" ", "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  // ── Render: Cycle detail ────────────────────────────────────────────────
  if (selectedCycle) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => setSelectedCycle(null)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> All cohorts
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1.5" /> Export CSV
            </Button>
            <Button size="sm" onClick={() => setShowAddMember(true)}>
              <UserPlus className="w-4 h-4 mr-1.5" /> Add participants
            </Button>
          </div>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold">{selectedCycle.name}</h2>
          <p className="text-sm text-muted-foreground">{members?.filter((m) => m.status !== "pending").length ?? 0} participant{(members?.filter((m) => m.status !== "pending").length ?? 0) !== 1 ? "s" : ""}</p>
        </div>

        {membersLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner text="Loading…" /></div>
        ) : (() => {
          const joinedMembers = members?.filter((m) => m.status === "joined" || m.status === "invited") ?? [];
          const pendingMembers = members?.filter((m) => m.status === "pending") ?? [];
          return (
            <div className="space-y-6">
              {/* Pending applications */}
              {pendingMembers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">Pending applications</p>
                    <Badge variant="secondary" className="text-xs">{pendingMembers.length}</Badge>
                  </div>
                  {pendingMembers.map((m) => (
                    <Card key={m.id}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold flex-shrink-0">
                              {(m.full_name ?? m.email).slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{m.full_name ?? m.email.split("@")[0]}</p>
                              <p className="text-xs text-muted-foreground">{m.email}</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => acceptApplicationMutation.mutate(m)}
                              disabled={acceptApplicationMutation.isPending || declineApplicationMutation.isPending}
                            >
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => declineApplicationMutation.mutate(m)}
                              disabled={acceptApplicationMutation.isPending || declineApplicationMutation.isPending}
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Joined / invited members */}
              {!joinedMembers.length && !pendingMembers.length ? (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No participants yet. Add some to get started.</p>
                  </CardContent>
                </Card>
              ) : joinedMembers.length > 0 ? (
                <div className="space-y-2">
                  {pendingMembers.length > 0 && (
                    <p className="text-sm font-semibold">Members</p>
                  )}
                  {joinedMembers.map((m) => (
                    <Card key={m.id}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-medium truncate">{m.full_name ?? m.email.split("@")[0]}</p>
                              <Badge variant={m.status === "joined" ? "default" : "outline"} className="text-[10px] h-4 px-1.5">
                                {m.status === "joined" ? "Joined" : "Invited"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{m.email}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className={`text-xs ${m.has_goal ? "text-green-600" : "text-muted-foreground"}`}>
                                {m.has_goal ? "✓ Monthly goal" : "No monthly goal"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {m.weeks_committed}/4 committed · {m.weeks_reflected}/4 reflected
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {m.status === "invited" && (
                              <>
                                <Button
                                  variant="ghost" size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => resendInvite(m.email)}
                                  disabled={resendingEmail === m.email}
                                >
                                  {resendingEmail === m.email ? (
                                    <LoadingSpinner size="sm" />
                                  ) : (
                                    <><Mail className="w-3.5 h-3.5 mr-1" />Resend</>
                                  )}
                                </Button>
                                <Button
                                  variant="ghost" size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => copyInviteLink(m.email)}
                                >
                                  {copiedLink === m.email ? <Check className="w-3.5 h-3.5 mr-1 text-green-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                                  {copiedLink === m.email ? "Copied!" : "Copy link"}
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (window.confirm(`Remove ${m.full_name ?? m.email} from ${selectedCycle?.name}?`)) {
                                  removeMemberMutation.mutate(m);
                                }
                              }}
                              disabled={removeMemberMutation.isPending}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })()}

        {/* Add participants dialog */}
        <Dialog open={showAddMember} onOpenChange={(open) => {
          setShowAddMember(open);
          if (!open) { setSelectedMemberIds(new Set()); setMemberSearch(""); setBulkEmails(""); }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add participants to {selectedCycle.name}</DialogTitle>
            </DialogHeader>

            {/* Mode toggle */}
            <div className="flex rounded-lg border p-0.5 gap-0.5 bg-muted/30">
              {(["members", "email"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setAddMode(mode)}
                  className={cn(
                    "flex-1 rounded-md text-sm py-1.5 px-3 font-medium transition-colors",
                    addMode === mode
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {mode === "members" ? "Existing members" : "By email"}
                </button>
              ))}
            </div>

            {addMode === "members" ? (
              <div className="space-y-3 py-1">
                <p className="text-xs text-muted-foreground">
                  Select approved members to add. They'll receive an in-app notification and an email.
                </p>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8 h-8 text-sm"
                    placeholder="Search by name…"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                </div>
                {/* Member list */}
                <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
                  {availableLoading ? (
                    <div className="flex justify-center py-6"><LoadingSpinner size="sm" /></div>
                  ) : (() => {
                    const filtered = (availableMembers ?? []).filter(m =>
                      (m.full_name ?? "").toLowerCase().includes(memberSearch.toLowerCase())
                    );
                    if (!filtered.length) return (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        {availableMembers?.length === 0 ? "All approved members are already in this cohort." : "No members match your search."}
                      </p>
                    );
                    return filtered.map((m) => {
                      const checked = selectedMemberIds.has(m.user_id);
                      const initials = (m.full_name ?? "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                      return (
                        <button
                          key={m.user_id}
                          onClick={() => setSelectedMemberIds(prev => {
                            const next = new Set(prev);
                            checked ? next.delete(m.user_id) : next.add(m.user_id);
                            return next;
                          })}
                          className={cn("w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors", checked && "bg-primary/5")}
                        >
                          <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors", checked ? "bg-primary border-primary" : "border-border")}>
                            {checked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </div>
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                            {initials}
                          </div>
                          <span className="text-sm font-medium truncate">{m.full_name ?? "Member"}</span>
                        </button>
                      );
                    });
                  })()}
                </div>
                {selectedMemberIds.size > 0 && (
                  <p className="text-xs text-primary font-medium">{selectedMemberIds.size} member{selectedMemberIds.size > 1 ? "s" : ""} selected</p>
                )}
              </div>
            ) : (
              <div className="space-y-2 py-1">
                <p className="text-xs text-muted-foreground">
                  Add people not yet on LumaCircle. Each will receive an invite link to create their account.
                </p>
                <textarea
                  className="w-full min-h-[110px] px-3 py-2 text-sm border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={"gina@example.com\nalyssa@example.com\nmarta@example.com"}
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">One email per line.</p>
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowAddMember(false)}>Cancel</Button>
              {addMode === "members" ? (
                <Button
                  disabled={selectedMemberIds.size === 0 || addExistingMutation.isPending}
                  onClick={() => {
                    addExistingMutation.mutate(Array.from(selectedMemberIds));
                  }}
                >
                  {addExistingMutation.isPending
                    ? <LoadingSpinner size="sm" />
                    : <><UserPlus className="w-4 h-4 mr-1.5" />Add {selectedMemberIds.size > 0 ? `${selectedMemberIds.size} ` : ""}selected</>}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    const emails = bulkEmails.split("\n").map((e) => e.trim()).filter(Boolean);
                    if (emails.length) addMemberMutation.mutate(emails);
                  }}
                  disabled={!bulkEmails.trim() || addMemberMutation.isPending}
                >
                  {addMemberMutation.isPending ? <LoadingSpinner size="sm" /> : <><Mail className="w-4 h-4 mr-1.5" />Send invites</>}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Render: Cohort list ─────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Momentum Cohorts</h2>
          <p className="text-sm text-muted-foreground">Manage accountability groups and export participant data</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New cohort
        </Button>
      </div>

      {cyclesLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner text="Loading…" /></div>
      ) : !cycles?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <p>No cohorts yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {cycles.map((cycle) => (
            <Card key={cycle.id} className="hover:shadow-elevated transition-shadow cursor-pointer" onClick={() => setSelectedCycle(cycle)}>
              <CardContent className="py-4 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{cycle.name}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cycle.hidden ? "text-muted-foreground border-border bg-muted/40" : "text-green-700 border-green-200 bg-green-50"}`}>
                        {cycle.hidden ? "Hidden" : "Visible"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Created {format(new Date(cycle.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost" size="sm"
                      className={`h-8 px-2 text-xs gap-1.5 ${cycle.hidden ? "text-green-700 hover:text-green-800 hover:bg-green-50" : "text-muted-foreground hover:text-foreground"}`}
                      title={cycle.hidden ? "Make visible to members" : "Hide from members"}
                      onClick={(e) => { e.stopPropagation(); toggleHideMutation.mutate({ id: cycle.id, hidden: !cycle.hidden }); }}
                    >
                      {cycle.hidden ? <><Eye className="w-3.5 h-3.5" /> Show</> : <><EyeOff className="w-3.5 h-3.5" /> Hide</>}
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      title="Delete cohort"
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(cycle.id); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete cohort?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will permanently delete the cohort and all its members, goals, commitments, and reflections. This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteCycleMutation.isPending}
              onClick={() => confirmDeleteId && deleteCycleMutation.mutate(confirmDeleteId)}
            >
              {deleteCycleMutation.isPending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create cycle dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create new cohort</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Month</Label>
                <Select value={newMonth} onValueChange={setNewMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Select value={newYear} onValueChange={setNewYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2026, 2027, 2028].map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              This will create the <strong>{MONTHS[parseInt(newMonth) - 1]} {newYear}</strong> cohort.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={() => createCycleMutation.mutate()} disabled={createCycleMutation.isPending}>
              {createCycleMutation.isPending ? <LoadingSpinner size="sm" /> : "Create cohort"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
