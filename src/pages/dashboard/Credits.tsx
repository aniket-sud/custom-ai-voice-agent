import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, Sparkles, TrendingUp, TrendingDown, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toast } from "sonner";

export default function Credits() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      const { data: l } = await supabase.from("credits_ledger").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
      setProfile(p); setLedger(l || []); setLoading(false);
    })();
  }, [user]);

  const buyCredits = () => toast("Stripe checkout coming soon — ask admin to grant credits in the meantime.");

  if (loading) return <Loader2 className="h-6 w-6 animate-spin" />;

  // Build daily usage chart from ledger
  const usageByDay: Record<string, number> = {};
  ledger.filter((l) => l.type === "usage").forEach((l) => {
    const d = format(new Date(l.created_at), "MMM d");
    usageByDay[d] = (usageByDay[d] || 0) + Math.abs(Number(l.amount));
  });
  const chart = Object.entries(usageByDay).slice(0, 14).reverse().map(([date, used]) => ({ date, used }));

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="font-display text-4xl font-bold">Credits & usage</h1>
        <p className="text-muted-foreground mt-1">1 credit ≈ 1 minute of phone-call airtime.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-primary text-primary-foreground p-5 col-span-2">
          <div className="flex items-center gap-2 text-sm opacity-90"><Sparkles className="h-4 w-4" /> Available balance</div>
          <p className="font-display text-5xl font-bold mt-2">{Number(profile?.credits_balance || 0).toFixed(0)}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={buyCredits}><Plus className="h-3 w-3" /> Top up</Button>
        </Card>
        <Card className="bg-gradient-card border-border/60 p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="h-4 w-4 text-success" /> Total purchased</div>
          <p className="font-display text-3xl font-bold mt-2">{Number(profile?.credits_total_purchased || 0).toFixed(0)}</p>
        </Card>
        <Card className="bg-gradient-card border-border/60 p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingDown className="h-4 w-4 text-warning" /> Total used</div>
          <p className="font-display text-3xl font-bold mt-2">{Number(profile?.credits_total_used || 0).toFixed(0)}</p>
        </Card>
      </div>

      {chart.length > 0 && (
        <Card className="bg-gradient-card border-border/60 p-6">
          <h3 className="font-semibold mb-4">Usage (last 14 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="used" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="bg-gradient-card border-border/60 overflow-hidden">
        <div className="p-4 border-b border-border/60"><h3 className="font-semibold">Ledger</h3></div>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Change</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
          <TableBody>
            {ledger.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No activity yet</TableCell></TableRow>}
            {ledger.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(l.created_at), "MMM d HH:mm")}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{l.type}</Badge></TableCell>
                <TableCell className="text-sm">{l.description || "—"}</TableCell>
                <TableCell className={`text-right font-mono ${Number(l.amount) >= 0 ? "text-success" : "text-warning"}`}>{Number(l.amount) >= 0 ? "+" : ""}{Number(l.amount).toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono">{Number(l.balance_after).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
