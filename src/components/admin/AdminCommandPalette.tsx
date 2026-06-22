import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { Users, MessageCircle, Target } from "lucide-react";

export function AdminCommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["admin-command-data"],
    enabled: open,
    queryFn: async () => {
      const [members, asks, cohorts] = await Promise.all([
        supabase.from("profiles").select("id, full_name, job_title, city, status").eq("completed", true).order("created_at", { ascending: false }).limit(100),
        supabase.from("requests").select("id, title, status").order("created_at", { ascending: false }).limit(50),
        (supabase as any).from("accountability_cycles").select("id, name").order("created_at", { ascending: false }).limit(50),
      ]);
      return {
        members: (members.data ?? []) as { id: string; full_name: string | null; job_title: string | null; city: string | null; status: string }[],
        asks: (asks.data ?? []) as { id: string; title: string; status: string }[],
        cohorts: (cohorts.data ?? []) as { id: string; name: string }[],
      };
    },
  });

  const go = (path: string) => { onOpenChange(false); navigate(path); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search members, asks, cohorts…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {data?.members.length ? (
          <CommandGroup heading="Members">
            {data.members.map((m) => (
              <CommandItem
                key={m.id}
                value={`member ${m.full_name ?? ""} ${m.job_title ?? ""} ${m.city ?? ""}`}
                onSelect={() => go(`/admin/members?status=${m.status}&member=${m.id}`)}
              >
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{m.full_name || "Unnamed"}</span>
                {(m.job_title || m.city) && (
                  <span className="ml-2 text-xs text-muted-foreground">{[m.job_title, m.city].filter(Boolean).join(" · ")}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {data?.asks.length ? (
          <CommandGroup heading="Asks">
            {data.asks.map((a) => (
              <CommandItem key={a.id} value={`ask ${a.title}`} onSelect={() => go("/admin/asks")}>
                <MessageCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{a.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {data?.cohorts.length ? (
          <CommandGroup heading="Cohorts">
            {data.cohorts.map((c) => (
              <CommandItem key={c.id} value={`cohort ${c.name}`} onSelect={() => go(`/admin/momentum?cycle=${c.id}`)}>
                <Target className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{c.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
