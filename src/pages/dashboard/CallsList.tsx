import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, PhoneCall, Search, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function CallsList() {
  const { user } = useAuth();
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<any>(null);
  const [transcript, setTranscript] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("calls").select("*, agents(name)").eq("user_id", user.id)
        .order("started_at", { ascending: false }).limit(200);
      if (!error) setCalls(data || []);
      setLoading(false);
    })();
  }, [user]);

  const openCall = async (c: any) => {
    setSelected(c);
    const { data } = await supabase.from("call_transcripts").select("*").eq("call_id", c.id).order("created_at");
    setTranscript(data || []);
  };

  const exportCsv = () => {
    if (!filtered.length) return toast.error("No calls to export");
    const headers = ["Agent", "Type", "Status", "Duration (s)", "Started", "Summary"];
    const rows = filtered.map((c) => [
      c.agents?.name ?? "—", c.direction, c.status, c.duration_seconds,
      format(new Date(c.started_at), "yyyy-MM-dd HH:mm"), (c.summary ?? "").replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `calls-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Exported CSV");
  };

  const filtered = calls.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (query && !`${c.agents?.name ?? ""} ${c.summary ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Calls</h1>
          <p className="text-muted-foreground mt-1">All test and production calls handled by your agents.</p>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      {calls.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search agent or summary…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1 p-1 bg-secondary rounded-lg">
            {["all", "completed", "in_progress", "failed"].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-sm rounded-md capitalize transition-smooth ${statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >{s.replace("_", " ")}</button>
            ))}
          </div>
        </div>
      )}

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
              <TableRow><TableHead>Agent</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Duration</TableHead><TableHead>Started</TableHead><TableHead></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c: any) => (
                <TableRow key={c.id} className="hover:bg-secondary/40 cursor-pointer" onClick={() => openCall(c)}>
                  <TableCell className="font-medium">{c.agents?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{c.direction}</Badge></TableCell>
                  <TableCell>
                    <Badge className={c.status === "completed" ? "bg-success text-success-foreground" : c.status === "failed" ? "bg-destructive" : "bg-warning text-warning-foreground"}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.duration_seconds}s</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{format(new Date(c.started_at), "MMM d, HH:mm")}</TableCell>
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
                <div><p className="text-muted-foreground text-xs">Status</p><p className="font-medium">{selected.status}</p></div>
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
