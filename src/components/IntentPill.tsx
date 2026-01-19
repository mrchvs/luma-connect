import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Lightbulb,
  Users,
  MessageSquare,
  Eye,
  ChevronDown,
  Check,
} from "lucide-react";

const INTENT_OPTIONS = [
  { value: "perspective", label: "Get perspective", icon: Lightbulb },
  { value: "peers", label: "Meet peers", icon: Users },
  { value: "focused_chats", label: "Focused chats", icon: MessageSquare },
  { value: "quiet", label: "Quiet mode", icon: Eye },
];

const INTENT_SHORT_LABELS: Record<string, string> = {
  perspective: "Perspective",
  peers: "Peers",
  focused_chats: "Chats",
  quiet: "Quiet",
};

export function IntentPill() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const currentIntent = profile?.current_intent;

  if (!currentIntent) return null;

  const currentOption = INTENT_OPTIONS.find(o => o.value === currentIntent);
  const CurrentIcon = currentOption?.icon || Lightbulb;

  const handleSelectIntent = async (intent: string) => {
    if (!user || isUpdating) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ current_intent: intent })
        .eq("user_id", user.id);

      if (error) throw error;

      await refreshProfile();
      setOpen(false);
      
      if (intent === "quiet") {
        toast({
          title: "Quiet mode enabled",
          description: "You won't be prompted to reach out.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update your intent.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge 
          variant="secondary" 
          className="cursor-pointer gap-1.5 py-1 px-2.5 hover:bg-muted transition-colors"
        >
          <CurrentIcon className="w-3 h-3" />
          <span className="text-xs font-normal">
            {INTENT_SHORT_LABELS[currentIntent] || "Intent"}
          </span>
          <ChevronDown className="w-3 h-3" />
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="end">
        <p className="text-xs text-muted-foreground px-2 pb-2">
          Change your session intent
        </p>
        <div className="space-y-1">
          {INTENT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = currentIntent === option.value;
            
            return (
              <Button
                key={option.value}
                variant="ghost"
                size="sm"
                className={`w-full justify-start gap-2 ${isSelected ? "bg-primary/10" : ""}`}
                onClick={() => handleSelectIntent(option.value)}
                disabled={isUpdating}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left">{option.label}</span>
                {isSelected && <Check className="w-4 h-4 text-primary" />}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
