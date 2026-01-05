import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useCreateBooking } from "@/hooks/use-mentor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, DollarSign, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import type { MentorService, MentorProfile } from "@/hooks/use-mentor";

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: MentorService;
  mentorProfile: MentorProfile;
  mentorName: string;
  mentorAvatar?: string | null;
}

export function BookingModal({
  open,
  onOpenChange,
  service,
  mentorProfile,
  mentorName,
  mentorAvatar,
}: BookingModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const createBooking = useCreateBooking();

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} hour ${mins} min` : `${hours} hour`;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleConfirmBooking = async () => {
    if (!user) {
      toast.error("Please sign in to book a session");
      return;
    }

    try {
      await createBooking.mutateAsync({
        mentor_id: mentorProfile.id,
        service_id: service.id,
        service_name: service.name,
        duration_minutes: service.duration_minutes,
        price_cents: service.price_cents,
        currency: service.currency,
        notes: notes || undefined,
      });

      toast.success("Booking request sent! Check your messages for next steps.");
      onOpenChange(false);
      
      // Navigate to connections/messages
      navigate("/connections");
    } catch (error: any) {
      toast.error(error.message || "Failed to create booking");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Book a Session</DialogTitle>
          <DialogDescription>
            Review the details and confirm your booking request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Mentor info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={mentorAvatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(mentorName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{mentorName}</p>
              <p className="text-sm text-muted-foreground">Mentor</p>
            </div>
          </div>

          {/* Service details */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{service.name}</h4>
              <Badge variant="outline" className="text-primary border-primary/30">
                <DollarSign className="w-3 h-3 mr-0.5" />
                Paid Session
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{service.description}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-4 h-4" />
                {formatDuration(service.duration_minutes)}
              </span>
              <span className="font-semibold text-lg text-primary">
                {formatPrice(service.price_cents, service.currency)}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Add a note (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Share what you'd like to discuss or any questions you have..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Info box */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <MessageCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              After booking, a private message thread will be created with the mentor to coordinate scheduling and payment details.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmBooking}
            disabled={createBooking.isPending}
          >
            {createBooking.isPending ? "Sending..." : "Confirm Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
