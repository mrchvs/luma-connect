import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UpvoteButtonProps {
  type: "request" | "comment";
  id: string;
  initialCount: number;
  initialUpvoted: boolean;
  onUpdate?: () => void;
}

export function UpvoteButton({ type, id, initialCount, initialUpvoted, onUpdate }: UpvoteButtonProps) {
  const { user } = useAuth();
  const [count, setCount] = useState(initialCount);
  const [upvoted, setUpvoted] = useState(initialUpvoted);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (!user) {
      toast.error("Please sign in to upvote");
      return;
    }

    setIsLoading(true);
    try {
      if (upvoted) {
        // Delete upvote
        if (type === "request") {
          const { error } = await supabase
            .from("request_upvotes")
            .delete()
            .eq("request_id", id)
            .eq("user_id", user.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("comment_upvotes")
            .delete()
            .eq("comment_id", id)
            .eq("user_id", user.id);
          if (error) throw error;
        }
        setCount((c) => c - 1);
        setUpvoted(false);
      } else {
        // Add upvote
        if (type === "request") {
          const { error } = await supabase
            .from("request_upvotes")
            .insert({ request_id: id, user_id: user.id });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("comment_upvotes")
            .insert({ comment_id: id, user_id: user.id });
          if (error) throw error;
        }
        setCount((c) => c + 1);
        setUpvoted(true);
      }
      onUpdate?.();
    } catch (error: any) {
      toast.error("Failed to update vote");
      console.error("Upvote error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        "flex flex-col items-center gap-0 h-auto py-1 px-2 min-w-[40px]",
        upvoted && "text-primary bg-primary/10"
      )}
    >
      <ChevronUp className={cn("w-4 h-4", upvoted && "text-primary")} />
      <span className="text-xs font-medium">{count}</span>
    </Button>
  );
}
