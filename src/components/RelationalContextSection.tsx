import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Navigation,
  XCircle,
  MessageSquare,
} from "lucide-react";

const NOT_LOOKING_FOR_OPTIONS = [
  "Clients",
  "Fundraising",
  "Hiring",
  "Mentoring",
  "Collabs",
];

const CONVERSATION_STYLE_OPTIONS = [
  "No pitching",
  "Practical & tactical",
  "Reflective & deep",
  "Time-boxed",
  "Async friendly",
  "Direct feedback welcome",
];

interface RelationalContextSectionProps {
  currentlyNavigating?: string | null;
  notLookingFor?: string[] | null;
  conversationStyle?: string[] | null;
  className?: string;
}

export function RelationalContextSection({
  currentlyNavigating,
  notLookingFor,
  conversationStyle,
  className,
}: RelationalContextSectionProps) {
  const hasContent = currentlyNavigating || 
    (notLookingFor && notLookingFor.length > 0) || 
    (conversationStyle && conversationStyle.length > 0);

  if (!hasContent) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Currently navigating */}
      {currentlyNavigating && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Navigation className="w-4 h-4 text-primary" />
              Currently navigating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {currentlyNavigating}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Not looking for */}
      {notLookingFor && notLookingFor.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <XCircle className="w-4 h-4 text-muted-foreground" />
              Not looking for
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {notLookingFor.map((item) => (
                <Badge key={item} variant="outline" className="text-muted-foreground">
                  {item}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Good conversations with me look like */}
      {conversationStyle && conversationStyle.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Good conversations with me look like
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {conversationStyle.map((style) => (
                <Badge key={style} variant="secondary">
                  {style}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { NOT_LOOKING_FOR_OPTIONS, CONVERSATION_STYLE_OPTIONS };
