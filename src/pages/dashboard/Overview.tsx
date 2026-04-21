import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Bot, PhoneCall, Clock, TrendingUp, Sparkles, ArrowRight, Zap, Plus, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format, subDays, startOfDay } from "date-fns";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell, Pie, PieChart, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";

export default function DashboardOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ agents: 0, calls: 0, minutes: 0, success: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [agentDist, setAgentDist] = useState<any[]>([]);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: agents }, { data: calls }, { data: agentList }] = await Promise.all([
        supabase.from("agents").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("calls").select("*, agents(name)").eq("user_id", user.id).order("started_at", { ascending: false }).limit(50),
        supabase.from("agents").select("name, language").eq("user_id", user.id),
      ]);

      const totalSec = (calls ?? []).reduce((a, c: any) => a + (c.duration_seconds || 0), 0);
      const completed = (calls ?? []).filter((c: any) => c.status === "completed").length;
      setStats({
        agents: agents || 0,
        calls: calls?.length || 0,
        minutes: Math.round(totalSec / 60),
        success: calls?.length ? Math.round((completed / calls.length) * 100) : 0,
      });

      // 7-day chart
      const days = Array.from({ length: 7 }, (_, i) => startOfDay(subDays(new Date(), 6 - i)));
      const data = days.map((d) => {
        const next = new Date(d.getTime() + 86400000);
        const dayCalls = (calls ?? []).filter((c: any) => {
          const t = new Date(c.started_at);
          return t >= d && t < next;
        });
        return {
          day: format(d, "MMM d"),
          calls: dayCalls.length,
          minutes: Math.round(dayCalls.reduce((a, c: any) => a + (c.duration_seconds || 0), 0) / 60),
        };
      });
      setChartData(data);

      // Agent distribution
      const langCount: Record<string, number> = {};
      (agentList ?? []).forEach((a: any) => {
        const k = a.language || "other";
        langCount[k] = (langCount[k] || 0) + 1;
      });
      setAgentDist(Object.entries(langCount).map(([name, value]) => ({ name, value })));
      setRecentCalls((calls ?? []).slice(0, 5));
    })();
  }, [user]);

  const cards = [
    { label: "Active agents", value: stats.agents, icon: Bot, accent: "from-violet-500 to-fuchsia-500" },
    { label: "Total calls", value: stats.calls, icon: PhoneCall, accent: "from-blue-500 to-cyan-500" },
    { label: "Minutes used", value: stats.minutes, icon: Clock, accent: "from-emerald-500 to-teal-500" },
    { label: "Success rate", value: `${stats.success}%`, icon: TrendingUp, accent: "from-orange-500 to-pink-500" },
  ];

  const PIE_COLORS = ["hsl(270 95% 65%)", "hsl(195 100% 60%)", "hsl(330 80% 60%)", "hsl(160 70% 50%)", "hsl(40 95% 60%)", "hsl(0 80% 60%)"];

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="border-primary/40 text-primary-glow"><Sparkles className="h-3 w-3" /> Live</Badge>
            <span className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</span>
          </div>
          <h1 className="font-display text-4xl font-bold">Welcome back 👋</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your voice agents.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/dashboard/calls"><PhoneCall className="h-4 w-4" /> View calls</Link></Button>
          <Button asChild variant="hero"><Link to="/dashboard/agents/new"><Plus className="h-4 w-4" /> New agent</Link></Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="relative overflow-hidden bg-gradient-card border-border/60 p-5 hover:border-primary/40 transition-smooth group">
            <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${c.accent} opacity-10 group-hover:opacity-20 transition-smooth blur-2xl`} />
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

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-border/60 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Call activity</h2>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </div>
            <Badge variant="outline">Calls</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(270 95% 65%)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(270 95% 65%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 12% 16%)" />
                <XAxis dataKey="day" stroke="hsl(240 6% 65%)" fontSize={12} />
                <YAxis stroke="hsl(240 6% 65%)" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(240 18% 9%)", border: "1px solid hsl(240 12% 16%)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="calls" stroke="hsl(270 95% 65%)" strokeWidth={2} fill="url(#callsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-gradient-card border-border/60 p-6">
          <div className="mb-4">
            <h2 className="font-semibold">Agents by language</h2>
            <p className="text-xs text-muted-foreground">Distribution</p>
          </div>
          <div className="h-64">
            {agentDist.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No agents yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={agentDist} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={3}>
                    {agentDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(240 18% 9%)", border: "1px solid hsl(240 12% 16%)", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Recent calls + getting started */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-border/60 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Recent calls</h2>
            <Button asChild size="sm" variant="ghost"><Link to="/dashboard/calls">View all <ArrowRight className="h-3 w-3" /></Link></Button>
          </div>
          {recentCalls.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No calls yet. Test an agent to get started.</p>
          ) : (
            <div className="space-y-2">
              {recentCalls.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 hover:bg-secondary transition-smooth">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <PhoneCall className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c.agents?.name ?? "Unknown agent"}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(c.started_at), "MMM d, HH:mm")} · {c.duration_seconds}s</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={c.status === "completed" ? "border-success/50 text-success" : ""}>{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="bg-gradient-hero border-primary/40 p-6 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <Zap className="h-8 w-8 text-primary mb-3" />
            <h2 className="font-display text-xl font-semibold">Build faster with templates</h2>
            <p className="text-sm text-muted-foreground mt-1">Pre-built agents for sales, support, bookings & more.</p>
            <Button asChild variant="hero" className="mt-4 w-full">
              <Link to="/dashboard/agents/new">Browse templates <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
