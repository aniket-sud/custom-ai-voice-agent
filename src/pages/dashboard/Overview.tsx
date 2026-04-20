import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Bot, PhoneCall, Clock, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function DashboardOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ agents: 0, calls: 0, minutes: 0, success: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: agents }, { data: calls }] = await Promise.all([
        supabase.from("agents").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("calls").select("duration_seconds,status").eq("user_id", user.id),
      ]);
      const totalSec = (calls ?? []).reduce((a, c: any) => a + (c.duration_seconds || 0), 0);
      const completed = (calls ?? []).filter((c: any) => c.status === "completed").length;
      setStats({
        agents: agents || 0,
        calls: calls?.length || 0,
        minutes: Math.round(totalSec / 60),
        success: calls?.length ? Math.round((completed / calls.length) * 100) : 0,
      });
    })();
  }, [user]);

  const cards = [
    { label: "Active agents", value: stats.agents, icon: Bot },
    { label: "Total calls", value: stats.calls, icon: PhoneCall },
    { label: "Minutes used", value: stats.minutes, icon: Clock },
    { label: "Success rate", value: `${stats.success}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Welcome back 👋</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your voice agents.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="bg-gradient-card border-border/60 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</p>
                <p className="font-display text-3xl font-bold mt-2">{c.value}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <c.icon className="h-4 w-4 text-primary" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-card border-primary/30 p-8">
        <h2 className="font-display text-xl font-semibold">Get started</h2>
        <p className="text-muted-foreground mt-1">Create your first AI voice agent and test it in your browser.</p>
        <Button asChild variant="hero" className="mt-4">
          <Link to="/dashboard/agents/new">Create your first agent</Link>
        </Button>
      </Card>
    </div>
  );
}
