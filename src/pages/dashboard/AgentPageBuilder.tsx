import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Globe, Lock, Eye, Copy, Sparkles, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const defaults = {
  visibility: "private", title: "Talk to our AI agent", subtitle: "Get instant answers, 24/7.", hero_text: "",
  cta_label: "Talk now", primary_color: "#7c3aed", accent_color: "#06b6d4", background_style: "gradient",
  logo_url: "", cover_image_url: "",
  features: [{ icon: "⚡", title: "Instant", text: "No waiting in queues." }, { icon: "🌍", title: "Multilingual", text: "Speaks 12+ languages." }, { icon: "🔒", title: "Private", text: "Encrypted end-to-end." }],
  faqs: [{ q: "Is this a real human?", a: "No, it's an AI agent — but it sounds remarkably human." }],
  allow_browser_call: true, allow_phone_callback: true, collect_email: false,
};

export default function AgentPageBuilder() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [agent, setAgent] = useState<any>(null);
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data: a } = await supabase.from("agents").select("*").eq("id", id).single();
      setAgent(a);
      const { data: p } = await supabase.from("agent_pages").select("*").eq("agent_id", id).maybeSingle();
      if (p) setPage(p);
      else {
        const { data: slug } = await supabase.rpc("generate_agent_slug", { p_base: a?.name || "agent" });
        setPage({ ...defaults, agent_id: id, user_id: user.id, slug });
      }
      setLoading(false);
    })();
  }, [user, id]);

  const save = async () => {
    if (!user || !page) return;
    setSaving(true);
    const payload = { ...page, user_id: user.id, agent_id: id };
    delete payload.id;
    const { data, error } = await supabase.from("agent_pages").upsert(payload, { onConflict: "agent_id" }).select().single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setPage(data);
    toast.success("Saved");
  };

  const copyLink = () => {
    const url = `${window.location.origin}/a/${page.slug}`;
    navigator.clipboard.writeText(url); toast.success("Link copied");
  };

  if (loading || !page) return <Loader2 className="h-6 w-6 animate-spin" />;

  const publicUrl = `${window.location.origin}/a/${page.slug}`;

  return (
    <div className="grid lg:grid-cols-[480px_1fr] gap-6 max-w-[1600px]">
      {/* Editor */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => nav(`/dashboard/agents/${id}`)}><ArrowLeft className="h-4 w-4" /> Back to agent</Button>
        <div>
          <h1 className="font-display text-3xl font-bold">Page builder</h1>
          <p className="text-muted-foreground text-sm mt-1">Design a public landing page for "{agent?.name}".</p>
        </div>

        <Card className="bg-gradient-card border-border/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {page.visibility === "public" ? <Globe className="h-4 w-4 text-success" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
              <Label>Public page</Label>
            </div>
            <Switch checked={page.visibility === "public"} onCheckedChange={(v) => setPage({ ...page, visibility: v ? "public" : "private" })} />
          </div>
          <div className="space-y-2">
            <Label>URL slug</Label>
            <div className="flex gap-1 items-center text-xs text-muted-foreground"><span>{window.location.origin}/a/</span>
              <Input value={page.slug} onChange={(e) => setPage({ ...page, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} className="h-8" />
            </div>
            {page.visibility === "public" && page.id && <Button variant="ghost" size="sm" onClick={copyLink}><Copy className="h-3 w-3" /> {publicUrl}</Button>}
          </div>
        </Card>

        <Card className="bg-gradient-card border-border/60 p-5 space-y-4">
          <h3 className="font-semibold">Content</h3>
          <div className="space-y-2"><Label>Title</Label><Input value={page.title} maxLength={120} onChange={(e) => setPage({ ...page, title: e.target.value })} /></div>
          <div className="space-y-2"><Label>Subtitle</Label><Input value={page.subtitle || ""} maxLength={200} onChange={(e) => setPage({ ...page, subtitle: e.target.value })} /></div>
          <div className="space-y-2"><Label>Hero paragraph</Label><Textarea rows={3} value={page.hero_text || ""} maxLength={1000} onChange={(e) => setPage({ ...page, hero_text: e.target.value })} /></div>
          <div className="space-y-2"><Label>CTA label</Label><Input value={page.cta_label} maxLength={40} onChange={(e) => setPage({ ...page, cta_label: e.target.value })} /></div>
          <div className="space-y-2"><Label>Logo URL</Label><Input value={page.logo_url || ""} onChange={(e) => setPage({ ...page, logo_url: e.target.value })} placeholder="https://..." /></div>
          <div className="space-y-2"><Label>Cover image URL</Label><Input value={page.cover_image_url || ""} onChange={(e) => setPage({ ...page, cover_image_url: e.target.value })} placeholder="https://..." /></div>
        </Card>

        <Card className="bg-gradient-card border-border/60 p-5 space-y-3">
          <h3 className="font-semibold">Theme</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Primary</Label>
              <div className="flex gap-2"><Input type="color" value={page.primary_color} className="w-12 h-9 p-1" onChange={(e) => setPage({ ...page, primary_color: e.target.value })} /><Input value={page.primary_color} onChange={(e) => setPage({ ...page, primary_color: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Accent</Label>
              <div className="flex gap-2"><Input type="color" value={page.accent_color} className="w-12 h-9 p-1" onChange={(e) => setPage({ ...page, accent_color: e.target.value })} /><Input value={page.accent_color} onChange={(e) => setPage({ ...page, accent_color: e.target.value })} /></div>
            </div>
          </div>
          <div className="space-y-2"><Label>Background</Label>
            <Select value={page.background_style} onValueChange={(v) => setPage({ ...page, background_style: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="gradient">Gradient mesh</SelectItem><SelectItem value="dark">Solid dark</SelectItem><SelectItem value="light">Solid light</SelectItem><SelectItem value="image">Cover image</SelectItem></SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="bg-gradient-card border-border/60 p-5 space-y-3">
          <h3 className="font-semibold flex items-center justify-between">Features
            <Button size="sm" variant="ghost" onClick={() => setPage({ ...page, features: [...(page.features || []), { icon: "✨", title: "", text: "" }] })}><Plus className="h-3 w-3" /></Button>
          </h3>
          {(page.features || []).map((f: any, i: number) => (
            <div key={i} className="grid grid-cols-[40px_1fr_1fr_30px] gap-2 items-center">
              <Input value={f.icon} onChange={(e) => { const x = [...page.features]; x[i].icon = e.target.value; setPage({ ...page, features: x }); }} className="text-center" />
              <Input value={f.title} onChange={(e) => { const x = [...page.features]; x[i].title = e.target.value; setPage({ ...page, features: x }); }} placeholder="Title" />
              <Input value={f.text} onChange={(e) => { const x = [...page.features]; x[i].text = e.target.value; setPage({ ...page, features: x }); }} placeholder="Description" />
              <Button size="sm" variant="ghost" onClick={() => setPage({ ...page, features: page.features.filter((_: any, j: number) => j !== i) })}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </Card>

        <Card className="bg-gradient-card border-border/60 p-5 space-y-3">
          <h3 className="font-semibold flex items-center justify-between">FAQs
            <Button size="sm" variant="ghost" onClick={() => setPage({ ...page, faqs: [...(page.faqs || []), { q: "", a: "" }] })}><Plus className="h-3 w-3" /></Button>
          </h3>
          {(page.faqs || []).map((f: any, i: number) => (
            <div key={i} className="space-y-2 border-b border-border/40 pb-3">
              <div className="flex gap-2"><Input value={f.q} onChange={(e) => { const x = [...page.faqs]; x[i].q = e.target.value; setPage({ ...page, faqs: x }); }} placeholder="Question" />
                <Button size="sm" variant="ghost" onClick={() => setPage({ ...page, faqs: page.faqs.filter((_: any, j: number) => j !== i) })}><Trash2 className="h-3 w-3" /></Button></div>
              <Textarea rows={2} value={f.a} onChange={(e) => { const x = [...page.faqs]; x[i].a = e.target.value; setPage({ ...page, faqs: x }); }} placeholder="Answer" />
            </div>
          ))}
        </Card>

        <Card className="bg-gradient-card border-border/60 p-5 space-y-3">
          <h3 className="font-semibold">Visitor actions</h3>
          <div className="flex items-center justify-between"><Label className="text-sm">Allow browser voice chat</Label><Switch checked={page.allow_browser_call} onCheckedChange={(v) => setPage({ ...page, allow_browser_call: v })} /></div>
          <div className="flex items-center justify-between"><Label className="text-sm">Allow phone callback request</Label><Switch checked={page.allow_phone_callback} onCheckedChange={(v) => setPage({ ...page, allow_phone_callback: v })} /></div>
          <div className="flex items-center justify-between"><Label className="text-sm">Require email on form</Label><Switch checked={page.collect_email} onCheckedChange={(v) => setPage({ ...page, collect_email: v })} /></div>
        </Card>

        <div className="sticky bottom-4 flex gap-2 bg-background/80 backdrop-blur p-3 rounded-xl border border-border/60">
          <Button variant="hero" onClick={save} disabled={saving} className="flex-1">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save page</Button>
          {page.id && page.visibility === "public" && (
            <Button variant="outline" asChild><a href={publicUrl} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /> Preview</a></Button>
          )}
        </div>
      </div>

      {/* Live preview */}
      <div className="lg:sticky lg:top-20 h-fit">
        <Badge variant="outline" className="mb-2"><Sparkles className="h-3 w-3" /> Live preview</Badge>
        <div className="rounded-2xl overflow-hidden border-2 border-border/60 shadow-elegant">
          <iframe key={JSON.stringify(page).slice(0, 100)} srcDoc={renderPreview(page, agent)} className="w-full h-[800px] bg-white" />
        </div>
      </div>
    </div>
  );
}

function renderPreview(p: any, agent: any) {
  const features = (p.features || []).map((f: any) => `<div class="card"><div class="ic">${f.icon}</div><h3>${escapeHtml(f.title)}</h3><p>${escapeHtml(f.text)}</p></div>`).join("");
  const faqs = (p.faqs || []).map((f: any) => `<details><summary>${escapeHtml(f.q)}</summary><p>${escapeHtml(f.a)}</p></details>`).join("");
  const bg = p.background_style === "image" && p.cover_image_url ? `url(${p.cover_image_url}) center/cover, #0b0b14`
    : p.background_style === "light" ? "#f8fafc"
    : p.background_style === "dark" ? "#0b0b14"
    : `radial-gradient(ellipse at top, ${p.primary_color}33, transparent 60%), radial-gradient(ellipse at bottom right, ${p.accent_color}22, transparent 60%), #0b0b14`;
  const text = p.background_style === "light" ? "#0b0b14" : "#f5f5f7";
  const muted = p.background_style === "light" ? "#5b5b66" : "#a8a8b3";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,system-ui,sans-serif;background:${bg};color:${text};min-height:100vh}
    .wrap{max-width:1100px;margin:0 auto;padding:48px 24px}
    .nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:64px}
    .logo{display:flex;align-items:center;gap:8px;font-weight:700}
    .logo img{height:32px}
    h1{font-size:56px;line-height:1.05;letter-spacing:-0.02em;font-weight:800;margin-bottom:16px;background:linear-gradient(135deg,${p.primary_color},${p.accent_color});-webkit-background-clip:text;background-clip:text;color:transparent}
    .sub{font-size:20px;color:${muted};margin-bottom:24px;max-width:640px}
    .hero-text{font-size:16px;color:${muted};margin-bottom:32px;max-width:640px}
    .cta{display:inline-flex;align-items:center;gap:8px;padding:16px 32px;background:linear-gradient(135deg,${p.primary_color},${p.accent_color});color:#fff;border:0;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;box-shadow:0 12px 40px ${p.primary_color}55}
    .features{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin:64px 0}
    .card{background:${p.background_style === "light" ? "#ffffff" : "rgba(255,255,255,0.04)"};backdrop-filter:blur(8px);border:1px solid ${p.background_style === "light" ? "#e5e5e8" : "rgba(255,255,255,0.08)"};border-radius:16px;padding:24px}
    .card .ic{font-size:32px;margin-bottom:12px}
    .card h3{margin-bottom:6px;font-size:17px}
    .card p{color:${muted};font-size:14px;line-height:1.5}
    .form{background:${p.background_style === "light" ? "#ffffff" : "rgba(255,255,255,0.04)"};border:1px solid ${p.background_style === "light" ? "#e5e5e8" : "rgba(255,255,255,0.08)"};border-radius:20px;padding:32px;margin:32px 0}
    .form input{width:100%;padding:12px 14px;border-radius:10px;border:1px solid ${p.background_style === "light" ? "#e5e5e8" : "rgba(255,255,255,0.1)"};background:${p.background_style === "light" ? "#fff" : "rgba(0,0,0,0.3)"};color:${text};margin-bottom:10px;font-size:14px}
    details{margin:8px 0;padding:14px 16px;border-radius:12px;background:${p.background_style === "light" ? "#fff" : "rgba(255,255,255,0.04)"};border:1px solid ${p.background_style === "light" ? "#e5e5e8" : "rgba(255,255,255,0.08)"};cursor:pointer}
    summary{font-weight:600}
    details p{margin-top:8px;color:${muted};font-size:14px}
  </style></head><body><div class="wrap">
    <div class="nav"><div class="logo">${p.logo_url ? `<img src="${p.logo_url}" />` : ""}<span>${escapeHtml(agent?.name || "AI Agent")}</span></div></div>
    <h1>${escapeHtml(p.title)}</h1>
    ${p.subtitle ? `<p class="sub">${escapeHtml(p.subtitle)}</p>` : ""}
    ${p.hero_text ? `<p class="hero-text">${escapeHtml(p.hero_text)}</p>` : ""}
    <button class="cta">🎙 ${escapeHtml(p.cta_label)}</button>
    <div class="features">${features}</div>
    ${p.allow_phone_callback ? `<div class="form"><h2 style="margin-bottom:16px">Or get a call from us</h2><input placeholder="Your name" />${p.collect_email ? `<input type="email" placeholder="Email" />` : ""}<input placeholder="Phone number" /><button class="cta" style="width:100%;justify-content:center;margin-top:8px">Call me back</button></div>` : ""}
    ${faqs ? `<h2 style="margin:40px 0 16px">FAQs</h2>${faqs}` : ""}
  </div></body></html>`;
}

function escapeHtml(s: string) { return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as any)[c]); }
