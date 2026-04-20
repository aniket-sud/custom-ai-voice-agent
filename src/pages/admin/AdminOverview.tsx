import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, Bot, PhoneCall, Clock } from "lucide-react";

export default function AdminOverview() {
  const [stats, setStats] = useState({ users: 0, agents: 0, calls: 0, minutes: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: users }, { count: agents }, { data: calls }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("agents").select("*", { count: "exact", head: true }),
        supabase.from("calls").select("duration_seconds"),
      ]);
      const totalSec = (calls ?? []).reduce((a, c: any) => a + (c.duration_seconds || 0), 0);
      setStats({ users: users || 0, agents: agents || 0, calls: calls?.length || 0, minutes: Math.round(totalSec / 60) });
    })();
  }, []);

  const cards = [
    { label: "Total users", value: stats.users, icon: Users },
    { label: "Total agents", value: stats.agents, icon: Bot },
    { label: "Total calls", value: stats.calls, icon: PhoneCall },
    { label: "Minutes used", value: stats.minutes, icon: Clock },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Platform overview</h1>
        <p className="text-muted-foreground mt-1">High-level stats across all customers.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="bg-gradient-card border-border/60 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</p>
                <p className="font-display text-3xl font-bold mt-2">{c.value}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><c.icon className="h-4 w-4 text-primary" /></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
