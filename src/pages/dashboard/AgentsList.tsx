import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Bot, Plus, Pencil, Mic, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LANGUAGES } from "@/lib/agent-options";

export default function AgentsList() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("agents").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setAgents(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const remove = async (id: string) => {
    if (!confirm("Delete this agent? This cannot be undone.")) return;
    const { error } = await supabase.from("agents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Agent deleted");
    load();
  };

  const langName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name ?? code;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Agents</h1>
          <p className="text-muted-foreground mt-1">Build, configure and test your voice AI agents.</p>
        </div>
        <Button asChild variant="hero"><Link to="/dashboard/agents/new"><Plus className="h-4 w-4" /> New agent</Link></Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : agents.length === 0 ? (
        <Card className="bg-gradient-card border-dashed border-border/60 p-12 text-center">
          <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold">No agents yet</h3>
          <p className="text-muted-foreground mt-2">Create your first voice agent to get started.</p>
          <Button asChild variant="hero" className="mt-6">
            <Link to="/dashboard/agents/new"><Plus className="h-4 w-4" /> Create agent</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => (
            <Card key={a.id} className="bg-gradient-card border-border/60 p-5 hover:border-primary/40 transition-smooth">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{a.name}</h3>
                    <p className="text-xs text-muted-foreground">{langName(a.language)}</p>
                  </div>
                </div>
                {a.is_active && <Badge variant="outline" className="text-success border-success/50">Active</Badge>}
              </div>
              {a.description && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{a.description}</p>}
              <div className="flex gap-2 mt-4">
                <Button asChild size="sm" variant="hero" className="flex-1">
                  <Link to={`/dashboard/agents/${a.id}/test`}><Mic className="h-3 w-3" /> Test</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/dashboard/agents/${a.id}`}><Pencil className="h-3 w-3" /></Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => remove(a.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
