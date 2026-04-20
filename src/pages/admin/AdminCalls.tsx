import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function AdminCalls() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: calls } = await supabase.from("calls").select("*, agents(name)").order("started_at", { ascending: false }).limit(200);
      const { data: profiles } = await supabase.from("profiles").select("user_id, email, full_name");
      const merged = (calls ?? []).map((c: any) => ({
        ...c, owner: profiles?.find((p: any) => p.user_id === c.user_id),
      }));
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-3xl font-bold">All Calls</h1>
        <p className="text-muted-foreground mt-1">Last 200 calls across the platform.</p>
      </div>
      <Card className="bg-gradient-card border-border/60 overflow-hidden">
        {loading ? <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Owner</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Duration</TableHead><TableHead>Started</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.agents?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{c.owner?.full_name || c.owner?.email || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{c.direction}</Badge></TableCell>
                  <TableCell>
                    <Badge className={c.status === "completed" ? "bg-success text-success-foreground" : c.status === "failed" ? "bg-destructive" : "bg-warning text-warning-foreground"}>{c.status}</Badge>
                  </TableCell>
                  <TableCell>{c.duration_seconds}s</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(c.started_at), "MMM d, HH:mm")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
