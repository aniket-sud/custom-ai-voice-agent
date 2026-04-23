import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mic, MicOff, Phone, Loader2, Volume2, X } from "lucide-react";

type Page = any;
type Agent = any;

export default function PublicAgentPage() {
  const { slug } = useParams();
  const [page, setPage] = useState<Page | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [callOpen, setCallOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("agent_pages").select("*").eq("slug", slug).eq("visibility", "public").maybeSingle();
      if (!data) { setLoading(false); return; }
      setPage(data);
      const { data: a } = await supabase.from("agents").select("name, language, first_message, voice").eq("id", data.agent_id).single();
      setAgent(a);
      // bump view count
      supabase.from("agent_pages").update({ view_count: (data.view_count || 0) + 1 }).eq("id", data.id);
      setLoading(false);
    })();
  }, [slug]);

  const submit = async () => {
    if (!form.phone) return toast.error("Phone is required");
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("page-callback", {
      body: { agent_page_id: page.id, ...form },
    });
    setSubmitting(false);
    if (error || data?.error) return toast.error(data?.error || "Failed");
    toast.success("Got it! We'll call you in a moment.");
    setFormOpen(false); setForm({ name: "", email: "", phone: "", message: "" });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!page || !agent) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground"><div className="text-center"><h1 className="text-3xl font-bold">Page not found</h1><p className="text-muted-foreground mt-2">This agent page is private or doesn't exist.</p></div></div>;

  const bg = page.background_style === "image" && page.cover_image_url ? `url(${page.cover_image_url}) center/cover, #0b0b14`
    : page.background_style === "light" ? "#f8fafc"
    : page.background_style === "dark" ? "#0b0b14"
    : `radial-gradient(ellipse 80% 60% at 50% 0%, ${page.primary_color}33, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, ${page.accent_color}22, transparent 60%), #0b0b14`;
  const isLight = page.background_style === "light";

  return (
    <div style={{ background: bg, minHeight: "100vh", color: isLight ? "#0b0b14" : "#f5f5f7" }} className="font-sans">
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        <nav className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-2 font-semibold">
            {page.logo_url && <img src={page.logo_url} alt="" className="h-8" />}
            <span>{agent.name}</span>
          </div>
          <a href="https://lovable.dev" target="_blank" rel="noreferrer" className="text-xs opacity-60 hover:opacity-100">Powered by VoiceAI</a>
        </nav>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6"
          style={{ background: `linear-gradient(135deg, ${page.primary_color}, ${page.accent_color})`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          {page.title}
        </h1>
        {page.subtitle && <p className="text-xl md:text-2xl mb-4 max-w-2xl" style={{ color: isLight ? "#5b5b66" : "#a8a8b3" }}>{page.subtitle}</p>}
        {page.hero_text && <p className="mb-8 max-w-2xl" style={{ color: isLight ? "#5b5b66" : "#a8a8b3" }}>{page.hero_text}</p>}

        <div className="flex flex-wrap gap-3">
          {page.allow_browser_call && (
            <button onClick={() => setCallOpen(true)} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-transform hover:scale-105 active:scale-95"
              style={{ background: `linear-gradient(135deg, ${page.primary_color}, ${page.accent_color})`, boxShadow: `0 16px 50px ${page.primary_color}55` }}>
              <Mic className="h-5 w-5" /> {page.cta_label}
            </button>
          )}
          {page.allow_phone_callback && (
            <button onClick={() => setFormOpen(true)} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold border-2 transition-smooth hover:bg-white/5"
              style={{ borderColor: isLight ? "#0b0b14" : "rgba(255,255,255,0.2)" }}>
              <Phone className="h-5 w-5" /> Get a call
            </button>
          )}
        </div>

        {page.features?.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-20">
            {page.features.map((f: any, i: number) => (
              <div key={i} className="rounded-2xl p-6 backdrop-blur"
                style={{ background: isLight ? "#ffffff" : "rgba(255,255,255,0.04)", border: `1px solid ${isLight ? "#e5e5e8" : "rgba(255,255,255,0.08)"}` }}>
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm" style={{ color: isLight ? "#5b5b66" : "#a8a8b3" }}>{f.text}</p>
              </div>
            ))}
          </div>
        )}

        {page.faqs?.length > 0 && (
          <div className="mt-20 max-w-2xl">
            <h2 className="text-2xl font-bold mb-4">FAQs</h2>
            <div className="space-y-2">
              {page.faqs.map((f: any, i: number) => (
                <details key={i} className="rounded-xl p-4 cursor-pointer"
                  style={{ background: isLight ? "#fff" : "rgba(255,255,255,0.04)", border: `1px solid ${isLight ? "#e5e5e8" : "rgba(255,255,255,0.08)"}` }}>
                  <summary className="font-semibold">{f.q}</summary>
                  <p className="mt-2 text-sm" style={{ color: isLight ? "#5b5b66" : "#a8a8b3" }}>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Browser voice chat modal */}
      {callOpen && <BrowserCallModal page={page} agent={agent} onClose={() => setCallOpen(false)} />}

      {/* Callback form */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur z-50 flex items-center justify-center p-4" onClick={() => setFormOpen(false)}>
          <div className="bg-card text-card-foreground rounded-2xl p-6 max-w-md w-full border border-border/60 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div><h2 className="text-xl font-bold">Get a call</h2><p className="text-sm text-muted-foreground">We'll call you within seconds.</p></div>
              <button onClick={() => setFormOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <input className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/60 text-sm" placeholder="Your name (optional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {page.collect_email && <input className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/60 text-sm" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
              <input className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/60 text-sm font-mono" placeholder="+91…" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <textarea rows={3} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/60 text-sm" placeholder="Anything we should know?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              <button onClick={submit} disabled={submitting} className="w-full py-3 rounded-lg font-semibold text-white"
                style={{ background: `linear-gradient(135deg, ${page.primary_color}, ${page.accent_color})` }}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Call me now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BrowserCallModal({ page, agent, onClose }: { page: any; agent: any; onClose: () => void }) {
  const [active, setActive] = useState(false);
  const [transcript, setTranscript] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: agent.first_message || "Hello!" },
  ]);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    // play first message
    speak(agent.first_message || "Hello!", agent.language);
    return () => { window.speechSynthesis?.cancel(); recRef.current?.stop(); };
  }, []);

  const speak = (text: string, lang: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = lang || "en-IN"; u.rate = 1; window.speechSynthesis.speak(u);
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processTurn(blob);
      };
      rec.start(); recRef.current = rec; setActive(true);
    } catch (e) { toast.error("Mic permission denied"); }
  };
  const stopRec = () => { recRef.current?.stop(); setActive(false); };

  const processTurn = async (blob: Blob) => {
    setThinking(true);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((res) => { reader.onloadend = () => res(reader.result as string); reader.readAsDataURL(blob); });
      const base64 = dataUrl.split(",")[1];
      const stt = await supabase.functions.invoke("voice-stt", { body: { audio_base64: base64, language: agent.language } });
      const userText = stt.data?.text || "";
      if (!userText) { setThinking(false); return; }
      const newT = [...transcript, { role: "user", content: userText }];
      setTranscript(newT);
      const chat = await supabase.functions.invoke("agent-chat", {
        body: { agent_id: page.agent_id, messages: newT, public: true },
      });
      const reply = chat.data?.reply || "Sorry, I can't answer.";
      setTranscript((t) => [...t, { role: "assistant", content: reply }]);
      speak(reply, agent.language);
    } catch (e) { toast.error("Turn failed"); }
    setThinking(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card text-card-foreground rounded-3xl p-8 max-w-lg w-full border border-border/60 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${page.primary_color}, ${page.accent_color})` }}>
              <Volume2 className="h-6 w-6 text-white" />
            </div>
            <div><h2 className="font-bold">{agent.name}</h2><p className="text-xs text-muted-foreground">{active ? "Listening…" : thinking ? "Thinking…" : "Ready"}</p></div>
          </div>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>

        <div className="h-64 overflow-y-auto space-y-2 mb-6 pr-2">
          {transcript.map((m, i) => (
            <div key={i} className={`p-3 rounded-2xl text-sm max-w-[85%] ${m.role === "user" ? "bg-primary/20 ml-auto" : "bg-secondary/60"}`}>{m.content}</div>
          ))}
          {thinking && <div className="p-3 rounded-2xl bg-secondary/60 text-sm max-w-[85%] inline-flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> …</div>}
        </div>

        <div className="flex justify-center">
          <button onClick={active ? stopRec : startRec} disabled={thinking}
            className={`h-20 w-20 rounded-full flex items-center justify-center transition-all ${active ? "animate-pulse-ring" : ""}`}
            style={{ background: `linear-gradient(135deg, ${page.primary_color}, ${page.accent_color})`, boxShadow: `0 12px 40px ${page.primary_color}88` }}>
            {active ? <MicOff className="h-8 w-8 text-white" /> : <Mic className="h-8 w-8 text-white" />}
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-3">{active ? "Tap to stop" : "Tap to talk"}</p>
      </div>
    </div>
  );
}
