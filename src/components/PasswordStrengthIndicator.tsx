import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface Requirement {
  label: string;
  met: boolean;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const requirements = useMemo<Requirement[]>(() => [
    { label: "At least 6 characters", met: password.length >= 6 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains number", met: /\d/.test(password) },
    { label: "Contains special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ], [password]);

  const strength = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length;
    if (metCount <= 1) return { level: "weak", color: "bg-destructive", width: "w-1/4" };
    if (metCount <= 2) return { level: "fair", color: "bg-orange-500", width: "w-2/4" };
    if (metCount <= 4) return { level: "good", color: "bg-yellow-500", width: "w-3/4" };
    return { level: "strong", color: "bg-green-500", width: "w-full" };
  }, [requirements]);

  if (!password) return null;

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={`capitalize font-medium ${
            strength.level === "strong" ? "text-green-600" :
            strength.level === "good" ? "text-yellow-600" :
            strength.level === "fair" ? "text-orange-600" :
            "text-destructive"
          }`}>
            {strength.level}
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full ${strength.color} ${strength.width} transition-all duration-300 rounded-full`}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-1">
        {requirements.map((req, index) => (
          <li 
            key={index}
            className={`flex items-center gap-2 text-xs transition-colors ${
              req.met ? "text-green-600" : "text-muted-foreground"
            }`}
          >
            {req.met ? (
              <Check className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
}