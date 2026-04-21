import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { LANGUAGES, VOICES, LLM_MODELS, AGENT_TEMPLATES } from "@/lib/agent-options";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Mic, Sparkles, FileText, Volume2, Brain, User } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const previewVoice = (text: string, lang: string) => {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  window.speechSynthesis.speak(u);
};

export default function AgentEditor() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const { user } = useAuth();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<any>(defaults);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(isNew);

  useEffect(() => {
    if (isNew || !user) return;
    (async () => {
      const { data, error } = await supabase.from("agents").select("*").eq("id", id).single();
      if (error) { toast.error(error.message); nav("/dashboard/agents"); return; }
      setForm({ ...data, temperature: Number(data.temperature) });
      setLoading(false);
    })();
  }, [id, user, isNew, nav]);

  const applyTemplate = (t: typeof AGENT_TEMPLATES[number]) => {
    setForm({
      ...defaults,
      name: t.name,
      description: t.description,
      first_message: t.first_message,
      system_prompt: t.system_prompt,
      voice: t.voice,
      language: t.language,
    });
    setShowTemplates(false);
    toast.success(`Loaded "${t.name}" template`);
  };

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    if (!user) return;
    setSaving(true);
    const payload = { ...parsed.data, user_id: user.id };
    if (isNew) {
      const { data, error } = await supabase.from("agents").insert(payload as any).select().single();
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

  if (showTemplates) {
    return (
      <div className="max-w-5xl space-y-6">
        <Button variant="ghost" size="sm" onClick={() => nav("/dashboard/agents")}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div>
          <Badge variant="outline" className="border-primary/40 text-primary-glow mb-3"><Sparkles className="h-3 w-3" /> Quick start</Badge>
          <h1 className="font-display text-4xl font-bold">Pick a template</h1>
          <p className="text-muted-foreground mt-1">Pre-built agents for the most common use cases. You can tweak everything later.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AGENT_TEMPLATES.map((t) => (
            <Card
              key={t.id}
              onClick={() => applyTemplate(t)}
              className="bg-gradient-card border-border/60 p-5 cursor-pointer hover:border-primary/50 hover:shadow-glow transition-smooth group"
            >
              <div className="flex items-start justify-between">
                <div className="text-3xl">{t.emoji}</div>
                <Badge variant="outline" className="text-xs">{t.category}</Badge>
              </div>
              <h3 className="font-semibold mt-3 group-hover:text-primary transition-smooth">{t.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2 min-h-[40px]">{t.description}</p>
              <div className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
                <span>{LANGUAGES.find((l) => l.code === t.language)?.name}</span>
                <span>·</span>
                <span>{VOICES.find((v) => v.id === t.voice)?.name?.split(" ")[0]}</span>
              </div>
            </Card>
          ))}
        </div>

        <Card
          onClick={() => setShowTemplates(false)}
          className="bg-gradient-card border-dashed border-border/60 p-8 text-center cursor-pointer hover:border-primary/50 transition-smooth"
        >
          <p className="font-medium">Or start from scratch →</p>
          <p className="text-sm text-muted-foreground mt-1">Build your own agent from a blank slate.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => isNew ? setShowTemplates(true) : nav("/dashboard/agents")}>
          <ArrowLeft className="h-4 w-4" /> {isNew ? "Templates" : "Back"}
        </Button>
        {!isNew && (
          <Button variant="outline" size="sm" onClick={() => nav(`/dashboard/agents/${id}/test`)}>
            <Mic className="h-4 w-4" /> Test agent
          </Button>
        )}
      </div>

      <div>
        <h1 className="font-display text-4xl font-bold">{isNew ? "Create agent" : "Edit agent"}</h1>
        <p className="text-muted-foreground mt-1">Design your AI voice agent's personality, voice and behavior.</p>
      </div>

      <Tabs defaultValue="identity">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="identity"><User className="h-3 w-3 mr-1" /> Identity</TabsTrigger>
          <TabsTrigger value="voice"><Volume2 className="h-3 w-3 mr-1" /> Voice</TabsTrigger>
          <TabsTrigger value="brain"><Brain className="h-3 w-3 mr-1" /> Brain</TabsTrigger>
          <TabsTrigger value="knowledge"><FileText className="h-3 w-3 mr-1" /> Knowledge</TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="mt-4">
          <Card className="bg-gradient-card border-border/60 p-6 space-y-5">
            <div className="space-y-2">
              <Label>Agent name *</Label>
              <Input value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sales Qualifier" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description ?? ""} maxLength={500} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does this agent do?" />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/40">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground mt-1">Inactive agents won't accept new calls.</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="voice" className="mt-4">
          <Card className="bg-gradient-card border-border/60 p-6 space-y-5">
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
            <div className="space-y-2">
              <Label>First message *</Label>
              <div className="flex gap-2">
                <Input value={form.first_message} maxLength={500} onChange={(e) => setForm({ ...form, first_message: e.target.value })} />
                <Button type="button" variant="outline" onClick={() => previewVoice(form.first_message, form.language)} title="Preview">
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">What the agent says first when a call begins.</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="brain" className="mt-4">
          <Card className="bg-gradient-card border-border/60 p-6 space-y-5">
            <div className="space-y-2">
              <Label>LLM model</Label>
              <Select value={form.llm_model} onValueChange={(v) => setForm({ ...form, llm_model: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LLM_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" /> All agents have real-time web search built in.
              </p>
            </div>
            <div className="space-y-2">
              <Label>System prompt *</Label>
              <Textarea rows={8} value={form.system_prompt} maxLength={8000} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground">Tell the agent who it is, what it knows, and how to behave.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between"><Label>Temperature</Label><span className="text-sm text-muted-foreground">{Number(form.temperature).toFixed(1)}</span></div>
                <Slider min={0} max={2} step={0.1} value={[form.temperature]} onValueChange={([v]) => setForm({ ...form, temperature: v })} />
                <p className="text-xs text-muted-foreground">Lower = predictable · Higher = creative</p>
              </div>
              <div className="space-y-2">
                <Label>Max call duration (sec)</Label>
                <Input type="number" min={30} max={3600} value={form.max_call_duration} onChange={(e) => setForm({ ...form, max_call_duration: parseInt(e.target.value) || 600 })} />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge" className="mt-4">
          <Card className="bg-gradient-card border-border/60 p-6 space-y-3">
            <Label>Knowledge base</Label>
            <Textarea rows={14} value={form.knowledge_base ?? ""} maxLength={20000} onChange={(e) => setForm({ ...form, knowledge_base: e.target.value })} placeholder="Paste FAQs, product info, scripts, pricing, policies — anything the agent should know." className="font-mono text-sm" />
            <p className="text-xs text-muted-foreground">{(form.knowledge_base ?? "").length} / 20,000 chars · The agent uses this to answer questions accurately.</p>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 sticky bottom-4 bg-background/80 backdrop-blur p-4 rounded-xl border border-border/60">
        <Button variant="hero" onClick={save} disabled={saving} className="flex-1">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {isNew ? "Create & test" : "Save changes"}
        </Button>
        <Button variant="outline" onClick={() => nav("/dashboard/agents")}>Cancel</Button>
      </div>
    </div>
  );
}
