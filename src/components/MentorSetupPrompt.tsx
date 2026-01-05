import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowRight } from "lucide-react";

interface MentorSetupPromptProps {
  variant?: "card" | "inline";
  isComplete?: boolean;
}

export function MentorSetupPrompt({ variant = "card", isComplete = false }: MentorSetupPromptProps) {
  if (isComplete) return null;

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <GraduationCap className="w-5 h-5 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Complete your Mentor Profile</p>
          <p className="text-xs text-muted-foreground">Share your expertise with the community</p>
        </div>
        <Button size="sm" asChild>
          <Link to="/mentor/setup">
            Set Up
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="py-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-medium mb-1">
              You're approved as a Mentor!
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Complete your Mentor Profile to start offering paid sessions and help others in the community.
            </p>
            <Button asChild>
              <Link to="/mentor/setup">
                Complete Mentor Profile
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
