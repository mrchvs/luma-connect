import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { MainNav } from "@/components/MainNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Mail, Send, CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function InviteMember() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (!loading && profile?.status !== "approved") {
      toast.error("You need to be approved to invite members");
      navigate("/dashboard");
    }
  }, [user, profile, loading, navigate]);

  // Fetch referral limit settings
  const { data: referralLimit } = useQuery({
    queryKey: ["referral-limit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_settings")
        .select("setting_value")
        .eq("setting_key", "referrals_per_member_per_month")
        .single();

      if (error) return 3; // Default limit
      return typeof data?.setting_value === "number" ? data.setting_value : 3;
    },
  });

  // Fetch user's referrals this month
  const { data: myReferrals, isLoading: referralsLoading } = useQuery({
    queryKey: ["my-referrals", user?.id],
    queryFn: async () => {
      if (!user) return { thisMonth: 0, all: [] };

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: thisMonthData, error: countError } = await supabase
        .from("invitations")
        .select("id")
        .eq("invited_by_user_id", user.id)
        .eq("source", "member")
        .gte("created_at", startOfMonth.toISOString());

      if (countError) throw countError;

      const { data: allReferrals, error: allError } = await supabase
        .from("invitations")
        .select("id, email, status, created_at, accepted_at")
        .eq("invited_by_user_id", user.id)
        .eq("source", "member")
        .order("created_at", { ascending: false })
        .limit(10);

      if (allError) throw allError;

      return {
        thisMonth: thisMonthData?.length || 0,
        all: allReferrals || [],
      };
    },
    enabled: !!user,
  });

  const sendReferralMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-invite-member", {
        body: {
          action: "member_referral",
          email: email.trim().toLowerCase(),
          note: note.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Referral sent successfully!");
      setEmail("");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["my-referrals"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send referral");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const limit = referralLimit || 3;
    if (myReferrals && myReferrals.thisMonth >= limit) {
      toast.error(`You've reached your monthly limit of ${limit} referrals`);
      return;
    }

    sendReferralMutation.mutate();
  };

  const remainingReferrals = (referralLimit || 3) - (myReferrals?.thisMonth || 0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-warning" />;
      case "expired":
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading || referralsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero">
      <MainNav />

      <main className="container py-8 px-4 max-w-2xl">
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center gap-3 mb-2">
            <UserPlus className="w-6 h-6 text-primary" />
            <h1 className="font-display text-3xl font-semibold">Invite a Founder</h1>
          </div>
          <p className="text-muted-foreground">
            Know someone who would benefit from our community? Invite them to join.
          </p>
        </div>

        <Card className="mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle className="font-display text-lg">Send Invitation</CardTitle>
            <CardDescription>
              Your referral will be reviewed by our team before an invitation is sent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="founder@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Why are you recommending them? (optional)</Label>
                <Textarea
                  id="note"
                  placeholder="Tell us a bit about this person and why they'd be a great fit..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Badge variant={remainingReferrals > 0 ? "secondary" : "destructive"}>
                    {remainingReferrals} of {referralLimit || 3} remaining this month
                  </Badge>
                </div>
                <Button 
                  type="submit" 
                  disabled={sendReferralMutation.isPending || remainingReferrals <= 0}
                  className="gap-2"
                >
                  {sendReferralMutation.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send Referral
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {myReferrals && myReferrals.all.length > 0 && (
          <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <CardHeader>
              <CardTitle className="font-display text-lg">Your Referrals</CardTitle>
              <CardDescription>Track the status of people you've invited</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myReferrals.all.map((referral) => (
                  <div 
                    key={referral.id} 
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(referral.status)}
                      <div>
                        <p className="font-medium text-sm">{referral.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Invited {formatDistanceToNow(new Date(referral.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={referral.status === "accepted" ? "default" : "secondary"}
                      className={referral.status === "accepted" ? "bg-green-600" : ""}
                    >
                      {referral.status === "accepted" ? "Joined" : referral.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
