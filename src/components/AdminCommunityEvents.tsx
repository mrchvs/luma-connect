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
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Trash2, Edit, Link as LinkIcon, ExternalLink } from "lucide-react";

const EVENT_TYPES = [
  { value: "coworking", label: "Coworking Sprint" },
  { value: "office_hours", label: "Office Hours" },
  { value: "pitch_practice", label: "Pitch Practice" },
  { value: "hot_seat", label: "Hot-seat Coaching" },
  { value: "story_night", label: "Story Night" },
  { value: "discussion", label: "Discussion" },
];

const ENERGY_LEVELS = [
  { value: "low", label: "Low-key" },
  { value: "medium", label: "Moderate" },
  { value: "high", label: "High energy" },
];

const RECURRING_PATTERNS = [
  { value: "one_time", label: "One-time" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

interface EventFormData {
  title: string;
  description: string;
  purpose: string;
  who_its_for: string;
  energy_level: string;
  time_commitment: string;
  event_type: string;
  scheduled_at: string;
  duration_minutes: number;
  recurring_pattern: string;
  max_participants: number | null;
  live_event_link: string;
  signup_link: string;
}

const defaultFormData: EventFormData = {
  title: "",
  description: "",
  purpose: "",
  who_its_for: "",
  energy_level: "medium",
  time_commitment: "60 mins",
  event_type: "discussion",
  scheduled_at: "",
  duration_minutes: 60,
  recurring_pattern: "one_time",
  max_participants: null,
  live_event_link: "",
  signup_link: "",
};

export function AdminCommunityEvents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [formData, setFormData] = useState<EventFormData>(defaultFormData);

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-community-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_events")
        .select("*")
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("community_events")
        .insert({
          ...data,
          created_by: user.id,
          max_participants: data.max_participants || null,
          live_event_link: data.live_event_link || null,
          signup_link: data.signup_link || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-community-events"] });
      setDialogOpen(false);
      setFormData(defaultFormData);
      toast({ title: "Event created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EventFormData> }) => {
      const { error } = await supabase
        .from("community_events")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-community-events"] });
      setDialogOpen(false);
      setEditingEvent(null);
      setFormData(defaultFormData);
      toast({ title: "Event updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("community_events")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-community-events"] });
      toast({ title: "Event deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenDialog = (event?: any) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description || "",
        purpose: event.purpose || "",
        who_its_for: event.who_its_for || "",
        energy_level: event.energy_level || "medium",
        time_commitment: event.time_commitment || "60 mins",
        event_type: event.event_type,
        scheduled_at: event.scheduled_at?.slice(0, 16) || "",
        duration_minutes: event.duration_minutes || 60,
        recurring_pattern: event.recurring_pattern || "one_time",
        max_participants: event.max_participants,
        live_event_link: event.live_event_link || "",
        signup_link: event.signup_link || "",
      });
    } else {
      setEditingEvent(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, data: formData });
    } else {
      createEventMutation.mutate(formData);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-xl">Community Events</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEvent ? "Edit Event" : "Create Event"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Weekly Coworking Sprint"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select value={formData.event_type} onValueChange={(v) => setFormData({ ...formData, event_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Energy Level</Label>
                    <Select value={formData.energy_level} onValueChange={(v) => setFormData({ ...formData, energy_level: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ENERGY_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration (mins)</Label>
                    <Input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Recurring</Label>
                    <Select value={formData.recurring_pattern} onValueChange={(v) => setFormData({ ...formData, recurring_pattern: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRING_PATTERNS.map((pattern) => (
                          <SelectItem key={pattern.value} value={pattern.value}>
                            {pattern.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Who it's for</Label>
                  <Input
                    value={formData.who_its_for}
                    onChange={(e) => setFormData({ ...formData, who_its_for: e.target.value })}
                    placeholder="Early-stage founders"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Time Commitment</Label>
                  <Input
                    value={formData.time_commitment}
                    onChange={(e) => setFormData({ ...formData, time_commitment: e.target.value })}
                    placeholder="60 mins"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Purpose</Label>
                  <Textarea
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="Why this event exists..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Full event description..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Participants (optional)</Label>
                  <Input
                    type="number"
                    value={formData.max_participants || ""}
                    onChange={(e) => setFormData({ ...formData, max_participants: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ExternalLink className="w-3 h-3" />
                    Live Event Link (optional)
                  </Label>
                  <Input
                    type="url"
                    value={formData.live_event_link}
                    onChange={(e) => setFormData({ ...formData, live_event_link: e.target.value })}
                    placeholder="https://zoom.us/j/..."
                  />
                  <p className="text-xs text-muted-foreground">Zoom, Meet, or other live session link</p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <LinkIcon className="w-3 h-3" />
                    Signup / Application Link (optional)
                  </Label>
                  <Input
                    type="url"
                    value={formData.signup_link}
                    onChange={(e) => setFormData({ ...formData, signup_link: e.target.value })}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground">External form or application page</p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={createEventMutation.isPending || updateEventMutation.isPending}
                    className="flex-1"
                  >
                    {editingEvent ? "Update" : "Create"} Event
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Loading events...</p>
        ) : !events || events.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No events yet. Create your first event!</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.who_its_for}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {format(new Date(event.scheduled_at), "MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.scheduled_at), "h:mm a")}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{event.event_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={event.is_active ? "default" : "secondary"}>
                      {event.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(event)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteEventMutation.mutate(event.id)}
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
      </CardContent>
    </Card>
  );
}
