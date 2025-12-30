import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MessageSquare, Bug, Lightbulb, Star, HelpCircle } from "lucide-react";
import { format } from "date-fns";

interface Feedback {
  id: string;
  user_id: string;
  feedback_type: string;
  message: string;
  page_url: string | null;
  created_at: string;
  profile?: { full_name: string | null };
}

const feedbackTypeConfig = {
  bug: { icon: Bug, color: "text-red-500", bg: "bg-red-500/10", label: "Bug Report" },
  feature: { icon: Lightbulb, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Feature Request" },
  praise: { icon: Star, color: "text-green-500", bg: "bg-green-500/10", label: "Praise" },
  general: { icon: HelpCircle, color: "text-blue-500", bg: "bg-blue-500/10", label: "General" },
};

export function AdminFeedback() {
  const { data: feedback, isLoading } = useQuery({
    queryKey: ["admin-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get user profiles
      const userIds = [...new Set(data.map((f) => f.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      return data.map((f) => ({
        ...f,
        profile: profiles?.find((p) => p.user_id === f.user_id),
      })) as Feedback[];
    },
  });

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading feedback..." />;
  }

  const groupedByType = feedback?.reduce((acc, f) => {
    acc[f.feedback_type] = (acc[f.feedback_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Member Feedback
          </CardTitle>
          <CardDescription>
            Feedback and suggestions from community members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary" className="px-3 py-1">
              {feedback?.length || 0} total
            </Badge>
            {Object.entries(groupedByType || {}).map(([type, count]) => {
              const config = feedbackTypeConfig[type as keyof typeof feedbackTypeConfig];
              const Icon = config?.icon || HelpCircle;
              return (
                <Badge key={type} variant="outline" className={`px-3 py-1 ${config?.color || ""}`}>
                  <Icon className="w-3 h-3 mr-1" />
                  {count} {config?.label || type}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {feedback?.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No feedback submitted yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedback?.map((item) => {
            const config = feedbackTypeConfig[item.feedback_type as keyof typeof feedbackTypeConfig];
            const Icon = config?.icon || HelpCircle;

            return (
              <Card key={item.id} className="animate-scale-in">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${config?.bg || "bg-muted"}`}>
                      <Icon className={`w-5 h-5 ${config?.color || "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {item.profile?.full_name || "Anonymous"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {config?.label || item.feedback_type}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{item.message}</p>
                      {item.page_url && (
                        <p className="text-xs text-muted-foreground">
                          Page: {item.page_url}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
