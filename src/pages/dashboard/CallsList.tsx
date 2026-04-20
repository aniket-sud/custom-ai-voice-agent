import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, PhoneCall } from "lucide-react";
import { format } from "date-fns";

export default function CallsList() {
  const { user } = useAuth();
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*, agents(name)")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(100);
      if (!error) setCalls(data || []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Calls</h1>
        <p className="text-muted-foreground mt-1">All test and production calls handled by your agents.</p>
      </div>

      <Card className="bg-gradient-card border-border/60 p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : calls.length === 0 ? (
          <div className="p-12 text-center">
            <PhoneCall className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No calls yet. Test an agent to see calls here.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Agent</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Duration</TableHead><TableHead>Started</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.agents?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{c.direction}</Badge></TableCell>
                  <TableCell>
                    <Badge className={c.status === "completed" ? "bg-success text-success-foreground" : c.status === "failed" ? "bg-destructive" : "bg-warning text-warning-foreground"}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.duration_seconds}s</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{format(new Date(c.started_at), "MMM d, HH:mm")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
