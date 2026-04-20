import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { LANGUAGES, VOICES, LLM_MODELS } from "@/lib/agent-options";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Mic } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  language: z.string(),
  voice: z.string(),
  llm_model: z.string(),
  system_prompt: z.string().trim().min(10).max(8000),
  first_message: z.string().trim().min(2).max(500),
  knowledge_base: z.string().trim().max(20000).optional(),
  temperature: z.number().min(0).max(2),
  max_call_duration: z.number().int().min(30).max(3600),
  is_active: z.boolean(),
});

const defaults = {
  name: "",
  description: "",
  language: "en-IN",
  voice: "female-1",
  llm_model: "google/gemini-3-flash-preview",
  system_prompt: "You are a helpful, friendly assistant. Keep responses short and natural for voice conversations.",
  first_message: "Hello! How can I help you today?",
  knowledge_base: "",
  temperature: 0.7,
  max_call_duration: 600,
  is_active: true,
};

export default function AgentEditor() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const { user } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState<any>(defaults);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew || !user) return;
    (async () => {
      const { data, error } = await supabase.from("agents").select("*").eq("id", id).single();
      if (error) { toast.error(error.message); nav("/dashboard/agents"); return; }
      setForm({ ...data, temperature: Number(data.temperature) });
      setLoading(false);
    })();
  }, [id, user, isNew, nav]);

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    if (!user) return;
    setSaving(true);
    const payload = { ...parsed.data, user_id: user.id };
    if (isNew) {
      const { data, error } = await supabase.from("agents").insert(payload).select().single();
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Agent created");
      nav(`/dashboard/agents/${data.id}/test`);
    } else {
      const { error } = await supabase.from("agents").update(payload).eq("id", id!);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Saved");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => nav("/dashboard/agents")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {!isNew && (
          <Button variant="outline" size="sm" onClick={() => nav(`/dashboard/agents/${id}/test`)}>
            <Mic className="h-4 w-4" /> Test agent
          </Button>
        )}
      </div>

      <div>
        <h1 className="font-display text-3xl font-bold">{isNew ? "Create agent" : "Edit agent"}</h1>
        <p className="text-muted-foreground mt-1">Configure your AI voice agent's personality, voice and behavior.</p>
      </div>

      <Card className="bg-gradient-card border-border/60 p-6 space-y-5">
        <h2 className="font-semibold text-lg">Identity</h2>
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sales Qualifier" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Input value={form.description ?? ""} maxLength={500} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does this agent do?" />
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          <Label>Active</Label>
        </div>
      </Card>

      <Card className="bg-gradient-card border-border/60 p-6 space-y-5">
        <h2 className="font-semibold text-lg">Voice & Language</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Voice</Label>
            <Select value={form.voice} onValueChange={(v) => setForm({ ...form, voice: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{VOICES.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="bg-gradient-card border-border/60 p-6 space-y-5">
        <h2 className="font-semibold text-lg">Brain</h2>
        <div className="space-y-2">
          <Label>LLM model</Label>
          <Select value={form.llm_model} onValueChange={(v) => setForm({ ...form, llm_model: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LLM_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>First message *</Label>
          <Input value={form.first_message} maxLength={500} onChange={(e) => setForm({ ...form, first_message: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>System prompt *</Label>
          <Textarea rows={6} value={form.system_prompt} maxLength={8000} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} />
          <p className="text-xs text-muted-foreground">Tell the agent who it is, what it knows, and how to behave.</p>
        </div>
        <div className="space-y-2">
          <Label>Knowledge base (optional)</Label>
          <Textarea rows={5} value={form.knowledge_base ?? ""} maxLength={20000} onChange={(e) => setForm({ ...form, knowledge_base: e.target.value })} placeholder="Paste FAQs, product info, scripts, etc." />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between"><Label>Temperature</Label><span className="text-sm text-muted-foreground">{form.temperature.toFixed(1)}</span></div>
          <Slider min={0} max={2} step={0.1} value={[form.temperature]} onValueChange={([v]) => setForm({ ...form, temperature: v })} />
          <p className="text-xs text-muted-foreground">Lower = predictable, higher = creative</p>
        </div>
        <div className="space-y-2">
          <Label>Max call duration (seconds)</Label>
          <Input type="number" min={30} max={3600} value={form.max_call_duration} onChange={(e) => setForm({ ...form, max_call_duration: parseInt(e.target.value) || 600 })} />
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="hero" onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {isNew ? "Create agent" : "Save changes"}
        </Button>
        <Button variant="outline" onClick={() => nav("/dashboard/agents")}>Cancel</Button>
      </div>
    </div>
  );
}
