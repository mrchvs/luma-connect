import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Bug, Lightbulb, Star, HelpCircle, Loader2 } from "lucide-react";

const feedbackTypes = [
  { value: "bug", label: "Bug Report", icon: Bug, description: "Something isn't working" },
  { value: "feature", label: "Feature Request", icon: Lightbulb, description: "Suggest an improvement" },
  { value: "praise", label: "Praise", icon: Star, description: "Share what you love" },
  { value: "general", label: "General Feedback", icon: HelpCircle, description: "Other comments" },
];

export function FeedbackWidget() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState("");
  const [message, setMessage] = useState("");

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in");
      if (!feedbackType) throw new Error("Please select a feedback type");
      if (!message.trim()) throw new Error("Please enter your feedback");

      const { error } = await supabase.from("member_feedback").insert({
        user_id: user.id,
        feedback_type: feedbackType,
        message: message.trim(),
        page_url: window.location.pathname,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Thank you!", description: "Your feedback has been submitted." });
      setOpen(false);
      setFeedbackType("");
      setMessage("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 shadow-lg z-40"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Feedback</DialogTitle>
          <DialogDescription>
            Help us improve by sharing your thoughts, reporting bugs, or suggesting features.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>What type of feedback?</Label>
            <Select value={feedbackType} onValueChange={setFeedbackType}>
              <SelectTrigger>
                <SelectValue placeholder="Select feedback type" />
              </SelectTrigger>
              <SelectContent>
                {feedbackTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Your feedback</Label>
            <Textarea
              placeholder="Tell us what's on your mind..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || !feedbackType || !message.trim()}
            className="w-full"
          >
            {submitMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Submit Feedback
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
