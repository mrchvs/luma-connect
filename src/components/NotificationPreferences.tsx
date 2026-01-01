import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, MessageSquare, Calendar } from "lucide-react";
import { toast } from "sonner";

interface NotificationSettings {
  push_enabled: boolean;
  push_intro: boolean;
  push_scheduling: boolean;
  email_intro: boolean;
  email_scheduling: boolean;
}

export function NotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["notification-settings", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Return defaults if no settings exist
      if (!data) {
        return {
          push_enabled: false,
          push_intro: true,
          push_scheduling: true,
          email_intro: true,
          email_scheduling: true,
        };
      }

      return data as NotificationSettings;
    },
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async (newSettings: Partial<NotificationSettings>) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("notification_settings")
        .upsert({
          user_id: user.id,
          ...settings,
          ...newSettings,
        }, { onConflict: "user_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast.success("Preferences updated");
    },
    onError: () => {
      toast.error("Failed to update preferences");
    },
  });

  const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
    updateMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading preferences...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="font-display text-lg">Notification Preferences</CardTitle>
            <CardDescription>Choose how you want to be notified</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Mail className="w-4 h-4 text-muted-foreground" />
            Email Notifications
          </div>
          
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email_intro" className="text-sm">Intro Requests</Label>
                <p className="text-xs text-muted-foreground">
                  When someone sends or responds to an intro request
                </p>
              </div>
              <Switch
                id="email_intro"
                checked={settings?.email_intro ?? true}
                onCheckedChange={(checked) => handleToggle("email_intro", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email_scheduling" className="text-sm">Scheduling</Label>
                <p className="text-xs text-muted-foreground">
                  Time slot proposals and confirmations
                </p>
              </div>
              <Switch
                id="email_scheduling"
                checked={settings?.email_scheduling ?? true}
                onCheckedChange={(checked) => handleToggle("email_scheduling", checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Push Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bell className="w-4 h-4 text-muted-foreground" />
              Push Notifications
            </div>
            <Switch
              checked={settings?.push_enabled ?? false}
              onCheckedChange={(checked) => handleToggle("push_enabled", checked)}
            />
          </div>
          
          {settings?.push_enabled && (
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push_intro" className="text-sm flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" />
                    Intro Requests
                  </Label>
                </div>
                <Switch
                  id="push_intro"
                  checked={settings?.push_intro ?? true}
                  onCheckedChange={(checked) => handleToggle("push_intro", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push_scheduling" className="text-sm flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    Scheduling
                  </Label>
                </div>
                <Switch
                  id="push_scheduling"
                  checked={settings?.push_scheduling ?? true}
                  onCheckedChange={(checked) => handleToggle("push_scheduling", checked)}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
