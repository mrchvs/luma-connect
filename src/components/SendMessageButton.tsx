import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useCreateConversation } from "@/hooks/use-messaging";
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
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

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

      toast.success("Message sent!");
      setOpen(false);
      setMessage("");
      navigate(`/inbox/${conversationId}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setMessage("");
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
        onClick={() => setOpen(true)}
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
              disabled={createConversation.isPending}
            >
              {createConversation.isPending ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
