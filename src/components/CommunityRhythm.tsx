import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  Users,
  Zap,
  Coffee,
  Mic,
  BookOpen,
  MessageCircle,
  Check,
  ArrowRight,
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

const ENERGY_LEVELS: Record<string, { label: string; color: string }> = {
  low: { label: "Low-key", color: "bg-emerald-500/10 text-emerald-600" },
  medium: { label: "Moderate", color: "bg-amber-500/10 text-amber-600" },
  high: { label: "High energy", color: "bg-rose-500/10 text-rose-600" },
};

interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  purpose: string | null;
  who_its_for: string | null;
  energy_level: string | null;
  time_commitment: string | null;
  event_type: string;
  scheduled_at: string;
  duration_minutes: number;
  recurring_pattern: string | null;
  max_participants: number | null;
  live_event_link: string | null;
  signup_link: string | null;
  user_rsvp?: string | null;
  rsvp_count?: number;
}

export function CommunityRhythm() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const currentIntent = profile?.current_intent;

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ["community-events", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch upcoming events
      const { data: eventsData, error: eventsError } = await supabase
        .from("community_events")
        .select("*")
        .eq("is_active", true)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(5);

      if (eventsError) throw eventsError;
      if (!eventsData) return [];

      // Fetch user's RSVPs
      const eventIds = eventsData.map(e => e.id);
      const { data: rsvps } = await supabase
        .from("event_rsvps")
        .select("event_id, status")
        .in("event_id", eventIds)
        .eq("user_id", user.id);

      const rsvpMap = new Map(rsvps?.map(r => [r.event_id, r.status]) || []);

      // Get RSVP counts
      const { data: rsvpCounts } = await supabase
        .from("event_rsvps")
        .select("event_id")
        .in("event_id", eventIds)
        .eq("status", "attending");

      const countMap = new Map<string, number>();
      rsvpCounts?.forEach(r => {
        countMap.set(r.event_id, (countMap.get(r.event_id) || 0) + 1);
      });

      return eventsData.map((event): CommunityEvent => ({
        ...event,
        user_rsvp: rsvpMap.get(event.id) || null,
        rsvp_count: countMap.get(event.id) || 0,
      }));
    },
    enabled: !!user,
  });

  const handleRSVP = async (eventId: string, status: "attending" | "declined") => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("event_rsvps")
        .upsert({
          event_id: eventId,
          user_id: user.id,
          status,
        });

      if (error) throw error;

      toast({
        title: status === "attending" ? "You're in!" : "RSVP updated",
        description: status === "attending" 
          ? "We'll send you a reminder before the event." 
          : "You've declined this event.",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update RSVP. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filter events based on current intent (simplified relevance)
  const relevantEvents = events?.filter(event => {
    // In quiet mode, show fewer events
    if (currentIntent === "quiet") {
      return event.energy_level === "low";
    }
    return true;
  }).slice(0, 3);

  if (isLoading || !relevantEvents || relevantEvents.length === 0) return null;

  return (
    <Card className="mb-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <CardTitle className="font-display text-lg">Community Rhythm</CardTitle>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/events" className="text-xs gap-1">
              View all
              <ArrowRight className="w-3 h-3" />
            </Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Recurring touchpoints to connect and learn together
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {relevantEvents.map((event) => {
          const EventIcon = EVENT_ICONS[event.event_type] || EVENT_ICONS.default;
          const energyConfig = ENERGY_LEVELS[event.energy_level || "medium"];
          const isAttending = event.user_rsvp === "attending";
          
          return (
            <div
              key={event.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <EventIcon className="w-5 h-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-medium text-sm">{event.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(event.scheduled_at), "EEE, MMM d · h:mm a")}
                    </p>
                  </div>
                  
                  {isAttending ? (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Check className="w-3 h-3" />
                      Going
                    </Badge>
                  ) : event.signup_link ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      asChild
                    >
                      <a href={event.signup_link} target="_blank" rel="noopener noreferrer">
                        Apply
                      </a>
                    </Button>
                  ) : event.live_event_link ? (
                    <Button
                      size="sm"
                      variant="default"
                      className="text-xs h-7"
                      asChild
                    >
                      <a href={event.live_event_link} target="_blank" rel="noopener noreferrer">
                        Join live
                      </a>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => handleRSVP(event.id, "attending")}
                    >
                      RSVP
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {event.who_its_for && (
                    <Badge variant="outline" className="text-[10px] py-0">
                      {event.who_its_for}
                    </Badge>
                  )}
                  {energyConfig && (
                    <Badge className={`text-[10px] py-0 ${energyConfig.color}`}>
                      {energyConfig.label}
                    </Badge>
                  )}
                  {event.time_commitment && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {event.time_commitment}
                    </span>
                  )}
                  {event.rsvp_count !== undefined && event.rsvp_count > 0 && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {event.rsvp_count} going
                    </span>
                  )}
                </div>
                
                {event.purpose && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                    {event.purpose}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
