import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface AskFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AskForm({ onSuccess, onCancel }: AskFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      toast.success("Your ask has been posted!");
      onSuccess();
    } catch (error) {
      console.error("Error creating ask:", error);
      toast.error("Failed to post your ask. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
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
        <Label>Related topics (optional)</Label>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md bg-muted/30">
          {tags?.map(tag => (
            <Badge
              key={tag.id}
              variant={selectedTags.includes(tag.id) ? "default" : "outline"}
              className="cursor-pointer transition-colors"
              onClick={() => toggleTag(tag.id)}
            >
              {tag.label}
              {selectedTags.includes(tag.id) && (
                <X className="w-3 h-3 ml-1" />
              )}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!body.trim() || isSubmitting}>
          {isSubmitting ? "Posting..." : "Post Ask"}
        </Button>
      </div>
    </form>
  );
}
