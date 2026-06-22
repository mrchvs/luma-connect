import { ReactNode } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Home, Users, MessageCircle, Target, BookOpen, Mail, MessageSquare,
  Settings, ArrowLeft, LucideIcon,
} from "lucide-react";

interface NavItem {
  key: string;        // route section ("home" → /admin)
  label: string;
  icon: LucideIcon;
  badgeKey?: "members" | "asks" | "momentum" | "feedback";
}

const GROUPS: { label: string | null; items: NavItem[] }[] = [
  { label: null, items: [{ key: "home", label: "Home", icon: Home }] },
  {
    label: "Community",
    items: [
      { key: "members", label: "Members", icon: Users, badgeKey: "members" },
      { key: "asks", label: "Asks", icon: MessageCircle, badgeKey: "asks" },
      { key: "momentum", label: "Momentum", icon: Target, badgeKey: "momentum" },
    ],
  },
  {
    label: "Growth",
    items: [
      { key: "resources", label: "Resources", icon: BookOpen },
      { key: "leads", label: "Leads", icon: Mail },
      { key: "feedback", label: "Feedback", icon: MessageSquare, badgeKey: "feedback" },
    ],
  },
  {
    label: "Settings",
    items: [{ key: "settings", label: "Security & Roles", icon: Settings }],
  },
];

// Lightweight attention counters shared with the Home command center.
export function useAdminNavCounts() {
  return useQuery({
    queryKey: ["admin-nav-counts"],
    queryFn: async () => {
      const [members, asks, momentum, feedback] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending_review").eq("completed", true),
        supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", "open"),
        (supabase as any).from("accountability_cycle_members").select("*", { count: "exact", head: true }).eq("status", "pending"),
        (supabase as any).from("member_feedback").select("*", { count: "exact", head: true }),
      ]);
      return {
        members: members.count ?? 0,
        asks: asks.count ?? 0,
        momentum: momentum.count ?? 0,
        feedback: feedback.count ?? 0,
      };
    },
  });
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const current = section ?? "home";
  const { user, profile } = useAuth();
  const { data: counts } = useAdminNavCounts();

  const go = (key: string) => navigate(key === "home" ? "/admin" : `/admin/${key}`);

  return (
    <SidebarProvider style={{ "--sidebar-width": "248px" } as React.CSSProperties}>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border">
          <Link to="/admin" className="flex flex-col gap-1 px-2 py-3">
            <Logo size="sm" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-primary pl-1">Admin</span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          {GROUPS.map((group, i) => (
            <SidebarGroup key={group.label ?? `g${i}`}>
              {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const badge = item.badgeKey ? counts?.[item.badgeKey] ?? 0 : 0;
                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          isActive={current === item.key}
                          onClick={() => go(item.key)}
                          className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold"
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                        {badge > 0 && (
                          <SidebarMenuBadge className="bg-primary text-primary-foreground">
                            {badge}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
              {(profile?.full_name ?? user?.email ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name ?? "Admin"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-background">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/50 bg-background/80 px-4 backdrop-blur-sm">
          <SidebarTrigger />
          <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to app</span>
          </Link>
          <div className="flex-1" />
          {/* ⌘K search + Announce land here in the next increment */}
          <NotificationBell />
        </header>

        <main className="p-4 md:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
