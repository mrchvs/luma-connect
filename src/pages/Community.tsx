import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { MainNav } from "@/components/MainNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { AskCard } from "@/components/AskCard";
import { AskFormModal } from "@/components/AskFormModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import {
  MessageCircle,
  Users,
  UsersRound,
  Calendar,
  Plus,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Lightbulb,
  Target,
  Coffee,
  Mic,
  Zap,
  BookOpen,
} from "lucide-react";

const EVENT_ICONS: Record<string, any> = {
  coworking: Coffee,
  office_hours: Users,
  pitch_practice: Mic,
  hot_seat: Zap,
  story_night: BookOpen,
  discussion: MessageCircle,
  default: Calendar,
};

const SEED_PROMPTS = [
  {
    icon: HelpCircle,
    title: "What's blocking you this week?",
    description: "Share a specific challenge you're facing",
  },
  {
    icon: Lightbulb,
    title: "What decision are you overthinking?",
    description: "Get perspective from peers who've been there",
  },
  {
    icon: Target,
    title: "What skill would transform your work?",
    description: "Find someone who can help you level up",
  },
];

export default function Community() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [showAskModal, setShowAskModal] = useState(false);

  // Fetch recent open asks
  const { data: recentAsks, isLoading: asksLoading, refetch: refetchAsks } = useQuery({
    queryKey: ["community-recent-asks"],
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from("requests")
        .select(`
          *,
          request_tags(tag_id, tags(id, label))
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      if (!requests || requests.length === 0) return [];

      // Get profiles for asks
      const userIds = [...new Set(requests.map(r => r.created_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, job_title, company_name")
        .in("user_id", userIds);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

      // Get counts
      const requestIds = requests.map(r => r.id);
      const { data: comments } = await supabase
        .from("request_comments")
        .select("request_id")
        .in("request_id", requestIds);

      const commentCounts: Record<string, number> = {};
      (comments || []).forEach((c) => {
        commentCounts[c.request_id] = (commentCounts[c.request_id] || 0) + 1;
      });

      return requests.map(r => ({
        ...r,
        comment_count: commentCounts[r.id] || 0,
        upvote_count: 0,
        profile: profileMap[r.created_by],
      }));
    },
    enabled: !!user && profile?.status === "approved",
  });

  // Fetch upcoming events
  const { data: upcomingEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["community-upcoming-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_events")
        .select("*")
        .eq("is_active", true)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(3);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch active pods
  const { data: activePods, isLoading: podsLoading } = useQuery({
    queryKey: ["community-active-pods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pods")
        .select("id, name, focus_type, focus_value, status")
        .eq("status", "active")
        .limit(3);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch recently joined members
  const { data: recentMembers, isLoading: membersLoading } = useQuery({
    queryKey: ["community-recent-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, short_bio, created_at")
        .eq("status", "approved")
        .eq("completed", true)
        .neq("user_id", user?.id || "")
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Activity signals
  const { data: activityStats } = useQuery({
    queryKey: ["community-activity-stats"],
    queryFn: async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Count active conversations this week
      const { count: messageCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneWeekAgo.toISOString());

      // Count active pods
      const { count: podCount } = await supabase
        .from("pods")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Count open asks
      const { count: askCount } = await supabase
        .from("requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");

      return {
        conversations: messageCount || 0,
        pods: podCount || 0,
        asks: askCount || 0,
      };
    },
    enabled: !!user,
  });

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (profile?.status !== "approved") {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen gradient-hero">
      <MainNav />

      <main className="container py-8 px-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-semibold">Community</h1>
          </div>
          <p className="text-muted-foreground">
            Connect, learn, and grow together
          </p>
        </div>

        {/* Activity Signals */}
        {activityStats && (activityStats.conversations > 0 || activityStats.pods > 0 || activityStats.asks > 0) && (
          <div className="flex flex-wrap gap-3 mb-6 animate-slide-up" style={{ animationDelay: "0.05s" }}>
            {activityStats.asks > 0 && (
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <MessageCircle className="w-3.5 h-3.5" />
                {activityStats.asks} open asks
              </Badge>
            )}
            {activityStats.pods > 0 && (
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <UsersRound className="w-3.5 h-3.5" />
                {activityStats.pods} active pods
              </Badge>
            )}
            {activityStats.conversations > 5 && (
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <Users className="w-3.5 h-3.5" />
                {activityStats.conversations}+ messages this week
              </Badge>
            )}
          </div>
        )}

        {/* Ways to Participate */}
        <Card className="mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Ways to Participate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/30"
                onClick={() => setShowAskModal(true)}
              >
                <MessageCircle className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Ask a question</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/30"
                asChild
              >
                <Link to="/pods">
                  <UsersRound className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">Join a pod</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/30"
                asChild
              >
                <Link to="/community-asks">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">Attend a session</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/30"
                asChild
              >
                <Link to="/people">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">Browse people</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Community Pulse - Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Recent Asks */}
          <Card className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <CardTitle className="font-display text-lg">Recent Asks</CardTitle>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/community-asks" className="text-xs gap-1">
                    View all
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {asksLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="sm" />
                </div>
              ) : recentAsks && recentAsks.length > 0 ? (
                <div className="space-y-3">
                  {recentAsks.slice(0, 3).map((ask: any) => (
                    <Link
                      key={ask.id}
                      to={`/community-asks/${ask.id}`}
                      className="block p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <p className="text-sm font-medium line-clamp-1 mb-1">
                        {ask.title || ask.body.slice(0, 60)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={ask.profile?.avatar_url} />
                          <AvatarFallback className="text-[8px]">
                            {getInitials(ask.profile?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{ask.profile?.full_name?.split(" ")[0] || "Member"}</span>
                        {ask.comment_count > 0 && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              {ask.comment_count}
                            </span>
                          </>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">
                    No asks yet. Here are some prompts to get started:
                  </p>
                  {SEED_PROMPTS.map((prompt, index) => {
                    const Icon = prompt.icon;
                    return (
                      <button
                        key={index}
                        onClick={() => setShowAskModal(true)}
                        className="w-full p-3 rounded-lg border border-dashed hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">{prompt.title}</p>
                            <p className="text-xs text-muted-foreground">{prompt.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Sessions */}
          <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <CardTitle className="font-display text-lg">Upcoming Sessions</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="sm" />
                </div>
              ) : upcomingEvents && upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => {
                    const EventIcon = EVENT_ICONS[event.event_type] || EVENT_ICONS.default;
                    return (
                      <div
                        key={event.id}
                        className="p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <EventIcon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-1">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(event.scheduled_at), "EEE, MMM d · h:mm a")}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No upcoming sessions</p>
                  <p className="text-xs text-muted-foreground">Check back soon!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Pods */}
        {activePods && activePods.length > 0 && (
          <Card className="mb-6 animate-slide-up" style={{ animationDelay: "0.25s" }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UsersRound className="w-5 h-5 text-primary" />
                  <CardTitle className="font-display text-lg">Active Pods</CardTitle>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/pods" className="text-xs gap-1">
                    View all
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-3">
                {activePods.map((pod) => (
                  <div
                    key={pod.id}
                    className="p-3 rounded-lg border bg-muted/30"
                  >
                    <p className="text-sm font-medium">{pod.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {pod.focus_type}: {pod.focus_value?.replace("_", " ")}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recently Joined */}
        <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <CardTitle className="font-display text-lg">Recently Joined</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/people" className="text-xs gap-1">
                  Browse all
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="sm" />
              </div>
            ) : recentMembers && recentMembers.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {recentMembers.map((member) => (
                  <Link
                    key={member.user_id}
                    to={`/profile/${member.user_id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.full_name?.split(" ")[0]}</p>
                      {member.short_bio && (
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-[120px]">
                          {member.short_bio}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Be the first to join!
              </p>
            )}
          </CardContent>
        </Card>
      </main>

      <AskFormModal
        open={showAskModal}
        onOpenChange={setShowAskModal}
        onSuccess={() => refetchAsks()}
      />
    </div>
  );
}
