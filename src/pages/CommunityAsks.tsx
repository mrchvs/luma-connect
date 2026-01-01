import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { MainNav } from "@/components/MainNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { AskCard } from "@/components/AskCard";
import { AskForm } from "@/components/AskForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function CommunityAsks() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved">("open");

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ["community-asks", statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select(`
          *,
          request_tags(tag_id, tags(id, label))
        `)
        .eq("status", statusFilter)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
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

      <main className="container py-8 px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 animate-slide-up">
          <div>
            <h1 className="font-display text-3xl font-semibold mb-2">Community Asks</h1>
            <p className="text-muted-foreground">
              Share what you need help with or offer support to others
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Post an Ask
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8 animate-scale-in">
            <CardContent className="pt-6">
              <AskForm 
                onSuccess={() => {
                  setShowForm(false);
                  refetch();
                }}
                onCancel={() => setShowForm(false)}
              />
            </CardContent>
          </Card>
        )}

        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as "open" | "resolved")} className="animate-slide-up">
          <TabsList className="mb-6">
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter}>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : requests && requests.length > 0 ? (
              <div className="grid gap-4">
                {requests.map((request, index) => (
                  <AskCard
                    key={request.id}
                    request={request}
                    profile={profiles?.[request.created_by]}
                    isOwner={request.created_by === user.id}
                    onStatusChange={refetch}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  />
                ))}
              </div>
            ) : (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-display text-lg font-medium mb-2">
                    No {statusFilter} asks yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {statusFilter === "open" 
                      ? "Be the first to post an ask!" 
                      : "Resolved asks will appear here."}
                  </p>
                  {statusFilter === "open" && (
                    <Button onClick={() => setShowForm(true)}>Post an Ask</Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
