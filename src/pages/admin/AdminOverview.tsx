import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, Bot, PhoneCall, Clock, TrendingUp, Activity, Sparkles } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";

export default function AdminOverview() {
  const [stats, setStats] = useState({ users: 0, agents: 0, calls: 0, minutes: 0, today: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [topAgents, setTopAgents] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ count: users }, { count: agents }, { data: calls }, { data: agentList }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("agents").select("*", { count: "exact", head: true }),
        supabase.from("calls").select("*"),
        supabase.from("agents").select("id, name"),
      ]);
      const totalSec = (calls ?? []).reduce((a, c: any) => a + (c.duration_seconds || 0), 0);
      const today0 = startOfDay(new Date()).getTime();
      const todayCalls = (calls ?? []).filter((c: any) => new Date(c.started_at).getTime() >= today0).length;

      setStats({
        users: users || 0, agents: agents || 0, calls: calls?.length || 0,
        minutes: Math.round(totalSec / 60), today: todayCalls,
      });

      // 14-day chart
      const days = Array.from({ length: 14 }, (_, i) => startOfDay(subDays(new Date(), 13 - i)));
      setChartData(days.map((d) => {
        const next = new Date(d.getTime() + 86400000);
        const dayCalls = (calls ?? []).filter((c: any) => {
          const t = new Date(c.started_at);
          return t >= d && t < next;
        });
        return { day: format(d, "MMM d"), calls: dayCalls.length };
      }));

      // top agents by call volume
      const counts: Record<string, number> = {};
      (calls ?? []).forEach((c: any) => { counts[c.agent_id] = (counts[c.agent_id] || 0) + 1; });
      const top = Object.entries(counts)
        .map(([aid, n]) => ({ name: agentList?.find((a: any) => a.id === aid)?.name ?? "Unknown", calls: n }))
        .sort((a, b) => b.calls - a.calls).slice(0, 5);
      setTopAgents(top);
    })();
  }, []);

  const cards = [
    { label: "Total users", value: stats.users, icon: Users, accent: "from-violet-500 to-fuchsia-500" },
    { label: "Total agents", value: stats.agents, icon: Bot, accent: "from-blue-500 to-cyan-500" },
    { label: "Total calls", value: stats.calls, icon: PhoneCall, accent: "from-emerald-500 to-teal-500" },
    { label: "Minutes used", value: stats.minutes, icon: Clock, accent: "from-orange-500 to-pink-500" },
    { label: "Today's calls", value: stats.today, icon: Activity, accent: "from-rose-500 to-red-500" },
  ];

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <Badge variant="outline" className="border-primary/40 text-primary-glow mb-2"><Sparkles className="h-3 w-3" /> Platform admin</Badge>
        <h1 className="font-display text-4xl font-bold">Platform overview</h1>
        <p className="text-muted-foreground mt-1">High-level stats across all customers.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="relative overflow-hidden bg-gradient-card border-border/60 p-5 hover:border-primary/40 transition-smooth group">
            <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${c.accent} opacity-10 group-hover:opacity-20 blur-2xl`} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{c.label}</p>
                <p className="font-display text-3xl font-bold mt-2">{c.value}</p>
              </div>
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${c.accent} flex items-center justify-center shadow-lg`}>
                <c.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-border/60 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Platform activity</h2>
              <p className="text-xs text-muted-foreground">Last 14 days · all customers</p>
            </div>
            <Badge variant="outline" className="text-success border-success/50"><TrendingUp className="h-3 w-3" /> Live</Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(195 100% 60%)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(195 100% 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 12% 16%)" />
                <XAxis dataKey="day" stroke="hsl(240 6% 65%)" fontSize={11} />
                <YAxis stroke="hsl(240 6% 65%)" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(240 18% 9%)", border: "1px solid hsl(240 12% 16%)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="calls" stroke="hsl(195 100% 60%)" strokeWidth={2} fill="url(#adminGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-gradient-card border-border/60 p-6">
          <h2 className="font-semibold mb-1">Top agents</h2>
          <p className="text-xs text-muted-foreground mb-4">By call volume</p>
          <div className="h-72">
            {topAgents.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topAgents} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 12% 16%)" />
                  <XAxis type="number" stroke="hsl(240 6% 65%)" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="hsl(240 6% 65%)" fontSize={11} width={90} />
                  <Tooltip contentStyle={{ background: "hsl(240 18% 9%)", border: "1px solid hsl(240 12% 16%)", borderRadius: 8 }} />
                  <Bar dataKey="calls" radius={[0, 6, 6, 0]}>
                    {topAgents.map((_, i) => <Cell key={i} fill="hsl(270 95% 65%)" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
