import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { format, addWeeks } from "date-fns";
import { Plus, Trash2, Edit, Users, UserPlus, X } from "lucide-react";

const FOCUS_TYPES = [
  { value: "stage", label: "Journey Pod (By Stage)" },
  { value: "focus", label: "Focus Pod (By Topic)" },
];

const STAGE_OPTIONS = [
  { value: "exploring", label: "Exploring" },
  { value: "building", label: "Building" },
  { value: "growing", label: "Growing" },
  { value: "established", label: "Established" },
];

const FOCUS_OPTIONS = [
  { value: "fundraising", label: "Fundraising" },
  { value: "product", label: "Product Development" },
  { value: "growth", label: "Growth & Marketing" },
  { value: "hiring", label: "Hiring & Team" },
  { value: "operations", label: "Operations" },
];

interface PodFormData {
  name: string;
  focus_type: string;
  focus_value: string;
  weekly_prompt: string;
  started_at: string;
  duration_weeks: number;
  max_members: number;
}

const defaultFormData: PodFormData = {
  name: "",
  focus_type: "stage",
  focus_value: "",
  weekly_prompt: "",
  started_at: new Date().toISOString().slice(0, 10),
  duration_weeks: 4,
  max_members: 6,
};

interface PodMember {
  id: string;
  user_id: string;
  joined_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface WaitingMember {
  id: string;
  user_id: string;
  grouping_type: string;
  stage: string | null;
  focus: string | null;
  status: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function AdminPods() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingPod, setEditingPod] = useState<any>(null);
  const [selectedPod, setSelectedPod] = useState<any>(null);
  const [formData, setFormData] = useState<PodFormData>(defaultFormData);

  // Fetch pods with member count
  const { data: pods, isLoading } = useQuery({
    queryKey: ["admin-pods"],
    queryFn: async () => {
      const { data: podsData, error } = await supabase
        .from("pods")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get member counts
      const podIds = podsData?.map(p => p.id) || [];
      const { data: members } = await supabase
        .from("pod_members")
        .select("pod_id")
        .in("pod_id", podIds);

      const memberCounts = new Map<string, number>();
      members?.forEach(m => {
        memberCounts.set(m.pod_id, (memberCounts.get(m.pod_id) || 0) + 1);
      });

      return podsData?.map(pod => ({
        ...pod,
        member_count: memberCounts.get(pod.id) || 0,
      })) || [];
    },
  });

  // Fetch pod members when viewing a pod
  const { data: podMembers } = useQuery({
    queryKey: ["pod-members", selectedPod?.id],
    queryFn: async () => {
      if (!selectedPod) return [];
      
      const { data: members, error } = await supabase
        .from("pod_members")
        .select("id, user_id, joined_at")
        .eq("pod_id", selectedPod.id);

      if (error) throw error;

      // Get profiles for members
      const userIds = members?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      return members?.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id),
      })) as PodMember[] || [];
    },
    enabled: !!selectedPod && membersDialogOpen,
  });

  // Fetch waiting members for assignment
  const { data: waitingMembers } = useQuery({
    queryKey: ["waiting-pod-members", selectedPod?.focus_type, selectedPod?.focus_value],
    queryFn: async () => {
      if (!selectedPod) return [];

      let query = supabase
        .from("pod_preferences")
        .select("id, user_id, grouping_type, stage, focus, status")
        .eq("status", "waiting_for_match")
        .eq("grouping_type", selectedPod.focus_type);

      if (selectedPod.focus_type === "stage" && selectedPod.focus_value) {
        query = query.eq("stage", selectedPod.focus_value);
      } else if (selectedPod.focus_type === "focus" && selectedPod.focus_value) {
        query = query.eq("focus", selectedPod.focus_value);
      }

      const { data: waiting, error } = await query;
      if (error) throw error;

      // Get profiles
      const userIds = waiting?.map(w => w.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      return waiting?.map(w => ({
        ...w,
        profile: profileMap.get(w.user_id),
      })) as WaitingMember[] || [];
    },
    enabled: !!selectedPod && assignDialogOpen,
  });

  const createPodMutation = useMutation({
    mutationFn: async (data: PodFormData) => {
      const endsAt = addWeeks(new Date(data.started_at), data.duration_weeks);
      
      const { error } = await supabase
        .from("pods")
        .insert({
          name: data.name,
          focus_type: data.focus_type,
          focus_value: data.focus_value || null,
          weekly_prompt: data.weekly_prompt || null,
          started_at: data.started_at,
          ends_at: endsAt.toISOString(),
          max_members: data.max_members,
          status: "active",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pods"] });
      setDialogOpen(false);
      setFormData(defaultFormData);
      toast({ title: "Pod created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updatePodMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PodFormData & { status: string }> }) => {
      const updateData: any = { ...data };
      
      if (data.started_at && data.duration_weeks) {
        updateData.ends_at = addWeeks(new Date(data.started_at), data.duration_weeks).toISOString();
      }
      delete updateData.duration_weeks;

      const { error } = await supabase
        .from("pods")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pods"] });
      setDialogOpen(false);
      setEditingPod(null);
      setFormData(defaultFormData);
      toast({ title: "Pod updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePodMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete all members
      await supabase.from("pod_members").delete().eq("pod_id", id);
      
      const { error } = await supabase
        .from("pods")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pods"] });
      toast({ title: "Pod deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ podId, userId }: { podId: string; userId: string }) => {
      // Add to pod_members
      const { error: memberError } = await supabase
        .from("pod_members")
        .insert({ pod_id: podId, user_id: userId });

      if (memberError) throw memberError;

      // Update pod_preferences status
      const { error: prefError } = await supabase
        .from("pod_preferences")
        .update({ status: "active" })
        .eq("user_id", userId);

      if (prefError) throw prefError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pods"] });
      queryClient.invalidateQueries({ queryKey: ["pod-members"] });
      queryClient.invalidateQueries({ queryKey: ["waiting-pod-members"] });
      toast({ title: "Member added to pod" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ memberId, userId }: { memberId: string; userId: string }) => {
      const { error: memberError } = await supabase
        .from("pod_members")
        .delete()
        .eq("id", memberId);

      if (memberError) throw memberError;

      // Reset pod_preferences status
      const { error: prefError } = await supabase
        .from("pod_preferences")
        .update({ status: "waiting_for_match" })
        .eq("user_id", userId);

      if (prefError) throw prefError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pods"] });
      queryClient.invalidateQueries({ queryKey: ["pod-members"] });
      toast({ title: "Member removed from pod" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenDialog = (pod?: any) => {
    if (pod) {
      setEditingPod(pod);
      const durationWeeks = pod.ends_at && pod.started_at
        ? Math.round((new Date(pod.ends_at).getTime() - new Date(pod.started_at).getTime()) / (7 * 24 * 60 * 60 * 1000))
        : 4;
      setFormData({
        name: pod.name,
        focus_type: pod.focus_type,
        focus_value: pod.focus_value || "",
        weekly_prompt: pod.weekly_prompt || "",
        started_at: pod.started_at?.slice(0, 10) || "",
        duration_weeks: durationWeeks,
        max_members: pod.max_members || 6,
      });
    } else {
      setEditingPod(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingPod) {
      updatePodMutation.mutate({ id: editingPod.id, data: formData });
    } else {
      createPodMutation.mutate(formData);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getFocusValueLabel = (type: string, value: string | null) => {
    if (!value) return "Any";
    if (type === "stage") {
      return STAGE_OPTIONS.find(s => s.value === value)?.label || value;
    }
    return FOCUS_OPTIONS.find(f => f.value === value)?.label || value;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-xl">Small Group Pods</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Create Pod
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingPod ? "Edit Pod" : "Create Pod"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Pod Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Q1 Fundraising Pod"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pod Type</Label>
                    <Select value={formData.focus_type} onValueChange={(v) => setFormData({ ...formData, focus_type: v, focus_value: "" })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FOCUS_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{formData.focus_type === "stage" ? "Stage" : "Focus Area"}</Label>
                    <Select value={formData.focus_value} onValueChange={(v) => setFormData({ ...formData, focus_value: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(formData.focus_type === "stage" ? STAGE_OPTIONS : FOCUS_OPTIONS).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={formData.started_at}
                      onChange={(e) => setFormData({ ...formData, started_at: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (weeks)</Label>
                    <Select value={formData.duration_weeks.toString()} onValueChange={(v) => setFormData({ ...formData, duration_weeks: parseInt(v) })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 weeks</SelectItem>
                        <SelectItem value="4">4 weeks</SelectItem>
                        <SelectItem value="6">6 weeks</SelectItem>
                        <SelectItem value="8">8 weeks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Max Members</Label>
                  <Input
                    type="number"
                    min={2}
                    max={10}
                    value={formData.max_members}
                    onChange={(e) => setFormData({ ...formData, max_members: parseInt(e.target.value) || 6 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Weekly Prompt (optional)</Label>
                  <Textarea
                    value={formData.weekly_prompt}
                    onChange={(e) => setFormData({ ...formData, weekly_prompt: e.target.value })}
                    placeholder="What's one thing you're working on this week?"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={createPodMutation.isPending || updatePodMutation.isPending || !formData.name}
                    className="flex-1"
                  >
                    {editingPod ? "Update" : "Create"} Pod
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Loading pods...</p>
        ) : !pods || pods.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No pods yet. Create your first pod!</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pod</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pods.map((pod) => (
                <TableRow key={pod.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{pod.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getFocusValueLabel(pod.focus_type, pod.focus_value)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {pod.focus_type === "stage" ? "Journey" : "Focus"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {format(new Date(pod.started_at), "MMM d")} - {format(new Date(pod.ends_at), "MMM d")}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {pod.member_count}/{pod.max_members || 6}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={pod.status === "active" ? "default" : "secondary"}>
                      {pod.status || "active"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedPod(pod);
                          setMembersDialogOpen(true);
                        }}
                        title="View members"
                      >
                        <Users className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedPod(pod);
                          setAssignDialogOpen(true);
                        }}
                        title="Assign members"
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(pod)}
                        title="Edit pod"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePodMutation.mutate(pod.id)}
                        title="Delete pod"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Members Dialog */}
        <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pod Members: {selectedPod?.name}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {!podMembers || podMembers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No members in this pod yet.</p>
              ) : (
                <div className="space-y-2">
                  {podMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(member.profile?.full_name || null)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{member.profile?.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">
                            Joined {format(new Date(member.joined_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMemberMutation.mutate({ memberId: member.id, userId: member.user_id })}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign Members Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Members to: {selectedPod?.name}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Showing members waiting to join a {selectedPod?.focus_type === "stage" ? "Journey" : "Focus"} pod
                {selectedPod?.focus_value && ` (${getFocusValueLabel(selectedPod?.focus_type, selectedPod?.focus_value)})`}
              </p>
              {!waitingMembers || waitingMembers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No members waiting for this type of pod.</p>
              ) : (
                <div className="space-y-2">
                  {waitingMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(member.profile?.full_name || null)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium">{member.profile?.full_name || "Unknown"}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addMemberMutation.mutate({ podId: selectedPod!.id, userId: member.user_id })}
                        disabled={addMemberMutation.isPending}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
