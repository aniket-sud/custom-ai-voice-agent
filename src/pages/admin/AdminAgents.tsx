import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { LANGUAGES } from "@/lib/agent-options";

export default function AdminAgents() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: agents } = await supabase.from("agents").select("*").order("created_at", { ascending: false });
      const { data: profiles } = await supabase.from("profiles").select("user_id, email, full_name");
      const merged = (agents ?? []).map((a: any) => ({
        ...a,
        owner: profiles?.find((p: any) => p.user_id === a.user_id),
      }));
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  const langName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name ?? code;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-3xl font-bold">All Agents</h1>
        <p className="text-muted-foreground mt-1">Every agent across all customers.</p>
      </div>
      <Card className="bg-gradient-card border-border/60 overflow-hidden">
        {loading ? <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Owner</TableHead><TableHead>Language</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-sm">{a.owner?.full_name || a.owner?.email || "—"}</TableCell>
                  <TableCell>{langName(a.language)}</TableCell>
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
