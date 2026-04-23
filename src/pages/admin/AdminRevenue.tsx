import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, TrendingUp, CreditCard, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, subDays } from "date-fns";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function AdminRevenue() {
  const [ledger, setLedger] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: l }, { data: p }] = await Promise.all([
        supabase.from("credits_ledger").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("user_id, email, full_name, credits_balance, credits_total_purchased, credits_total_used"),
      ]);
      setLedger(l || []); setProfiles(p || []); setLoading(false);
    })();
  }, []);

  const purchased = ledger.filter((l) => l.type === "purchase" || l.type === "grant").reduce((s, l) => s + Number(l.amount), 0);
  const used = ledger.filter((l) => l.type === "usage").reduce((s, l) => s + Math.abs(Number(l.amount)), 0);
  const totalBalance = profiles.reduce((s, p) => s + Number(p.credits_balance || 0), 0);

  // 14-day chart
  const days = Array.from({ length: 14 }).map((_, i) => format(subDays(new Date(), 13 - i), "MMM d"));
  const chart = days.map((d) => {
    const dayItems = ledger.filter((l) => format(new Date(l.created_at), "MMM d") === d);
    return {
      date: d,
      purchased: dayItems.filter((l) => l.type === "purchase" || l.type === "grant").reduce((s, l) => s + Number(l.amount), 0),
      used: Math.abs(dayItems.filter((l) => l.type === "usage").reduce((s, l) => s + Number(l.amount), 0)),
    };
  });

  if (loading) return <Loader2 className="h-6 w-6 animate-spin" />;

  const topUsers = [...profiles].sort((a, b) => Number(b.credits_total_used) - Number(a.credits_total_used)).slice(0, 10);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="font-display text-4xl font-bold">Revenue & usage</h1>
        <p className="text-muted-foreground mt-1">Credits across the platform.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Total balance" value={totalBalance.toFixed(0)} />
        <StatCard icon={CreditCard} label="Total purchased" value={purchased.toFixed(0)} />
        <StatCard icon={TrendingUp} label="Total used" value={used.toFixed(0)} />
        <StatCard icon={Users} label="Customers" value={String(profiles.length)} />
      </div>

      <Card className="bg-gradient-card border-border/60 p-6">
        <h3 className="font-semibold mb-4">14-day activity</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Bar dataKey="purchased" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="used" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="bg-gradient-card border-border/60 overflow-hidden">
        <div className="p-4 border-b border-border/60"><h3 className="font-semibold">Top 10 customers by usage</h3></div>
        <Table>
          <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead className="text-right">Balance</TableHead><TableHead className="text-right">Purchased</TableHead><TableHead className="text-right">Used</TableHead></TableRow></TableHeader>
          <TableBody>
            {topUsers.map((u) => (
              <TableRow key={u.user_id}>
                <TableCell className="text-sm">{u.full_name || u.email}</TableCell>
                <TableCell className="text-right font-mono">{Number(u.credits_balance).toFixed(0)}</TableCell>
                <TableCell className="text-right font-mono text-success">{Number(u.credits_total_purchased).toFixed(0)}</TableCell>
                <TableCell className="text-right font-mono text-warning">{Number(u.credits_total_used).toFixed(0)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <Card className="bg-gradient-card border-border/60 p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4 text-primary" /> {label}</div>
      <p className="font-display text-3xl font-bold mt-2">{value}</p>
    </Card>
  );
}
