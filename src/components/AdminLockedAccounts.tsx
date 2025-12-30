import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Lock, Unlock, AlertTriangle, Clock, Shield } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface LoginAttempt {
  id: string;
  email: string;
  attempt_count: number;
  first_attempt_at: string;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

interface AccountData {
  lockedAccounts: LoginAttempt[];
  atRiskAccounts: LoginAttempt[];
}

export function AdminLockedAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<AccountData>({
    queryKey: ["admin-locked-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-account-management", {
        body: { action: "list_locked" },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unlockMutation = useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke("admin-account-management", {
        body: { action: "unlock_account", email },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, email) => {
      queryClient.invalidateQueries({ queryKey: ["admin-locked-accounts"] });
      toast({
        title: "Account Unlocked",
        description: `${email} has been unlocked and can now log in.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading account data..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive/20">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">Failed to load account data</p>
          <p className="text-sm text-muted-foreground mt-2">{(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  const { lockedAccounts = [], atRiskAccounts = [] } = data || {};

  return (
    <div className="space-y-6">
      {/* Locked Accounts Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-destructive" />
            <CardTitle>Locked Accounts</CardTitle>
          </div>
          <CardDescription>
            Accounts currently locked due to failed login attempts. These users cannot log in until the lockout expires or an admin unlocks them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lockedAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No accounts are currently locked</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lockedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-destructive/5 border-destructive/20"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{account.email}</span>
                      <Badge variant="destructive" className="text-xs">
                        Locked
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {account.attempt_count} failed attempts
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Unlocks {account.locked_until && formatDistanceToNow(new Date(account.locked_until), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Locked until: {account.locked_until && format(new Date(account.locked_until), "PPp")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unlockMutation.mutate(account.email)}
                    disabled={unlockMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    Unlock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* At-Risk Accounts Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <CardTitle>At-Risk Accounts</CardTitle>
          </div>
          <CardDescription>
            Accounts with multiple failed login attempts that may be locked soon. Consider reaching out to these users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {atRiskAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No accounts are at risk</p>
            </div>
          ) : (
            <div className="space-y-3">
              {atRiskAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-warning/5 border-warning/20"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{account.email}</span>
                      <Badge variant="secondary" className="text-xs bg-warning/20 text-warning-foreground">
                        {account.attempt_count}/5 attempts
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        First attempt: {formatDistanceToNow(new Date(account.first_attempt_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unlockMutation.mutate(account.email)}
                    disabled={unlockMutation.isPending}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Unlock className="w-4 h-4" />
                    Clear
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
