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
import { MessageCircle, Clock, Video } from "lucide-react";

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

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("intro_requests").insert({
        requester_id: user.id,
        helper_id: helper.user_id,
        message,
        expected_outcome: outcome,
        format,
        matching_tags: helper.matchingTags,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Request sent!",
        description: `${helper.full_name} will be notified of your request.`,
      });
      onOpenChange(false);
      setMessage("");
      setOutcome("");
      setFormat("async");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
