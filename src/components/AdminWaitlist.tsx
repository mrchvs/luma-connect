import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { Download, Users, Mail } from "lucide-react";
import { format } from "date-fns";

interface WaitlistEntry {
  id: string;
  email: string;
  user_id: string | null;
  created_at: string;
}

export function AdminWaitlist() {
  const { toast } = useToast();

  const { data: waitlist, isLoading } = useQuery({
    queryKey: ["admin-waitlist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matching_waitlist")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WaitlistEntry[];
    },
  });

  const handleExport = () => {
    if (!waitlist || waitlist.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const csv = [
      ["Email", "User ID", "Signed Up"],
      ...waitlist.map((entry) => [
        entry.email,
        entry.user_id || "Guest",
        format(new Date(entry.created_at), "yyyy-MM-dd HH:mm"),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `matching-waitlist-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({ title: "Exported successfully" });
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading waitlist..." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Smart Matching Waitlist
              </CardTitle>
              <CardDescription>
                Users who signed up for the matching feature
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-lg px-4 py-1">
                <Users className="w-4 h-4 mr-2" />
                {waitlist?.length || 0} subscribers
              </Badge>
              <Button onClick={handleExport} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {waitlist?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No waitlist subscribers yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Signed Up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlist?.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.email}</TableCell>
                    <TableCell>
                      {entry.user_id ? (
                        <Badge variant="default">Member</Badge>
                      ) : (
                        <Badge variant="secondary">Guest</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
