import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileAudio, Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function Recordings() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("call_recordings").select("*, calls(to_number, from_number, duration_seconds, agents(name))").eq("user_id", user.id).order("created_at", { ascending: false });
      setRows(data || []); setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="font-display text-4xl font-bold">Recordings</h1>
        <p className="text-muted-foreground mt-1">All call recordings with audio playback and download.</p>
      </div>
      <Card className="bg-gradient-card border-border/60 overflow-hidden">
        {loading ? <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          rows.length === 0 ? (
            <div className="p-12 text-center">
              <FileAudio className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No recordings yet</p><p className="text-sm text-muted-foreground">Recordings appear here after phone calls finish.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Agent</TableHead><TableHead>From → To</TableHead><TableHead>Duration</TableHead><TableHead>Audio</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="hover:bg-secondary/40">
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(r.created_at), "MMM d, HH:mm")}</TableCell>
                    <TableCell>{r.calls?.agents?.name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.calls?.from_number} → {r.calls?.to_number}</TableCell>
                    <TableCell>{r.duration_seconds}s</TableCell>
                    <TableCell><audio controls src={r.recording_url} className="h-8" /></TableCell>
                    <TableCell><Button size="sm" variant="ghost" asChild><a href={r.recording_url} download><Download className="h-3 w-3" /></a></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </Card>
    </div>
  );
}
