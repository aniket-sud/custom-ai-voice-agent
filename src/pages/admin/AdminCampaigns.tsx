import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

export default function AdminCampaigns() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from("campaigns").select("*, agents(name)").order("created_at", { ascending: false }),
        supabase.from("profiles").select("user_id, email, full_name"),
      ]);
      const merged = (c || []).map((row: any) => ({ ...row, owner: p?.find((x: any) => x.user_id === row.user_id) }));
      setRows(merged); setLoading(false);
    })();
  }, []);

  const total = rows.length;
  const running = rows.filter((r) => r.status === "running" || r.status === "queued").length;
  const completed = rows.filter((r) => r.status === "completed").length;

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="font-display text-4xl font-bold">All Campaigns</h1>
        <p className="text-muted-foreground mt-1">Every outbound campaign across all customers.</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-border/60 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Megaphone className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total</p><p className="font-display text-2xl font-bold">{total}</p></div>
        </Card>
        <Card className="bg-gradient-card border-border/60 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center"><Megaphone className="h-5 w-5 text-accent" /></div>
          <div><p className="text-xs text-muted-foreground">Active</p><p className="font-display text-2xl font-bold">{running}</p></div>
        </Card>
        <Card className="bg-gradient-card border-border/60 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><Megaphone className="h-5 w-5 text-success" /></div>
          <div><p className="text-xs text-muted-foreground">Completed</p><p className="font-display text-2xl font-bold">{completed}</p></div>
        </Card>
      </div>
      <Card className="bg-gradient-card border-border/60 overflow-hidden">
        {loading ? <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead>Owner</TableHead><TableHead>Agent</TableHead><TableHead>Progress</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((c) => {
                const pct = c.total_contacts ? Math.round((c.completed_contacts / c.total_contacts) * 100) : 0;
                return (
                  <TableRow key={c.id} className="hover:bg-secondary/40">
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm">{c.owner?.full_name || c.owner?.email || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.agents?.name}</TableCell>
                    <TableCell className="w-44"><Progress value={pct} className="h-2" /><p className="text-xs text-muted-foreground mt-1">{c.completed_contacts}/{c.total_contacts}</p></TableCell>
                    <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(c.created_at), "MMM d")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
