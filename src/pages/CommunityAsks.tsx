import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { MainNav } from "@/components/MainNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { AskCard } from "@/components/AskCard";
import { AskFormModal } from "@/components/AskFormModal";
import { TopicFilter } from "@/components/TopicFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MessageCircle, ArrowUpDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTags } from "@/hooks/use-tags";

type SortOption = "recent" | "upvotes" | "comments";

export default function CommunityAsks() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [showFormModal, setShowFormModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved">("open");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  
  const { data: topics } = useTags();

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ["community-asks", statusFilter, sortBy, selectedTopics],
    queryFn: async () => {
      // Fetch requests
      const { data: requestsData, error } = await supabase
        .from("requests")
        .select(`
          *,
          request_tags(tag_id, tags(id, label))
        `)
        .eq("status", statusFilter)
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // Filter by selected topics if any
      let filteredRequests = requestsData;
      if (selectedTopics.length > 0) {
        filteredRequests = requestsData.filter(r => {
          const tagIds = r.request_tags?.map((rt: any) => rt.tag_id) || [];
          return selectedTopics.some(topicId => tagIds.includes(topicId));
        });
      }

      // Fetch upvote counts
      const requestIds = filteredRequests.map(r => r.id);
      if (requestIds.length === 0) return [];
      
      const { data: upvotes } = await supabase
        .from("request_upvotes")
        .select("request_id")
        .in("request_id", requestIds);

      const upvoteCounts: Record<string, number> = {};
      (upvotes || []).forEach((u) => {
        upvoteCounts[u.request_id] = (upvoteCounts[u.request_id] || 0) + 1;
      });

      // Fetch comment counts
      const { data: comments } = await supabase
        .from("request_comments")
        .select("request_id")
        .in("request_id", requestIds);

      const commentCounts: Record<string, number> = {};
      (comments || []).forEach((c) => {
        commentCounts[c.request_id] = (commentCounts[c.request_id] || 0) + 1;
      });

      // Add counts to requests
      const enrichedRequests = filteredRequests.map(r => ({
        ...r,
        upvote_count: upvoteCounts[r.id] || 0,
        comment_count: commentCounts[r.id] || 0,
      }));

      // Sort based on option
      if (sortBy === "upvotes") {
        enrichedRequests.sort((a, b) => b.upvote_count - a.upvote_count);
      } else if (sortBy === "comments") {
        enrichedRequests.sort((a, b) => b.comment_count - a.comment_count);
      }

      return enrichedRequests;
    },
    enabled: !!user && profile?.status === "approved",
  });

  const { data: profiles } = useQuery({
    queryKey: ["request-profiles", requests?.map(r => r.created_by)],
    queryFn: async () => {
      if (!requests || requests.length === 0) return {};
      const userIds = [...new Set(requests.map(r => r.created_by))];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, job_title, company_name")
        .in("user_id", userIds);
      
      if (error) throw error;
      return Object.fromEntries(data.map(p => [p.user_id, p]));
    },
    enabled: !!requests && requests.length > 0,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (profile?.status !== "approved") {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen gradient-hero">
      <MainNav />

      <main className="container py-8 px-4 max-w-3xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 animate-slide-up">
          <div>
            <h1 className="font-display text-3xl font-semibold mb-1">Community Asks</h1>
            <p className="text-muted-foreground text-sm">
              Share what you need help with or offer support to others
            </p>
          </div>
          <Button onClick={() => setShowFormModal(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New ask
          </Button>
        </div>

        {/* Topic Filter */}
        {topics && topics.length > 0 && (
          <Card className="mb-4 animate-slide-up">
            <CardContent className="py-4">
              <TopicFilter
                topics={topics}
                selectedTopics={selectedTopics}
                onToggle={(topicId) => {
                  setSelectedTopics(prev =>
                    prev.includes(topicId)
                      ? prev.filter(id => id !== topicId)
                      : [...prev, topicId]
                  );
                }}
                onClear={() => setSelectedTopics([])}
              />
            </CardContent>
          </Card>
        )}

        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as "open" | "resolved")} className="animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[140px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most recent</SelectItem>
                  <SelectItem value="upvotes">Most upvoted</SelectItem>
                  <SelectItem value="comments">Most answers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            {statusFilter === "open" 
              ? "Asks that are still looking for help"
              : "Asks that have already been addressed"}
          </p>

          <TabsContent value={statusFilter}>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : requests && requests.length > 0 ? (
              <div className="space-y-3">
                {requests.map((request, index) => (
                  <AskCard
                    key={request.id}
                    request={request}
                    profile={profiles?.[request.created_by]}
                    isOwner={request.created_by === user.id}
                    onOfferHelp={() => navigate(`/community-asks/${request.id}`)}
                    style={{ animationDelay: `${index * 0.03}s` }}
                  />
                ))}
              </div>
            ) : (
              <Card className="py-10">
                <CardContent className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                    <MessageCircle className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <h3 className="font-display text-lg font-medium mb-2">
                    {selectedTopics.length > 0 
                      ? "No asks in this topic yet"
                      : `No ${statusFilter} asks yet`}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {selectedTopics.length > 0 
                      ? "Be the first to start the conversation in this topic!"
                      : statusFilter === "open" 
                        ? "Be the first to post an ask!" 
                        : "Resolved asks will appear here."}
                  </p>
                  {(statusFilter === "open" || selectedTopics.length > 0) && (
                    <Button onClick={() => setShowFormModal(true)} size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Ask a question
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Ask Form Modal */}
      <AskFormModal 
        open={showFormModal} 
        onOpenChange={setShowFormModal}
        onSuccess={() => refetch()}
      />
    </div>
  );
}