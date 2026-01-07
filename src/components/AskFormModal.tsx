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
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface AskFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AskFormModal({ open, onOpenChange, onSuccess }: AskFormModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTopicError, setShowTopicError] = useState(false);

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
      // Create the request
      const { data: request, error: requestError } = await supabase
        .from("requests")
        .insert({
          created_by: user.id,
          title: title.trim() || null,
          body: body.trim(),
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
      setShowTopicError(false);
      
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
      setShowTopicError(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Ask the Community</DialogTitle>
          <DialogDescription>
            Share what you need help with. Our community is here to support you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              placeholder="Give your ask a short title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">What do you need help with? *</Label>
            <Textarea
              id="body"
              placeholder="Describe what you're looking for, the context, and how someone could help..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              required
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">{body.length}/2000</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className={showTopicError ? "text-destructive" : ""}>
                Topic * <span className="font-normal text-muted-foreground">(select 1-3)</span>
              </Label>
              <span className="text-xs text-muted-foreground">{selectedTags.length}/3</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose the topic that best describes your ask
            </p>
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
