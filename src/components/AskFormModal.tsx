import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { X, Lightbulb, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface AskFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const HELP_TYPES = [
  { id: "perspective", label: "Perspective / sense-check" },
  { id: "deciding", label: "Help deciding" },
  { id: "practical", label: "Practical steps" },
  { id: "experience", label: "Shared experience" },
] as const;

const EXAMPLE_PROMPTS = [
  "I feel stuck and can't tell what my next move should be.",
  "I'm between two options and want to sense-check my thinking.",
  "How would you approach this if you were in my position?",
  "I'd love perspective from someone who's been through something similar.",
];

export function AskFormModal({ open, onOpenChange, onSuccess }: AskFormModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedHelpType, setSelectedHelpType] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTopicError, setShowTopicError] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("label");
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !body.trim()) return;
    
    // Validate topic selection
    if (selectedTags.length === 0) {
      setShowTopicError(true);
      toast.error("Please select at least one topic");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the request - include help type in body if selected
      const bodyWithHelpType = selectedHelpType 
        ? `${body.trim()}\n\n---\n*Looking for: ${HELP_TYPES.find(h => h.id === selectedHelpType)?.label}*`
        : body.trim();

      const { data: request, error: requestError } = await supabase
        .from("requests")
        .insert({
          created_by: user.id,
          title: title.trim() || null,
          body: bodyWithHelpType,
          status: "open",
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Add tags if any selected
      if (selectedTags.length > 0) {
        const tagInserts = selectedTags.map(tagId => ({
          request_id: request.id,
          tag_id: tagId,
        }));

        const { error: tagsError } = await supabase
          .from("request_tags")
          .insert(tagInserts);

        if (tagsError) {
          console.error("Error adding tags:", tagsError);
        }
      }

      // Log activity
      await supabase.from("activity_events").insert({
        user_id: user.id,
        event_type: "request_created",
        entity_type: "request",
        entity_id: request.id,
      });

      // Notify mentors whose expertise matches the ask topics
      try {
        await supabase.functions.invoke("notify-mentors-ask", {
          body: {
            askId: request.id,
            tagIds: selectedTags,
          },
        });
      } catch (notifyError) {
        // Don't fail the ask creation if notification fails
        console.error("Error notifying mentors:", notifyError);
      }

      toast.success("Your ask has been posted!");
      
      // Reset form
      setTitle("");
      setBody("");
      setSelectedTags([]);
      setSelectedHelpType(null);
      setShowTopicError(false);
      setShowExamples(false);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["community-asks"] });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating ask:", error);
      toast.error("Failed to post your ask. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setShowTopicError(false);
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : prev.length < 3 ? [...prev, tagId] : prev
    );
  };

  const canSubmit = body.trim() && selectedTags.length > 0;

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset form on close
      setTitle("");
      setBody("");
      setSelectedTags([]);
      setSelectedHelpType(null);
      setShowTopicError(false);
      setShowExamples(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Ask the Community</DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="block">You don't need a perfectly formed question.</span>
            <span className="block text-foreground/70">Start with what feels unclear — the community will help you think it through.</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title - Optional */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-muted-foreground">
              Title <span className="text-xs">(optional)</span>
            </Label>
            <Input
              id="title"
              placeholder="A short summary — or leave this blank if you're not sure yet"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Main Question */}
          <div className="space-y-2">
            <Label htmlFor="body">What are you trying to figure out right now? *</Label>
            <Textarea
              id="body"
              placeholder="You can include what feels unclear, a decision you're facing, some context, and the kind of help you're hoping for."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              required
              maxLength={2000}
            />
            <div className="flex items-center justify-between">
              <Collapsible open={showExamples} onOpenChange={setShowExamples}>
                <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Need inspiration?</span>
                  {showExamples ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="space-y-1.5 pl-5 border-l-2 border-muted">
                    {EXAMPLE_PROMPTS.map((prompt, i) => (
                      <p key={i} className="text-xs text-muted-foreground italic">
                        "{prompt}"
                      </p>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
              <p className="text-xs text-muted-foreground">{body.length}/2000</p>
            </div>
          </div>

          {/* Topic Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className={showTopicError ? "text-destructive" : ""}>
                What is this mostly about? * <span className="font-normal text-muted-foreground text-xs">(up to 3)</span>
              </Label>
              <span className="text-xs text-muted-foreground">{selectedTags.length}/3</span>
            </div>
            <div className={`flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 border rounded-lg ${showTopicError ? "border-destructive bg-destructive/5" : "bg-muted/30"}`}>
              {tags?.map(tag => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                  className="cursor-pointer transition-all hover:scale-105"
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.label}
                  {selectedTags.includes(tag.id) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
            {showTopicError && (
              <p className="text-xs text-destructive">Please select at least one topic</p>
            )}
          </div>

          {/* Help Type - Optional */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              What kind of help would be most useful? <span className="text-xs">(optional)</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {HELP_TYPES.map(type => (
                <Badge
                  key={type.id}
                  variant={selectedHelpType === type.id ? "default" : "outline"}
                  className="cursor-pointer transition-all hover:scale-105"
                  onClick={() => setSelectedHelpType(
                    selectedHelpType === type.id ? null : type.id
                  )}
                >
                  {type.label}
                  {selectedHelpType === type.id && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Posting..." : "Post Ask"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
