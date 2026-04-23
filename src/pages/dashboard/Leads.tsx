import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Inbox, Loader2, Phone } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Leads() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("page_leads").select("*, agents(name), agent_pages(slug)").eq("user_id", user.id).order("created_at", { ascending: false });
    setRows(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const callBack = async (lead: any) => {
    const { data: pn } = await supabase.from("phone_numbers").select("number").eq("user_id", user!.id).eq("agent_id", lead.agent_id).limit(1).maybeSingle();
    if (!pn) return toast.error("Assign a phone number to this agent first.");
    const { data, error } = await supabase.functions.invoke("plivo-call", {
      body: { agent_id: lead.agent_id, from_number: pn.number, to_number: lead.phone, lead_id: lead.id },
    });
    if (error || data?.error) return toast.error(data?.error || "Call failed");
    toast.success("Calling…"); load();
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="font-display text-4xl font-bold">Page leads</h1>
        <p className="text-muted-foreground mt-1">Visitors who requested a callback from your public agent pages.</p>
      </div>
      <Card className="bg-gradient-card border-border/60 overflow-hidden">
        {loading ? <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          rows.length === 0 ? (
            <div className="p-12 text-center"><Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="font-medium">No leads yet</p><p className="text-sm text-muted-foreground">Share your public agent page to start collecting leads.</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Agent</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((l) => (
                  <TableRow key={l.id} className="hover:bg-secondary/40">
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(l.created_at), "MMM d HH:mm")}</TableCell>
                    <TableCell>{l.name || "—"}</TableCell>
                    <TableCell className="font-mono">{l.phone}</TableCell>
                    <TableCell className="text-sm">{l.email || "—"}</TableCell>
                    <TableCell className="text-sm">{l.agents?.name || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => callBack(l)}><Phone className="h-3 w-3" /> Call</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </Card>
    </div>
  );
}
