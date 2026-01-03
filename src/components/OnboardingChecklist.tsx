import { Link } from "react-router-dom";
import { useOnboardingProgress } from "@/hooks/use-onboarding-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ChevronRight, X, Sparkles } from "lucide-react";

export function OnboardingChecklist() {
  const { shouldShow, completed, total, items, dismiss, isComplete } = useOnboardingProgress();

  if (!shouldShow) return null;

  const progressPercent = (completed / total) * 100;

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent animate-scale-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="font-display text-lg">Get Started</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => dismiss()}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <Progress value={progressPercent} className="h-2 flex-1" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {completed} of {total}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                to={item.link}
                className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${
                  item.done
                    ? "bg-success/10 text-success"
                    : "bg-muted/50 hover:bg-muted text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.done ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className={`text-sm ${item.done ? "line-through opacity-70" : ""}`}>
                    {item.label}
                  </span>
                </div>
                {!item.done && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </Link>
            </li>
          ))}
        </ul>

        {isComplete && (
          <div className="mt-4 p-4 rounded-lg bg-success/10 text-success text-center">
            <Sparkles className="w-6 h-6 mx-auto mb-2" />
            <p className="font-medium">You're all set! Welcome to the community.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
