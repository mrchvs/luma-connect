import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useOnboardingProgress } from "@/hooks/use-onboarding-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ChevronRight, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

const COLLAPSED_KEY = "onboarding-checklist-collapsed";
const CELEBRATION_SHOWN_KEY = "onboarding-celebration-shown";

export function OnboardingChecklist() {
  const { shouldShow, completed, total, items, isComplete } = useOnboardingProgress();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(COLLAPSED_KEY);
    return saved === "true";
  });
  const [showCelebration, setShowCelebration] = useState(false);
  const hasShownConfetti = useRef(false);
  const celebrationDismissed = useRef(
    localStorage.getItem(CELEBRATION_SHOWN_KEY) === "true"
  );

  // Fire confetti and show celebration only once when completing
  useEffect(() => {
    if (isComplete && !celebrationDismissed.current && !hasShownConfetti.current) {
      hasShownConfetti.current = true;
      setShowCelebration(true);
      
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

      // Auto-dismiss celebration after 5 seconds
      const dismissTimer = setTimeout(() => {
        setShowCelebration(false);
        localStorage.setItem(CELEBRATION_SHOWN_KEY, "true");
        celebrationDismissed.current = true;
      }, 5000);

      return () => {
        clearInterval(interval);
        clearTimeout(dismissTimer);
      };
    }
  }, [isComplete]);

  // Persist collapsed state
  const handleToggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(COLLAPSED_KEY, String(newState));
  };

  // If celebration was already shown and onboarding is complete, hide entirely
  if (isComplete && celebrationDismissed.current && !showCelebration) {
    return null;
  }

  // Show celebration card (only once, auto-dismisses)
  if (showCelebration) {
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

  // Don't show checklist if onboarding not needed
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
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {completed} of {total}
            </span>
            <button
              onClick={handleToggleCollapse}
              className="p-1 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              aria-label={isCollapsed ? "Expand checklist" : "Collapse checklist"}
            >
              {isCollapsed ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronUp className="w-5 h-5" />
              )}
            </button>
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
