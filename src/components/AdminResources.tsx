import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Star, Video } from "lucide-react";

const CATEGORIES = ["Getting started", "Monday Momentum", "Community", "Members"];

interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: string;
  duration: string | null;
  loom_id: string | null;
  sort_order: number;
  is_featured: boolean;
  created_at: string;
}

const empty = {
  title: "",
  description: "",
  category: "Getting started",
  duration: "",
  loom_id: "",
  is_featured: false,
  sort_order: 0,
};

export function AdminResources() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);

  const { data: resources, isLoading } = useQuery({
    queryKey: ["admin-resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Resource[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (values: typeof empty) => {
      const { error } = await supabase.from("resources").insert({
        title: values.title,
        description: values.description || null,
        category: values.category,
        duration: values.duration || null,
        loom_id: values.loom_id || null,
        is_featured: values.is_featured,
        sort_order: values.sort_order,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-resources"] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      setForm(empty);
      setShowForm(false);
      toast({ title: "Resource added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("resources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-resources"] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast({ title: "Resource deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const { error } = await supabase.from("resources").update({ is_featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-resources"] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Resources</h2>
          <p className="text-sm text-muted-foreground">Manage videos shown on the Resources page.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add resource
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="border rounded-xl p-5 space-y-4 bg-muted/30">
          <h3 className="font-medium">New resource</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="How to set your goal for the month" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="A short description shown on the card..." rows={2} />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Duration</Label>
              <Input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="5 min" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Loom video ID</Label>
              <Input value={form.loom_id} onChange={e => setForm(f => ({ ...f, loom_id: e.target.value }))} placeholder="44ba54c3cde446c9bd88b535e5893e7e" />
              <p className="text-xs text-muted-foreground">The ID at the end of your Loom share URL: loom.com/share/<strong>this-part</strong></p>
            </div>
            <div className="space-y-1">
              <Label>Sort order</Label>
              <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} placeholder="0" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="is_featured"
                checked={form.is_featured}
                onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="is_featured">Featured (shown prominently at top)</Label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => addMutation.mutate(form)}
              disabled={!form.title || addMutation.isPending}
            >
              {addMutation.isPending ? "Saving..." : "Save resource"}
            </Button>
            <Button variant="ghost" onClick={() => { setShowForm(false); setForm(empty); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Resource list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : resources?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No resources yet.</p>
      ) : (
        <div className="space-y-3">
          {resources?.map(r => (
            <div key={r.id} className="border rounded-xl p-4 flex items-start gap-4 bg-white">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Video className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{r.title}</span>
                  {r.is_featured && <Badge variant="secondary" className="text-xs"><Star className="w-3 h-3 mr-1" />Featured</Badge>}
                  <Badge variant="outline" className="text-xs">{r.category}</Badge>
                  {r.duration && <span className="text-xs text-muted-foreground">{r.duration}</span>}
                </div>
                {r.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                {r.loom_id && (
                  <a href={`https://www.loom.com/share/${r.loom_id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                    loom.com/share/{r.loom_id}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFeatured.mutate({ id: r.id, is_featured: !r.is_featured })}
                  title={r.is_featured ? "Unfeature" : "Feature"}
                >
                  <Star className={`w-4 h-4 ${r.is_featured ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(r.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
