import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminNavCounts, useAdminUI } from "@/components/admin/AdminLayout";
import { formatDistanceToNow } from "date-fns";
import {
  Users, Target, MessageCircle, Mail, Clock, ArrowRight, UserPlus,
  ChevronRight, Sparkles, MessageSquare, Megaphone,
} from "lucide-react";

export default function AdminHome() {
  const navigate = useNavigate();
  const { openAnnounce } = useAdminUI();
  const { data: counts } = useAdminNavCounts();

  const { data: stats } = useQuery({
    queryKey: ["admin-home-stats"],
    queryFn: async () => {
      const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
      const [approved, cohorts, openAsks, leads] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved").eq("completed", true),
        (supabase as any).from("accountability_cycles").select("*", { count: "exact", head: true }),
        supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", "open"),
        (supabase as any).from("workshop_leads").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
      ]);
      return {
        members: approved.count ?? 0,
        cohorts: cohorts.count ?? 0,
        asks: openAsks.count ?? 0,
        leads: leads.count ?? 0,
      };
    },
  });

  // Best-effort recent activity. Falls back to empty if the source isn't readable.
  const { data: activity } = useQuery({
    queryKey: ["admin-home-activity"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("activity_events")
        .select("id, event_type, entity_type, created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) return [];
      return (data ?? []) as { id: string; event_type: string; entity_type: string | null; created_at: string }[];
    },
  });

  const attention = [
    { n: counts?.members ?? 0, label: "members waiting for review", to: "/admin/members", icon: Users },
    { n: counts?.momentum ?? 0, label: "Momentum applications", to: "/admin/momentum", icon: Target },
    { n: counts?.feedback ?? 0, label: "new pieces of feedback", to: "/admin/feedback", icon: MessageSquare },
  ].filter((r) => r.n > 0);

  const tiles = [
    { icon: Users, value: stats?.members ?? 0, label: "Active members", sub: "approved" },
    { icon: Target, value: stats?.cohorts ?? 0, label: "Cohorts", sub: "total" },
    { icon: MessageCircle, value: stats?.asks ?? 0, label: "Open asks", sub: "awaiting reply" },
    { icon: Mail, value: stats?.leads ?? 0, label: "Leads", sub: "last 7 days" },
  ];

  const quickActions: { icon: typeof Clock; label: string; to?: string; action?: () => void }[] = [
    { icon: Clock, label: "Review pending members", to: "/admin/members?status=pending_review" },
    { icon: UserPlus, label: "Invite a member", to: "/admin/members" },
    { icon: Target, label: "Start a new cohort", to: "/admin/momentum" },
    { icon: Megaphone, label: "Send announcement", action: openAnnounce },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold tracking-widest uppercase text-primary mb-1">Admin</p>
        <h1 className="font-display text-3xl font-semibold leading-tight">Home</h1>
        <p className="text-muted-foreground text-sm mt-1">Your command center for Luma Circle.</p>
      </div>

      {/* Needs your attention */}
      {attention.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Needs your attention</h2>
            </div>
            <div className="divide-y divide-border/60">
              {attention.map((row) => (
                <button key={row.label} onClick={() => navigate(row.to)} className="w-full flex items-center gap-3 py-3 text-left hover:opacity-80 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <row.icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="flex-1 text-sm"><span className="font-semibold">{row.n}</span> {row.label}</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="py-5">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <t.icon className="w-4 h-4 text-primary" />
              </div>
              <p className="font-display text-3xl font-semibold leading-none">{t.value}</p>
              <p className="text-sm font-medium mt-1">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity + quick actions */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <Card>
          <CardContent className="py-5">
            <h2 className="font-display text-lg font-semibold mb-4">Recent activity</h2>
            {!activity || activity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No recent activity to show.</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="flex-1 capitalize">{a.event_type.replace(/_/g, " ")}{a.entity_type ? ` · ${a.entity_type}` : ""}</span>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <h2 className="font-display text-lg font-semibold mb-4">Quick actions</h2>
            <div className="space-y-2">
              {quickActions.map((a) => (
                <button key={a.label} onClick={() => (a.to ? navigate(a.to) : a.action?.())} className="w-full flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-medium hover:border-primary/40 hover:bg-primary/5 transition-colors">
                  <a.icon className="w-4 h-4 text-primary" />
                  <span className="flex-1">{a.label}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
