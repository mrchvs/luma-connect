import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, StickyNote } from "lucide-react";
import { toast } from "sonner";

interface ConnectionNotesProps {
  connectionId: string;
}

export function ConnectionNotes({ connectionId }: ConnectionNotesProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: note, isLoading } = useQuery({
    queryKey: ["connection-note", connectionId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("connection_notes")
        .select("*")
        .eq("intro_request_id", connectionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!connectionId,
  });

  useEffect(() => {
    if (note?.content !== undefined) {
      setContent(note.content || "");
      // Auto-expand if there's existing content
      if (note.content && note.content.trim()) {
        setIsExpanded(true);
      }
    }
  }, [note]);

  const saveMutation = useMutation({
    mutationFn: async (newContent: string) => {
      if (!user) throw new Error("Not authenticated");

      // Try to upsert
      const { error } = await supabase
        .from("connection_notes")
        .upsert(
          {
            intro_request_id: connectionId,
            user_id: user.id,
            content: newContent,
          },
          {
            onConflict: "intro_request_id,user_id",
          }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connection-note", connectionId] });
      setHasChanges(false);
    },
    onError: (error: any) => {
      console.error("Failed to save note:", error);
      toast.error("Failed to save note");
    },
  });

  const handleBlur = () => {
    if (hasChanges) {
      saveMutation.mutate(content);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setHasChanges(true);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const hasContent = content && content.trim();

  return (
    <div className="border border-border/50 rounded-lg bg-muted/10">
      <Button
        variant="ghost"
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between p-4 h-auto text-left"
      >
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            Notes (Private)
          </span>
          {hasContent && !isExpanded && (
            <span className="text-xs text-muted-foreground/60">
              · {content.slice(0, 30)}{content.length > 30 ? "..." : ""}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </Button>

      {isExpanded && (
        <div className="px-4 pb-4">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Private notes for this connection. Only you can see this."
            className="min-h-[100px] resize-none border-border/30 bg-background/50 focus:bg-background"
            disabled={isLoading || saveMutation.isPending}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {saveMutation.isPending ? "Saving..." : hasChanges ? "Unsaved changes" : "Auto-saves when you click away"}
          </p>
        </div>
      )}
    </div>
  );
}