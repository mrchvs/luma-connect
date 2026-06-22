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
import { WORKSHOPS, workshopTitle } from "@/lib/workshops";

interface Lead {
  id: string;
  workshop_slug: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
}

const slugToSource = (slug: string) => {
  const w = WORKSHOPS.find((x) => x.slug === slug);
  return w ? workshopTitle(w) : slug;
};

export function AdminLeads() {
  const { toast } = useToast();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["admin-leads"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("workshop_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const handleExport = () => {
    if (!leads || leads.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }
    const csv = [
      ["First Name", "Last Name", "Email", "Source", "Date"],
      ...leads.map((l) => [
        l.first_name,
        l.last_name,
        l.email,
        slugToSource(l.workshop_slug),
        format(new Date(l.created_at), "yyyy-MM-dd HH:mm"),
      ]),
    ]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Exported successfully" });
  };

  if (isLoading) return <LoadingSpinner size="lg" text="Loading leads..." />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Leads
              </CardTitle>
              <CardDescription>People who entered their email, and the resource they came from</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-lg px-4 py-1">
                <Users className="w-4 h-4 mr-2" />
                {leads?.length || 0} total
              </Badge>
              <Button onClick={handleExport} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!leads || leads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No leads yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.first_name} {l.last_name}</TableCell>
                    <TableCell>{l.email}</TableCell>
                    <TableCell><Badge variant="secondary">{slugToSource(l.workshop_slug)}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(l.created_at), "MMM d, yyyy 'at' h:mm a")}
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
