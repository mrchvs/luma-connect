import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { ThumbsUp, ThumbsDown, Sparkles, RefreshCw, User } from "lucide-react";
import { format } from "date-fns";

interface MatchReview {
  id: string;
  user_id: string;
  matched_user_id: string;
  overlapping_tags: string[];
  score: number;
  is_accurate: boolean | null;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  user_profile?: { full_name: string | null };
  matched_profile?: { full_name: string | null };
}

interface ApprovedProfile {
  user_id: string;
  full_name: string | null;
}

export function AdminMatchReview() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  // Fetch approved profiles
  const { data: approvedProfiles, isLoading: profilesLoading } = useQuery({
    queryKey: ["approved-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("status", "approved")
        .eq("completed", true)
        .order("full_name");

      if (error) throw error;
      return data as ApprovedProfile[];
    },
  });

  // Fetch matches for selected user
  const { data: matches, isLoading: matchesLoading, refetch: refetchMatches } = useQuery({
    queryKey: ["user-matches", selectedUser],
    queryFn: async () => {
      if (!selectedUser) return [];

      // Get computed matches
      const { data: matchData, error: matchError } = await supabase.rpc("compute_matches", {
        p_user_id: selectedUser,
      });

      if (matchError) throw matchError;
      if (!matchData || matchData.length === 0) return [];

      // Get existing reviews
      const { data: reviews } = await supabase
        .from("match_reviews")
        .select("*")
        .eq("user_id", selectedUser);

      // Get profile names
      const matchedUserIds = matchData.map((m: any) => m.matched_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", [...matchedUserIds, selectedUser]);

      const userProfile = profiles?.find((p) => p.user_id === selectedUser);

      // Combine data
      return matchData.map((match: any) => {
        const existingReview = reviews?.find(
          (r) => r.matched_user_id === match.matched_user_id
        );
        const matchedProfile = profiles?.find((p) => p.user_id === match.matched_user_id);

        return {
          id: existingReview?.id || `temp-${match.matched_user_id}`,
          user_id: selectedUser,
          matched_user_id: match.matched_user_id,
          overlapping_tags: match.overlapping_tags || [],
          score: match.score,
          is_accurate: existingReview?.is_accurate ?? null,
          review_notes: existingReview?.review_notes || null,
          reviewed_by: existingReview?.reviewed_by || null,
          reviewed_at: existingReview?.reviewed_at || null,
          created_at: existingReview?.created_at || new Date().toISOString(),
          user_profile: userProfile,
          matched_profile: matchedProfile,
        } as MatchReview;
      });
    },
    enabled: !!selectedUser,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      matchReview,
      isAccurate,
      notes,
    }: {
      matchReview: MatchReview;
      isAccurate: boolean;
      notes: string;
    }) => {
      const { error } = await supabase.from("match_reviews").upsert(
        {
          user_id: matchReview.user_id,
          matched_user_id: matchReview.matched_user_id,
          overlapping_tags: matchReview.overlapping_tags,
          score: matchReview.score,
          is_accurate: isAccurate,
          review_notes: notes || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,matched_user_id" }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-matches", selectedUser] });
      toast({ title: "Review saved" });
    },
    onError: (error: any) => {
      toast({ title: "Error saving review", description: error.message, variant: "destructive" });
    },
  });

  const handleReview = (matchReview: MatchReview, isAccurate: boolean) => {
    reviewMutation.mutate({
      matchReview,
      isAccurate,
      notes: reviewNotes[matchReview.matched_user_id] || matchReview.review_notes || "",
    });
  };

  if (profilesLoading) {
    return <LoadingSpinner size="lg" text="Loading profiles..." />;
  }

  const totalReviewed = matches?.filter((m) => m.is_accurate !== null).length || 0;
  const accurateCount = matches?.filter((m) => m.is_accurate === true).length || 0;
  const inaccurateCount = matches?.filter((m) => m.is_accurate === false).length || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Match Algorithm Review
          </CardTitle>
          <CardDescription>
            Review computed matches to evaluate algorithm accuracy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user to view their matches" />
                </SelectTrigger>
                <SelectContent>
                  {approvedProfiles?.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.full_name || "Unnamed User"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedUser && (
              <Button variant="outline" onClick={() => refetchMatches()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>

          {selectedUser && matches && matches.length > 0 && (
            <div className="flex gap-4">
              <Badge variant="secondary" className="px-3 py-1">
                {matches.length} matches
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                {totalReviewed} reviewed
              </Badge>
              {accurateCount > 0 && (
                <Badge className="bg-green-500/10 text-green-600 px-3 py-1">
                  <ThumbsUp className="w-3 h-3 mr-1" />
                  {accurateCount} accurate
                </Badge>
              )}
              {inaccurateCount > 0 && (
                <Badge className="bg-red-500/10 text-red-600 px-3 py-1">
                  <ThumbsDown className="w-3 h-3 mr-1" />
                  {inaccurateCount} inaccurate
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {matchesLoading && <LoadingSpinner size="lg" text="Computing matches..." />}

      {selectedUser && !matchesLoading && matches?.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No matches found for this user</p>
          </CardContent>
        </Card>
      )}

      {matches?.map((match) => (
        <Card key={match.matched_user_id} className="animate-scale-in">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">
                  {match.user_profile?.full_name || "User"} → {match.matched_profile?.full_name || "Match"}
                </CardTitle>
                <CardDescription>
                  Score: {match.score} | {match.overlapping_tags.length} overlapping tags
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {match.is_accurate === true && (
                  <Badge className="bg-green-500/10 text-green-600">
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    Accurate
                  </Badge>
                )}
                {match.is_accurate === false && (
                  <Badge className="bg-red-500/10 text-red-600">
                    <ThumbsDown className="w-3 h-3 mr-1" />
                    Inaccurate
                  </Badge>
                )}
                {match.is_accurate === null && (
                  <Badge variant="outline">Not reviewed</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Overlapping Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {match.overlapping_tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Textarea
                placeholder="Add review notes (optional)..."
                value={reviewNotes[match.matched_user_id] ?? match.review_notes ?? ""}
                onChange={(e) =>
                  setReviewNotes((prev) => ({
                    ...prev,
                    [match.matched_user_id]: e.target.value,
                  }))
                }
                className="min-h-[60px]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2">
                <Button
                  variant={match.is_accurate === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleReview(match, true)}
                  disabled={reviewMutation.isPending}
                >
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  Accurate
                </Button>
                <Button
                  variant={match.is_accurate === false ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => handleReview(match, false)}
                  disabled={reviewMutation.isPending}
                >
                  <ThumbsDown className="w-4 h-4 mr-1" />
                  Inaccurate
                </Button>
              </div>
              {match.reviewed_at && (
                <p className="text-xs text-muted-foreground">
                  Reviewed {format(new Date(match.reviewed_at), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
