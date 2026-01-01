import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageCircle, Clock, Video, Shield, CheckCircle2, Heart } from "lucide-react";

interface RequestIntroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  helper: {
    id: string;
    user_id: string;
    full_name: string;
    matchingTags: string[];
  };
  onSuccess?: () => void;
}

type IntroFormat = "async" | "short_call" | "long_call";

export function RequestIntroModal({
  open,
  onOpenChange,
  helper,
  onSuccess,
}: RequestIntroModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState(
    helper.matchingTags.length > 0
      ? `I'd love to connect about ${helper.matchingTags[0]}`
      : ""
  );
  const [outcome, setOutcome] = useState("");
  const [format, setFormat] = useState<IntroFormat>("async");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.from("intro_requests").insert({
        requester_id: user.id,
        helper_id: helper.user_id,
        message,
        expected_outcome: outcome,
        format,
        matching_tags: helper.matchingTags,
      }).select().single();

      if (error) throw error;

      // Send notification to helper
      try {
        const { error: fnError } = await supabase.functions.invoke("send-intro-notification", {
          body: { requestId: data.id, type: "new_request" },
        });
        if (fnError) {
          console.error("Failed to send notification:", fnError);
        }
      } catch (notifError) {
        console.error("Notification error:", notifError);
      }
    },
    onSuccess: () => {
      setShowConfirmation(true);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after modal closes
    setTimeout(() => {
      setMessage(
        helper.matchingTags.length > 0
          ? `I'd love to connect about ${helper.matchingTags[0]}`
          : ""
      );
      setOutcome("");
      setFormat("async");
      setShowConfirmation(false);
    }, 200);
  };

  const formatOptions = [
    {
      value: "async" as IntroFormat,
      label: "Async",
      description: "Email or messaging",
      icon: MessageCircle,
    },
    {
      value: "short_call" as IntroFormat,
      label: "20-30 min call",
      description: "Quick video chat",
      icon: Clock,
    },
    {
      value: "long_call" as IntroFormat,
      label: "45-60 min call",
      description: "In-depth discussion",
      icon: Video,
    },
  ];

  // Confirmation view after successful request
  if (showConfirmation) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[450px] text-center">
          <div className="py-6 space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-semibold">Request Sent</h2>
              <p className="text-muted-foreground">
                {helper.full_name} has been notified of your connection request.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">What happens next?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your request is now visible to {helper.full_name.split(' ')[0]}. They'll review it when they're ready—there's no pressure or time limit.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              We'll notify you when they respond. In the meantime, feel free to connect with other members.
            </p>

            <Button onClick={handleClose} className="w-full">
              Continue Browsing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Request intro with {helper.full_name}
          </DialogTitle>
          <DialogDescription>
            Share what you're looking for and how they can help you
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">What do you need help with?</Label>
            <Textarea
              id="message"
              placeholder="Describe what you're looking for..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Be specific about what you'd like to discuss
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="outcome">
              What outcome would make this successful?
            </Label>
            <Textarea
              id="outcome"
              placeholder="e.g., Get clarity on next steps for my project..."
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-3">
            <Label>Preferred format</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as IntroFormat)}
              className="grid gap-3"
            >
              {formatOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                    format === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <option.icon className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Admin consent notice */}
          <Alert variant="default" className="bg-muted/50 border-muted">
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-xs text-muted-foreground">
              Messages may be reviewed by community admins for support, safety, and moderation purposes.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => requestMutation.mutate()}
            disabled={!message.trim() || requestMutation.isPending}
          >
            {requestMutation.isPending ? (
              <LoadingSpinner size="sm" />
            ) : (
              "Send Request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
