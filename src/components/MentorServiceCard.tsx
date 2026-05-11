import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign } from "lucide-react";
import type { MentorService } from "@/hooks/use-mentor";

interface MentorServiceCardProps {
  service: MentorService;
  onBook?: () => void;
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function MentorServiceCard({ 
  service, 
  onBook,
  isOwner = false,
  onEdit,
  onDelete,
}: MentorServiceCardProps) {
  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <Card className="hover:shadow-card transition-shadow">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium truncate">{service.name}</h4>
              <Badge variant="outline" className="text-xs text-primary border-primary/30 flex-shrink-0">
                <DollarSign className="w-3 h-3 mr-0.5" />
                Paid
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {service.description}
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-4 h-4" />
                {formatDuration(service.duration_minutes)}
              </span>
              <span className="font-medium text-primary">
                {formatPrice(service.price_cents, service.currency)}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {isOwner ? (
              <>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
                  Delete
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={onBook}>
                Book
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
