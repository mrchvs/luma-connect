import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useCreateConversation } from "@/hooks/use-messaging";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

const INTENT_OPTIONS = [
  { value: "perspective", label: "Perspective" },
  { value: "reality_check", label: "Reality check" },
  { value: "decision_support", label: "Decision support" },
  { value: "emotional_reassurance", label: "Emotional reassurance" },
  { value: "strategic_clarity", label: "Strategic clarity" },
];

interface SendMessageButtonProps {
  recipientId: string;
  recipientName?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showIcon?: boolean;
}

export function SendMessageButton({
  recipientId,
  recipientName = "this member",
  variant = "default",
  size = "default",
  className,
  showIcon = true,
}: SendMessageButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createConversation = useCreateConversation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [isFirstMessage, setIsFirstMessage] = useState<boolean | null>(null);
  const [checkingConversation, setCheckingConversation] = useState(false);

  const checkIfFirstMessage = async () => {
    if (!user) return true;
    
    setCheckingConversation(true);
    try {
      // Check if a conversation already exists between these users
      const { data: existingConversation } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(participant_one.eq.${user.id},participant_two.eq.${recipientId}),and(participant_one.eq.${recipientId},participant_two.eq.${user.id})`)
        .maybeSingle();
      
      const isFirst = !existingConversation;
      setIsFirstMessage(isFirst);
      return isFirst;
    } catch (error) {
      console.error("Error checking conversation:", error);
      setIsFirstMessage(true);
      return true;
    } finally {
      setCheckingConversation(false);
    }
  };

  const handleOpenDialog = async () => {
    setOpen(true);
    await checkIfFirstMessage();
  };

  const handleSendMessage = async () => {
    if (!user) {
      toast.error("Please sign in to send a message");
      return;
    }

    try {
      const conversationId = await createConversation.mutateAsync({
        otherUserId: recipientId,
        initialMessage: message.trim() || undefined,
      });

      // If this is a first message and an intent was selected, update the message with intent
      if (isFirstMessage && selectedIntent && message.trim()) {
        // Get the message we just sent and update it with the intent
        const { data: messages } = await supabase
          .from("messages")
          .select("id")
          .eq("conversation_id", conversationId)
          .eq("sender_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (messages && messages.length > 0) {
          await supabase
            .from("messages")
            .update({ message_intent: selectedIntent })
            .eq("id", messages[0].id);
        }
      }

      toast.success("Message sent!");
      setOpen(false);
      setMessage("");
      setSelectedIntent(null);
      setIsFirstMessage(null);
      navigate(`/inbox/${conversationId}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setMessage("");
      setSelectedIntent(null);
      setIsFirstMessage(null);
    }
    setOpen(isOpen);
  };

  // Don't show button for own profile
  if (user?.id === recipientId) return null;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleOpenDialog}
      >
        {showIcon && <MessageCircle className="w-4 h-4 mr-2" />}
        Send Message
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Send a Message</DialogTitle>
            <DialogDescription>
              Start a conversation with {recipientName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Intent selector - only for first messages */}
            {isFirstMessage === true && (
              <div className="space-y-2">
                <Label>What kind of support are you hoping for from this conversation?</Label>
                <p className="text-xs text-muted-foreground">Optional — helps the receiver understand your needs</p>
                <div className="flex flex-wrap gap-2">
                  {INTENT_OPTIONS.map((intent) => (
                    <Badge
                      key={intent.value}
                      variant={selectedIntent === intent.value ? "default" : "outline"}
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => setSelectedIntent(
                        selectedIntent === intent.value ? null : intent.value
                      )}
                    >
                      {intent.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="message">Your message</Label>
              <Textarea
                id="message"
                placeholder="Hi! I'd love to connect..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={createConversation.isPending || checkingConversation}
            >
              {createConversation.isPending ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}