import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useOnboardingProgress } from "@/hooks/use-onboarding-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ChevronRight, ChevronDown, X, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

const COLLAPSED_KEY = "onboarding-checklist-collapsed";

export function OnboardingChecklist() {
  const { shouldShow, completed, total, items, dismiss, isComplete } = useOnboardingProgress();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(COLLAPSED_KEY);
    return saved === "true";
  });
  const hasShownConfetti = useRef(false);

  // Fire confetti when all items are complete
  useEffect(() => {
    if (isComplete && !hasShownConfetti.current) {
      hasShownConfetti.current = true;
      // Fire confetti from multiple angles
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);
    }
  }, [isComplete]);

  // Persist collapsed state
  const handleToggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(COLLAPSED_KEY, String(newState));
  };

  if (!shouldShow && !isComplete) return null;

  const progressPercent = (completed / total) * 100;

  // Show completion message when all items are done
  if (isComplete) {
    return (
      <Card className="mb-6 border-success/30 bg-gradient-to-br from-success/10 to-transparent animate-scale-in">
        <CardContent className="py-6">
          <div className="text-center">
            <Sparkles className="w-8 h-8 mx-auto mb-3 text-success" />
            <h3 className="font-display text-lg font-semibold text-success mb-1">
              You're all set!
            </h3>
            <p className="text-sm text-muted-foreground">
              Welcome to the community. Time to connect and grow!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent animate-scale-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handleToggleCollapse}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="font-display text-lg">Get Started</CardTitle>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {completed} of {total}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => dismiss()}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="mt-2">
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-0 animate-fade-in">
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
        </CardContent>
      )}
    </Card>
  );
}
