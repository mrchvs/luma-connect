import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface MentorBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export function MentorBadge({ className, size = "sm" }: MentorBadgeProps) {
  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "bg-primary/10 text-primary border-primary/20 gap-1",
        size === "sm" ? "text-xs px-1.5 py-0" : "text-sm px-2 py-0.5",
        className
      )}
    >
      <GraduationCap className={cn(size === "sm" ? "w-3 h-3" : "w-4 h-4")} />
      Mentor
    </Badge>
  );
}
