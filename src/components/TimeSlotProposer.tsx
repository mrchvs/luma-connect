import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, addDays, setHours, setMinutes, isBefore } from "date-fns";
import { CalendarIcon, Clock, Check, X, Plus, Trash2 } from "lucide-react";

interface TimeSlot {
  id: string;
  intro_request_id: string;
  proposed_by: string;
  start_time: string;
  duration_minutes: number;
  status: "proposed" | "accepted" | "declined";
  created_at: string;
}

interface TimeSlotProposerProps {
  requestId: string;
  otherPartyName: string;
  isRequester: boolean;
  format: "short_call" | "long_call";
}

const timeOptions = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00"
];

export function TimeSlotProposer({ 
  requestId, 
  otherPartyName, 
  isRequester,
  format: callFormat 
}: TimeSlotProposerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [showProposer, setShowProposer] = useState(false);
  
  const duration = callFormat === "short_call" ? 30 : 60;

  const { data: timeSlots, isLoading } = useQuery({
    queryKey: ["time-slots", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposed_time_slots")
        .select("*")
        .eq("intro_request_id", requestId)
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data as TimeSlot[];
    },
    enabled: !!requestId,
  });

  const proposeMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedDate || !selectedTime) return;

      const [hours, minutes] = selectedTime.split(":").map(Number);
      const startTime = setMinutes(setHours(selectedDate, hours), minutes);

      const { data, error } = await supabase.from("proposed_time_slots").insert({
        intro_request_id: requestId,
        proposed_by: user.id,
        start_time: startTime.toISOString(),
        duration_minutes: duration,
      }).select().single();

      if (error) throw error;

      // Send notification
      try {
        await supabase.functions.invoke("send-timeslot-notification", {
          body: { timeSlotId: data.id, type: "proposed" },
        });
      } catch (notifError) {
        console.error("Notification error:", notifError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-slots", requestId] });
      setSelectedDate(undefined);
      setSelectedTime("");
      setShowProposer(false);
      toast({
        title: "Time proposed",
        description: `${otherPartyName} will be notified of your suggestion.`,
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

  const updateSlotMutation = useMutation({
    mutationFn: async ({ slotId, status }: { slotId: string; status: "accepted" | "declined" }) => {
      const { error } = await supabase
        .from("proposed_time_slots")
        .update({ status })
        .eq("id", slotId);

      if (error) throw error;

      // Send notification for accepted slots
      if (status === "accepted") {
        try {
          await supabase.functions.invoke("send-timeslot-notification", {
            body: { timeSlotId: slotId, type: "accepted" },
          });
        } catch (notifError) {
          console.error("Notification error:", notifError);
        }
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["time-slots", requestId] });
      toast({
        title: status === "accepted" ? "Time confirmed!" : "Time declined",
        description: status === "accepted" 
          ? "The meeting time has been set. Calendar links are available." 
          : "You can propose alternative times.",
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

  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase
        .from("proposed_time_slots")
        .delete()
        .eq("id", slotId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-slots", requestId] });
      toast({ title: "Time slot removed" });
    },
  });

  const acceptedSlot = timeSlots?.find(s => s.status === "accepted");
  const proposedSlots = timeSlots?.filter(s => s.status === "proposed") || [];
  const myProposedSlots = proposedSlots.filter(s => s.proposed_by === user?.id);
  const theirProposedSlots = proposedSlots.filter(s => s.proposed_by !== user?.id);

  if (isLoading) {
    return <div className="animate-pulse h-24 bg-muted/30 rounded-lg" />;
  }

  // Helper to generate calendar URLs
  const generateGoogleCalendarUrl = (slot: TimeSlot) => {
    const startTime = new Date(slot.start_time);
    const endTime = new Date(startTime.getTime() + slot.duration_minutes * 60 * 1000);
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, "");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `Luma Circle Call with ${otherPartyName}`,
      dates: `${formatDate(startTime)}/${formatDate(endTime)}`,
      details: "Connection call via Luma Circle",
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const generateOutlookCalendarUrl = (slot: TimeSlot) => {
    const startTime = new Date(slot.start_time);
    const endTime = new Date(startTime.getTime() + slot.duration_minutes * 60 * 1000);
    const params = new URLSearchParams({
      path: "/calendar/action/compose",
      rru: "addevent",
      subject: `Luma Circle Call with ${otherPartyName}`,
      startdt: startTime.toISOString(),
      enddt: endTime.toISOString(),
      body: "Connection call via Luma Circle",
    });
    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  };

  // If there's an accepted time
  if (acceptedSlot) {
    const googleUrl = generateGoogleCalendarUrl(acceptedSlot);
    const outlookUrl = generateOutlookCalendarUrl(acceptedSlot);

    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="py-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="font-medium text-success">Meeting Scheduled</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(acceptedSlot.start_time), "EEEE, MMMM d 'at' h:mm a")}
                {" · "}{acceptedSlot.duration_minutes} minutes
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 pt-2 border-t border-success/20">
            <Button variant="outline" size="sm" asChild className="text-xs">
              <a href={googleUrl} target="_blank" rel="noopener noreferrer">
                <CalendarIcon className="w-3 h-3 mr-1.5" />
                Add to Google Calendar
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="text-xs">
              <a href={outlookUrl} target="_blank" rel="noopener noreferrer">
                <CalendarIcon className="w-3 h-3 mr-1.5" />
                Add to Outlook
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Schedule Your Call
        </CardTitle>
        <CardDescription>
          Propose times that work for you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Their proposals */}
        {theirProposedSlots.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {otherPartyName.split(" ")[0]}'s suggestions
            </p>
            <div className="space-y-2">
              {theirProposedSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      {format(new Date(slot.start_time), "EEE, MMM d 'at' h:mm a")}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {slot.duration_minutes} min
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateSlotMutation.mutate({ slotId: slot.id, status: "accepted" })}
                      disabled={updateSlotMutation.isPending}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateSlotMutation.mutate({ slotId: slot.id, status: "declined" })}
                      disabled={updateSlotMutation.isPending}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My proposals */}
        {myProposedSlots.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Your suggestions
            </p>
            <div className="space-y-2">
              {myProposedSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(slot.start_time), "EEE, MMM d 'at' h:mm a")}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      Waiting
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => deleteSlotMutation.mutate(slot.id)}
                    disabled={deleteSlotMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new proposal */}
        {showProposer ? (
          <div className="space-y-3 p-4 border border-dashed rounded-lg">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => isBefore(date, addDays(new Date(), -1))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Time
                </label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => proposeMutation.mutate()}
                disabled={!selectedDate || !selectedTime || proposeMutation.isPending}
                className="flex-1"
              >
                Propose Time
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowProposer(false);
                  setSelectedDate(undefined);
                  setSelectedTime("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowProposer(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Propose a Time
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Times are shown in your local timezone
        </p>
      </CardContent>
    </Card>
  );
}
