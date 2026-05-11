import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Lightbulb,
  Users,
  MessageSquare,
  Eye,
  Check,
} from "lucide-react";

const INTENT_OPTIONS = [
  {
    value: "perspective",
    label: "Get perspective on a decision",
    icon: Lightbulb,
    description: "Seek input from others who've been there",
  },
  {
    value: "peers",
    label: "Meet peers at my stage",
    icon: Users,
    description: "Connect with founders in similar phases",
  },
  {
    value: "focused_chats",
    label: "Have focused 1:1 chats",
    icon: MessageSquare,
    description: "Deep conversations with matched members",
  },
  {
    value: "quiet",
    label: "Explore quietly (no outreach)",
    icon: Eye,
    description: "Browse without prompts to reach out",
  },
];

export type SessionIntent = "perspective" | "peers" | "focused_chats" | "quiet" | null;

interface SessionIntentSelectorProps {
  onIntentChange?: (intent: SessionIntent) => void;
}

export function SessionIntentSelector({ onIntentChange }: SessionIntentSelectorProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [selectedIntent, setSelectedIntent] = useState<SessionIntent>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load current intent from profile
  useEffect(() => {
    if (profile?.current_intent) {
      setSelectedIntent(profile.current_intent as SessionIntent);
    }
  }, [profile]);

  const handleSelectIntent = async (intent: SessionIntent) => {
    if (!user || isUpdating) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ current_intent: intent })
        .eq("user_id", user.id);

      if (error) throw error;

      setSelectedIntent(intent);
      onIntentChange?.(intent);
      
      if (intent === "quiet") {
        toast({
          title: "Quiet mode enabled",
          description: "You won't be prompted to reach out. Browse peacefully.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update your intent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mb-8 animate-slide-up">
      <h2 className="font-display text-lg font-medium mb-1">
        What are you here for today?
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Choose an intention — your experience will adapt.
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {INTENT_OPTIONS.map((option) => {
          const isSelected = selectedIntent === option.value;
          const Icon = option.icon;
          
          return (
            <Card
              key={option.value}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected 
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                  : "hover:border-primary/50"
              }`}
              onClick={() => handleSelectIntent(option.value as SessionIntent)}
            >
              <CardContent className="p-4 relative">
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                )}
                <Icon className={`w-5 h-5 mb-2 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-sm font-medium leading-tight">{option.label}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-tight">
                  {option.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function useCurrentIntent(): SessionIntent {
  const { profile } = useAuth();
  return (profile?.current_intent as SessionIntent) || null;
}
