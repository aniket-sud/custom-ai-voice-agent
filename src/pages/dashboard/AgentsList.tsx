import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Bot, Plus, Pencil, Mic, Trash2, Search, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { LANGUAGES } from "@/lib/agent-options";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function AgentsList() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("agents").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setAgents(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("agents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Agent deleted");
    load();
  };

  const duplicate = async (a: any) => {
    if (!user) return;
    const { id, created_at, updated_at, ...rest } = a;
    const { error } = await supabase.from("agents").insert({ ...rest, name: `${a.name} (copy)`, user_id: user.id });
    if (error) return toast.error(error.message);
    toast.success("Agent duplicated");
    load();
  };

  const langName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name ?? code;

  const filtered = agents.filter((a) => {
    if (filter === "active" && !a.is_active) return false;
    if (filter === "inactive" && a.is_active) return false;
    if (query && !`${a.name} ${a.description ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Agents</h1>
          <p className="text-muted-foreground mt-1">Build, configure and test your voice AI agents.</p>
        </div>
        <Button asChild variant="hero"><Link to="/dashboard/agents/new"><Plus className="h-4 w-4" /> New agent</Link></Button>
      </div>

      {agents.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search agents…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1 p-1 bg-secondary rounded-lg">
            {(["all", "active", "inactive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-sm rounded-md capitalize transition-smooth ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >{f}</button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : agents.length === 0 ? (
        <Card className="bg-gradient-card border-dashed border-primary/30 p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 shadow-glow">
            <Bot className="h-8 w-8 text-primary-foreground" />
          </div>
          <h3 className="font-display text-xl font-semibold">Build your first voice agent</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">Pick a template or start from scratch. You'll be testing it with your voice in under 60 seconds.</p>
          <Button asChild variant="hero" className="mt-6">
            <Link to="/dashboard/agents/new"><Sparkles className="h-4 w-4" /> Browse templates</Link>
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">No agents match your search.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <Card key={a.id} className="bg-gradient-card border-border/60 p-5 hover:border-primary/40 hover:shadow-glow transition-smooth group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg group-hover:scale-105 transition-smooth">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{a.name}</h3>
                    <p className="text-xs text-muted-foreground">{langName(a.language)}</p>
                  </div>
                </div>
                {a.is_active ? <Badge variant="outline" className="text-success border-success/50">Active</Badge> : <Badge variant="outline" className="text-muted-foreground">Off</Badge>}
              </div>
              {a.description && <p className="text-sm text-muted-foreground mt-3 line-clamp-2 min-h-[40px]">{a.description}</p>}
              <div className="flex gap-2 mt-4">
                <Button asChild size="sm" variant="hero" className="flex-1">
                  <Link to={`/dashboard/agents/${a.id}/test`}><Mic className="h-3 w-3" /> Test</Link>
                </Button>
                <Button asChild size="sm" variant="outline" title="Edit">
                  <Link to={`/dashboard/agents/${a.id}`}><Pencil className="h-3 w-3" /></Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => duplicate(a)} title="Duplicate"><Copy className="h-3 w-3" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" title="Delete"><Trash2 className="h-3 w-3" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this agent?</AlertDialogTitle>
                      <AlertDialogDescription>This will permanently delete "{a.name}" and cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(a.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
