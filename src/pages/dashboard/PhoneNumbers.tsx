import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Plus, Search, Loader2, Bot, ShoppingCart, Download, Link2 } from "lucide-react";
import { toast } from "sonner";

export default function PhoneNumbers() {
  const { user } = useAuth();
  const [numbers, setNumbers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("IN");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [importNum, setImportNum] = useState("");
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: n }, { data: a }] = await Promise.all([
      supabase.from("phone_numbers").select("*, agents(name)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("agents").select("id, name").eq("user_id", user.id),
    ]);
    setNumbers(n || []); setAgents(a || []); setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const search = async () => {
    setSearching(true);
    const { data, error } = await supabase.functions.invoke("plivo-numbers", { body: { action: "search", country, type: "local" } });
    setSearching(false);
    if (error || data?.error) return toast.error(data?.error || "Search failed. Connect Plivo first.");
    setSearchResults(data?.objects || []);
  };

  const buy = async (num: string) => {
    const { data, error } = await supabase.functions.invoke("plivo-numbers", { body: { action: "buy", number: num, country } });
    if (error || data?.error) return toast.error(data?.error || "Purchase failed");
    toast.success("Number purchased!"); setOpen(false); load();
  };

  const importN = async () => {
    if (!importNum) return;
    const { data, error } = await supabase.functions.invoke("plivo-numbers", { body: { action: "import", number: importNum } });
    if (error || data?.error) return toast.error(data?.error || "Import failed");
    toast.success("Number imported"); setImportNum(""); setOpen(false); load();
  };

  const assign = async (num: string, agent_id: string) => {
    const { error } = await supabase.functions.invoke("plivo-numbers", { body: { action: "assign_agent", number: num, agent_id } });
    if (error) return toast.error("Assignment failed");
    toast.success("Agent assigned. Inbound calls will hit this agent."); load();
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold">Phone numbers</h1>
          <p className="text-muted-foreground mt-1">Buy or import Plivo numbers and route inbound calls to your AI agents.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> Add number</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Add a phone number</DialogTitle></DialogHeader>
            <Tabs defaultValue="buy">
              <TabsList className="grid grid-cols-2"><TabsTrigger value="buy"><ShoppingCart className="h-3 w-3 mr-1" /> Buy new</TabsTrigger><TabsTrigger value="import"><Download className="h-3 w-3 mr-1" /> Import existing</TabsTrigger></TabsList>
              <TabsContent value="buy" className="space-y-3 pt-3">
                <div className="flex gap-2">
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">India</SelectItem><SelectItem value="US">USA</SelectItem><SelectItem value="GB">UK</SelectItem><SelectItem value="CA">Canada</SelectItem><SelectItem value="AU">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={search} disabled={searching} variant="outline">{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search</Button>
                </div>
                <div className="max-h-96 overflow-auto space-y-1">
                  {searchResults.length === 0 && <p className="text-xs text-muted-foreground p-3">Click search to find available numbers.</p>}
                  {searchResults.map((r: any) => (
                    <div key={r.number} className="flex items-center justify-between p-2 rounded border border-border/60 hover:bg-secondary/40">
                      <div><p className="font-mono text-sm">{r.number}</p><p className="text-xs text-muted-foreground">{r.region || r.country} · ${r.monthly_rental_rate || "—"}/mo</p></div>
                      <Button size="sm" onClick={() => buy(r.number)}>Buy</Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="import" className="space-y-3 pt-3">
                <p className="text-xs text-muted-foreground">If you already own a number on your Plivo account, paste it here (E.164 format, e.g. +14155551234).</p>
                <div className="flex gap-2">
                  <Input value={importNum} onChange={(e) => setImportNum(e.target.value)} placeholder="+14155551234" />
                  <Button onClick={importN}>Import</Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-gradient-card border-border/60 overflow-hidden">
        {loading ? <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          numbers.length === 0 ? (
            <div className="p-12 text-center">
              <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No numbers yet</p>
              <p className="text-sm text-muted-foreground">Buy or import a Plivo number to start receiving and making calls.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Country</TableHead><TableHead>Type</TableHead><TableHead>Inbound agent</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {numbers.map((n) => (
                  <TableRow key={n.id} className="hover:bg-secondary/40">
                    <TableCell className="font-mono">{n.number}</TableCell>
                    <TableCell>{n.country}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{n.source}</Badge></TableCell>
                    <TableCell>
                      <Select value={n.agent_id || ""} onValueChange={(v) => assign(n.number, v)}>
                        <SelectTrigger className="w-56"><SelectValue placeholder="Assign agent…" /></SelectTrigger>
                        <SelectContent>{agents.map((a) => <SelectItem key={a.id} value={a.id}><Bot className="h-3 w-3 inline mr-1" /> {a.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{n.is_active ? <Badge className="bg-success text-success-foreground">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </Card>
    </div>
  );
}
