import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, PhoneCall, Eye } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminCalls() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [transcript, setTranscript] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: calls } = await supabase.from("calls").select("*, agents(name)").order("started_at", { ascending: false }).limit(500);
      const { data: profiles } = await supabase.from("profiles").select("user_id, email, full_name");
      const merged = (calls ?? []).map((c: any) => ({
        ...c, owner: profiles?.find((p: any) => p.user_id === c.user_id),
      }));
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  const openCall = async (c: any) => {
    setSelected(c);
    const { data } = await supabase.from("call_transcripts").select("*").eq("call_id", c.id).order("created_at");
    setTranscript(data || []);
  };

  const filtered = rows.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (query && !`${c.agents?.name ?? ""} ${c.owner?.email ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const totalSec = rows.reduce((a, c) => a + (c.duration_seconds || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="font-display text-4xl font-bold">All Calls</h1>
        <p className="text-muted-foreground mt-1">Last 500 calls across the platform.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-border/60 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><PhoneCall className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total calls</p><p className="font-display text-2xl font-bold">{rows.length}</p></div>
        </Card>
        <Card className="bg-gradient-card border-border/60 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><PhoneCall className="h-5 w-5 text-success" /></div>
          <div><p className="text-xs text-muted-foreground">Completed</p><p className="font-display text-2xl font-bold">{rows.filter((c) => c.status === "completed").length}</p></div>
        </Card>
        <Card className="bg-gradient-card border-border/60 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center"><PhoneCall className="h-5 w-5 text-accent" /></div>
          <div><p className="text-xs text-muted-foreground">Total minutes</p><p className="font-display text-2xl font-bold">{Math.round(totalSec / 60)}</p></div>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by agent or owner…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 p-1 bg-secondary rounded-lg">
          {["all", "completed", "in_progress", "failed"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-sm rounded-md capitalize transition-smooth ${statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >{s.replace("_", " ")}</button>
          ))}
        </div>
      </div>

      <Card className="bg-gradient-card border-border/60 overflow-hidden">
        {loading ? <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Owner</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Duration</TableHead><TableHead>Started</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="hover:bg-secondary/40 cursor-pointer" onClick={() => openCall(c)}>
                  <TableCell className="font-medium">{c.agents?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{c.owner?.full_name || c.owner?.email || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{c.direction}</Badge></TableCell>
                  <TableCell>
                    <Badge className={c.status === "completed" ? "bg-success text-success-foreground" : c.status === "failed" ? "bg-destructive" : "bg-warning text-warning-foreground"}>{c.status}</Badge>
                  </TableCell>
                  <TableCell>{c.duration_seconds}s</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(c.started_at), "MMM d, HH:mm")}</TableCell>
                  <TableCell><Button size="sm" variant="ghost"><Eye className="h-3 w-3" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call transcript — {selected?.agents?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <>
              <div className="grid grid-cols-3 gap-3 text-sm border-b border-border/60 pb-4">
                <div><p className="text-muted-foreground text-xs">Owner</p><p className="font-medium truncate">{selected.owner?.email}</p></div>
                <div><p className="text-muted-foreground text-xs">Duration</p><p className="font-medium">{selected.duration_seconds}s</p></div>
                <div><p className="text-muted-foreground text-xs">Date</p><p className="font-medium">{format(new Date(selected.started_at), "MMM d, HH:mm")}</p></div>
              </div>
              <div className="space-y-2 mt-4">
                {transcript.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transcript saved.</p>
                ) : transcript.map((t) => (
                  <div key={t.id} className={`flex ${t.role === "user" ? "justify-end" : ""}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${t.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                      {t.content}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
