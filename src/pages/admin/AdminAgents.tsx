import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Bot } from "lucide-react";
import { format } from "date-fns";
import { LANGUAGES } from "@/lib/agent-options";

export default function AdminAgents() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const { data: agents } = await supabase.from("agents").select("*").order("created_at", { ascending: false });
      const { data: profiles } = await supabase.from("profiles").select("user_id, email, full_name");
      const merged = (agents ?? []).map((a: any) => ({
        ...a, owner: profiles?.find((p: any) => p.user_id === a.user_id),
      }));
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  const langName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name ?? code;

  const filtered = rows.filter((a) =>
    !query || `${a.name} ${a.owner?.email ?? ""} ${a.owner?.full_name ?? ""}`.toLowerCase().includes(query.toLowerCase())
  );

  const active = rows.filter((a) => a.is_active).length;

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="font-display text-4xl font-bold">All Agents</h1>
        <p className="text-muted-foreground mt-1">Every agent across all customers.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-border/60 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Bot className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total agents</p><p className="font-display text-2xl font-bold">{rows.length}</p></div>
        </Card>
        <Card className="bg-gradient-card border-border/60 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><Bot className="h-5 w-5 text-success" /></div>
          <div><p className="text-xs text-muted-foreground">Active</p><p className="font-display text-2xl font-bold">{active}</p></div>
        </Card>
        <Card className="bg-gradient-card border-border/60 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center"><Bot className="h-5 w-5 text-accent" /></div>
          <div><p className="text-xs text-muted-foreground">Languages used</p><p className="font-display text-2xl font-bold">{new Set(rows.map((a) => a.language)).size}</p></div>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search agents or owners…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      <Card className="bg-gradient-card border-border/60 overflow-hidden">
        {loading ? <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Owner</TableHead><TableHead>Language</TableHead><TableHead>Model</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id} className="hover:bg-secondary/40">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center"><Bot className="h-4 w-4 text-primary-foreground" /></div>
                      <span className="font-medium">{a.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{a.owner?.full_name || a.owner?.email || "—"}</TableCell>
                  <TableCell>{langName(a.language)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.llm_model.split("/")[1]}</TableCell>
                  <TableCell>{a.is_active ? <Badge className="bg-success text-success-foreground">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(a.created_at), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
