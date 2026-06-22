import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Users } from "lucide-react";

async function recipientIds(audience: string, memberId?: string): Promise<string[]> {
  if (audience === "member") return memberId ? [memberId] : [];
  if (audience === "everyone") {
    const { data } = await supabase.from("profiles").select("user_id").eq("status", "approved").eq("completed", true);
    return (data ?? []).map((d) => d.user_id).filter(Boolean);
  }
  if (audience === "pending") {
    const { data } = await supabase.from("profiles").select("user_id").eq("status", "pending_review").eq("completed", true);
    return (data ?? []).map((d) => d.user_id).filter(Boolean);
  }
  // cohort id
  const { data } = await (supabase as any).from("accountability_cycle_members").select("user_id").eq("cycle_id", audience);
  return (data ?? []).map((d: { user_id: string | null }) => d.user_id).filter(Boolean) as string[];
}

export function AnnounceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { toast } = useToast();
  const [audience, setAudience] = useState("everyone");
  const [memberId, setMemberId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const { data: cohorts } = useQuery({
    queryKey: ["announce-cohorts"],
    enabled: open,
    queryFn: async () => {
      const { data } = await (supabase as any).from("accountability_cycles").select("id, name").order("created_at", { ascending: false });
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const { data: members } = useQuery({
    queryKey: ["announce-members"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").eq("completed", true).order("full_name", { ascending: true });
      return (data ?? []).filter((m) => m.user_id) as { user_id: string; full_name: string | null }[];
    },
  });

  const { data: reach } = useQuery({
    queryKey: ["announce-reach", audience, memberId],
    enabled: open,
    queryFn: async () => (await recipientIds(audience, memberId)).length,
  });

  const send = useMutation({
    mutationFn: async () => {
      const ids = await recipientIds(audience, memberId);
      if (!ids.length) throw new Error("No recipients for this audience.");
      const rows = ids.map((id) => ({ user_id: id, title: subject.trim(), body: message.trim(), link: "/dashboard" }));
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from("notifications").insert(rows.slice(i, i + 500));
        if (error) throw error;
      }
      return ids.length;
    },
    onSuccess: (n) => {
      toast({ title: "Announcement sent", description: `Delivered to ${n} member${n === 1 ? "" : "s"}.` });
      setSubject("");
      setMessage("");
      setMemberId("");
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Couldn't send", description: e.message, variant: "destructive" }),
  });

  const canSend = subject.trim().length > 0 && message.trim().length > 0 && (reach ?? 0) > 0 && !send.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary" />Send an announcement</DialogTitle>
          <DialogDescription>Notify members in-app. Choose who should receive it.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Audience</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone (approved members)</SelectItem>
                <SelectItem value="pending">Pending members</SelectItem>
                <SelectItem value="member">A specific member</SelectItem>
                {(cohorts ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>Cohort · {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {audience === "member" && (
            <div className="space-y-2">
              <Label>Member</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger><SelectValue placeholder="Choose a member" /></SelectTrigger>
                <SelectContent>
                  {(members ?? []).map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || "Unnamed"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="announce-subject">Subject</Label>
            <Input id="announce-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Monday session moved to 10am" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="announce-message">Message</Label>
            <Textarea id="announce-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your announcement…" className="min-h-[120px]" />
          </div>

          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            Will reach <span className="font-semibold text-foreground">{reach ?? 0}</span> member{reach === 1 ? "" : "s"}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => send.mutate()} disabled={!canSend}>
            {send.isPending ? <LoadingSpinner size="sm" /> : <><Megaphone className="w-4 h-4 mr-2" />Send</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
