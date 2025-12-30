import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Lock, Unlock, AlertTriangle, Clock, Shield, Settings, History, Save } from "lucide-react";
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

interface SecuritySetting {
  id: string;
  setting_key: string;
  setting_value: number;
  description: string;
}

interface AuditLog {
  id: string;
  admin_user_id: string;
  admin_email: string;
  action_type: string;
  target_identifier: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export function AdminLockedAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [securityTab, setSecurityTab] = useState<"accounts" | "settings" | "audit">("accounts");
  const [lockoutDuration, setLockoutDuration] = useState<number>(15);
  const [maxAttempts, setMaxAttempts] = useState<number>(5);

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
    refetchInterval: 30000,
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery<{ settings: Record<string, SecuritySetting> }>({
    queryKey: ["admin-security-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-account-management", {
        body: { action: "get_settings" },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      // Update local state with fetched values
      if (data.settings?.lockout_duration_minutes) {
        setLockoutDuration(data.settings.lockout_duration_minutes.setting_value);
      }
      if (data.settings?.max_login_attempts) {
        setMaxAttempts(data.settings.max_login_attempts.setting_value);
      }
      
      return data;
    },
  });

  const { data: auditData, isLoading: auditLoading } = useQuery<{ auditLogs: AuditLog[] }>({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-account-management", {
        body: { action: "get_audit_logs" },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    enabled: securityTab === "audit",
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
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      toast({
        title: "Account Unlocked",
        description: `${email} has been unlocked and notified via email.`,
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

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: { lockout_duration_minutes?: number; max_login_attempts?: number }) => {
      const { data, error } = await supabase.functions.invoke("admin-account-management", {
        body: { action: "update_settings", settings },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-security-settings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      toast({
        title: "Settings Updated",
        description: "Security settings have been saved successfully.",
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

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      lockout_duration_minutes: lockoutDuration,
      max_login_attempts: maxAttempts,
    });
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'account_unlocked':
        return 'Account Unlocked';
      case 'security_settings_updated':
        return 'Settings Updated';
      default:
        return actionType;
    }
  };

  const getActionBadgeVariant = (actionType: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (actionType) {
      case 'account_unlocked':
        return 'default';
      case 'security_settings_updated':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading && securityTab === "accounts") {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading account data..." />
      </div>
    );
  }

  if (error && securityTab === "accounts") {
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
      <Tabs value={securityTab} onValueChange={(v) => setSecurityTab(v as "accounts" | "settings" | "audit")}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-6">
          {/* Locked Accounts Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-destructive" />
                <CardTitle>Locked Accounts</CardTitle>
              </div>
              <CardDescription>
                Accounts currently locked due to failed login attempts.
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
                Accounts with multiple failed login attempts that may be locked soon.
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
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                <CardTitle>Lockout Settings</CardTitle>
              </div>
              <CardDescription>
                Configure account lockout behavior for brute-force protection.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" text="Loading settings..." />
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="max-attempts">Maximum Login Attempts</Label>
                      <Input
                        id="max-attempts"
                        type="number"
                        min={3}
                        max={10}
                        value={maxAttempts}
                        onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 5)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Number of failed attempts before locking the account (3-10)
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lockout-duration">Lockout Duration (minutes)</Label>
                      <Input
                        id="lockout-duration"
                        type="number"
                        min={5}
                        max={60}
                        value={lockoutDuration}
                        onChange={(e) => setLockoutDuration(parseInt(e.target.value) || 15)}
                      />
                      <p className="text-xs text-muted-foreground">
                        How long an account stays locked after max attempts (5-60 minutes)
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveSettings}
                      disabled={updateSettingsMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Settings
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="w-5 h-5" />
                <CardTitle>Security Audit Log</CardTitle>
              </div>
              <CardDescription>
                Track admin actions related to account security.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" text="Loading audit logs..." />
                </div>
              ) : auditData?.auditLogs?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No audit logs yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {auditData?.auditLogs?.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={getActionBadgeVariant(log.action_type)}>
                              {getActionLabel(log.action_type)}
                            </Badge>
                            {log.target_identifier && (
                              <span className="text-sm font-medium">{log.target_identifier}</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            By: {log.admin_email}
                          </p>
                          {log.details && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {JSON.stringify(log.details)}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), "PPp")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
