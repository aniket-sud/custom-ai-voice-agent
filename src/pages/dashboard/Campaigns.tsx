import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Megaphone, Plus, Loader2, Play, Pause, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Campaigns() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("campaigns").select("*, agents(name)").eq("user_id", user.id).order("created_at", { ascending: false });
    setRows(data || []); setLoading(false);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("campaigns").on("postgres_changes",
      { event: "*", schema: "public", table: "campaigns", filter: `user_id=eq.${user?.id}` },
      () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const start = async (id: string) => {
    await supabase.from("campaigns").update({ status: "queued" }).eq("id", id);
    await supabase.functions.invoke("campaign-runner", { body: { campaign_id: id } });
    toast.success("Campaign started");
  };
  const pause = async (id: string) => { await supabase.from("campaigns").update({ status: "paused" }).eq("id", id); toast.success("Paused"); };

  const statusColor = (s: string) => ({
    draft: "bg-muted text-muted-foreground", queued: "bg-warning text-warning-foreground",
    running: "bg-accent text-accent-foreground", paused: "bg-muted text-muted-foreground",
    completed: "bg-success text-success-foreground", failed: "bg-destructive text-destructive-foreground",
  } as any)[s] || "";

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Bulk outbound calling campaigns powered by your AI agents.</p>
        </div>
        <Button variant="hero" asChild><Link to="/dashboard/campaigns/new"><Plus className="h-4 w-4" /> New campaign</Link></Button>
      </div>

      <Card className="bg-gradient-card border-border/60 overflow-hidden">
        {loading ? <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          rows.length === 0 ? (
            <div className="p-12 text-center">
              <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No campaigns yet</p>
              <p className="text-sm text-muted-foreground">Upload a CSV of contacts and let your agent call them all.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead>Agent</TableHead><TableHead>Progress</TableHead><TableHead>Status</TableHead><TableHead>Schedule</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((c) => {
                  const pct = c.total_contacts > 0 ? Math.round((c.completed_contacts / c.total_contacts) * 100) : 0;
                  return (
                    <TableRow key={c.id} className="hover:bg-secondary/40">
                      <TableCell><Link to={`/dashboard/campaigns/${c.id}`} className="font-medium hover:text-primary">{c.name}</Link></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.agents?.name || "—"}</TableCell>
                      <TableCell className="w-48"><div className="space-y-1"><Progress value={pct} className="h-2" /><p className="text-xs text-muted-foreground">{c.completed_contacts}/{c.total_contacts} · {c.failed_contacts} failed</p></div></TableCell>
                      <TableCell><Badge className={statusColor(c.status)}>{c.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.scheduled_at ? <><Calendar className="h-3 w-3 inline mr-1" />{format(new Date(c.scheduled_at), "MMM d, HH:mm")}</> : "Manual"}</TableCell>
                      <TableCell>
                        {(c.status === "draft" || c.status === "paused") && <Button size="sm" variant="ghost" onClick={() => start(c.id)}><Play className="h-3 w-3" /></Button>}
                        {c.status === "running" && <Button size="sm" variant="ghost" onClick={() => pause(c.id)}><Pause className="h-3 w-3" /></Button>}
                      </TableCell>
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
