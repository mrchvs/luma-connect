import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Topic {
  id: string;
  label: string;
}

interface TopicFilterProps {
  topics: Topic[];
  selectedTopics: string[];
  onToggle: (topicId: string) => void;
  onClear: () => void;
}

export function TopicFilter({ topics, selectedTopics, onToggle, onClear }: TopicFilterProps) {
  const hasSelection = selectedTopics.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Filter by topic</span>
        {hasSelection && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
          >
            Clear all
            <X className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>
      
      {/* Mobile: Horizontal scroll */}
      <ScrollArea className="w-full md:hidden">
        <div className="flex gap-2 pb-2">
          {topics.map((topic) => {
            const isSelected = selectedTopics.includes(topic.id);
            return (
              <Badge
                key={topic.id}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "cursor-pointer whitespace-nowrap transition-all shrink-0",
                  isSelected && "pr-1.5"
                )}
                onClick={() => onToggle(topic.id)}
              >
                {topic.label}
                {isSelected && <X className="w-3 h-3 ml-1" />}
              </Badge>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Desktop: Wrap */}
      <div className="hidden md:flex flex-wrap gap-2">
        {topics.map((topic) => {
          const isSelected = selectedTopics.includes(topic.id);
          return (
            <Badge
              key={topic.id}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all hover:scale-105",
                isSelected && "pr-1.5"
              )}
              onClick={() => onToggle(topic.id)}
            >
              {topic.label}
              {isSelected && <X className="w-3 h-3 ml-1" />}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
