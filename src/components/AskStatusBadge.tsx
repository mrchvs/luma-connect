import { Badge } from "@/components/ui/badge";
import { Circle, CheckCircle2, Archive } from "lucide-react";

interface AskStatusBadgeProps {
  status: "open" | "resolved" | "archived";
}

export function AskStatusBadge({ status }: AskStatusBadgeProps) {
  const config = {
    open: {
      label: "Open",
      icon: Circle,
      className: "bg-success/10 text-success border-success/20",
    },
    resolved: {
      label: "Resolved",
      icon: CheckCircle2,
      className: "bg-muted text-muted-foreground border-muted",
    },
    archived: {
      label: "Archived",
      icon: Archive,
      className: "bg-muted text-muted-foreground border-muted",
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge variant="outline" className={`gap-1.5 ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}
